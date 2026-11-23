"""Natural perturbations of raw MediaPipe landmark vectors (N, 63) and a differentiable TF augmenter.

All geometry is applied about the wrist (landmark 0). x and y are image-normalised coordinates, so
rotations here are approximate (they ignore the image aspect ratio); this is stated in the write-up.
"""
import numpy as np

D2R = np.pi / 180.0


def _rot(rx, ry, rz):
    cx, sx, cy, sy, cz, sz = np.cos(rx), np.sin(rx), np.cos(ry), np.sin(ry), np.cos(rz), np.sin(rz)
    Rx = np.array([[1, 0, 0], [0, cx, -sx], [0, sx, cx]])
    Ry = np.array([[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]])
    Rz = np.array([[cz, -sz, 0], [sz, cz, 0], [0, 0, 1]])
    return Rz @ Ry @ Rx


def _about_wrist(X, fn):
    P = np.asarray(X, np.float32).reshape(-1, 21, 3)
    w = P[:, :1, :]
    return (fn(P - w) + w).reshape(-1, 63).astype(np.float32)


def rotate(X, deg_z=0.0, deg_x=0.0, deg_y=0.0):
    """deg_z = in-plane (roll) rotation; deg_x / deg_y = out-of-plane tilt using MediaPipe's z."""
    R = _rot(deg_x * D2R, deg_y * D2R, deg_z * D2R).astype(np.float32)
    return _about_wrist(X, lambda Q: Q @ R.T)


def scale(X, s):
    return _about_wrist(X, lambda Q: Q * s)


def translate(X, dx=0.0, dy=0.0):
    P = np.asarray(X, np.float32).reshape(-1, 21, 3).copy()
    P[:, :, 0] += dx; P[:, :, 1] += dy
    return P.reshape(-1, 63)


def jitter(X, sigma, seed=0):
    rng = np.random.default_rng(seed)
    return (X + rng.normal(0, sigma, X.shape)).astype(np.float32)


def drop_landmarks(X, k=3, seed=0):
    """Simulate occlusion / detector failure: k random non-wrist landmarks collapse onto the hand centroid."""
    rng = np.random.default_rng(seed)
    P = np.asarray(X, np.float32).reshape(-1, 21, 3).copy()
    cen = P.mean(axis=1)
    for i in range(len(P)):
        P[i, rng.choice(np.arange(1, 21), k, replace=False)] = cen[i]
    return P.reshape(-1, 63)


# name -> function(X) ; each entry is evaluated and, for +/- pairs, averaged by the caller
NATURAL = {
    "jitter_0.005": lambda X: jitter(X, 0.005),
    "jitter_0.01": lambda X: jitter(X, 0.01),
    "jitter_0.02": lambda X: jitter(X, 0.02),
    "rot_inplane_10": [lambda X: rotate(X, deg_z=10), lambda X: rotate(X, deg_z=-10)],
    "rot_inplane_20": [lambda X: rotate(X, deg_z=20), lambda X: rotate(X, deg_z=-20)],
    "rot_inplane_30": [lambda X: rotate(X, deg_z=30), lambda X: rotate(X, deg_z=-30)],
    "rot_inplane_45": [lambda X: rotate(X, deg_z=45), lambda X: rotate(X, deg_z=-45)],
    "tilt_10": [lambda X: rotate(X, deg_x=10), lambda X: rotate(X, deg_x=-10),
                lambda X: rotate(X, deg_y=10), lambda X: rotate(X, deg_y=-10)],
    "tilt_20": [lambda X: rotate(X, deg_x=20), lambda X: rotate(X, deg_x=-20),
                lambda X: rotate(X, deg_y=20), lambda X: rotate(X, deg_y=-20)],
    "scale_0.8": lambda X: scale(X, 0.8),
    "scale_1.25": lambda X: scale(X, 1.25),
    "shift_0.1": [lambda X: translate(X, 0.1, 0), lambda X: translate(X, -0.1, 0),
                  lambda X: translate(X, 0, 0.1), lambda X: translate(X, 0, -0.1)],
    "drop_3_landmarks": lambda X: drop_landmarks(X, 3),
}


def augment_tf(X, rot_z=30.0, tilt=20.0, scale_rng=0.15, shift=0.1, sigma=0.005):
    """Random roll/tilt/scale/shift/jitter about the wrist, applied per sample inside a tf.function."""
    import tensorflow as tf
    B = tf.shape(X)[0]
    P = tf.reshape(X, (B, 21, 3))
    w = P[:, :1, :]
    Q = P - w
    d2r = np.float32(D2R)
    az = tf.random.uniform((B,), -rot_z, rot_z) * d2r
    ax = tf.random.uniform((B,), -tilt, tilt) * d2r
    ay = tf.random.uniform((B,), -tilt, tilt) * d2r
    o, z = tf.ones_like(az), tf.zeros_like(az)

    def mat(rows):
        return tf.stack([tf.stack(r, -1) for r in rows], -2)

    Rx = mat([[o, z, z], [z, tf.cos(ax), -tf.sin(ax)], [z, tf.sin(ax), tf.cos(ax)]])
    Ry = mat([[tf.cos(ay), z, tf.sin(ay)], [z, o, z], [-tf.sin(ay), z, tf.cos(ay)]])
    Rz = mat([[tf.cos(az), -tf.sin(az), z], [tf.sin(az), tf.cos(az), z], [z, z, o]])
    R = Rz @ Ry @ Rx
    Q = tf.einsum("bij,bkj->bki", R, Q)
    Q = Q * (1.0 + tf.random.uniform((B, 1, 1), -scale_rng, scale_rng))
    off = tf.random.uniform((B, 1, 3), -shift, shift) * tf.constant([1.0, 1.0, 0.0])
    P = Q + w + off
    P = P + tf.random.normal(tf.shape(P), 0.0, sigma)
    return tf.reshape(P, (B, 63))
