"""Landmark feature preparation shared by training, evaluation, attacks and the live apps.

Input is always the raw MediaPipe vector (21 landmarks x (x, y, z), x/y in image-normalised
coordinates). Two modes:
    raw   - unchanged (what the original model used)
    norm  - translate so the wrist (landmark 0) is the origin, then divide by the largest
            landmark distance from the wrist. Removes where the hand is in the frame and how
            large it appears; keeps shape and orientation.
"""
import numpy as np

MODES = ("raw", "norm")
EPS = 1e-6


def normalize_np(X):
    P = np.asarray(X, np.float32).reshape(-1, 21, 3)
    P = P - P[:, :1, :]
    scale = np.linalg.norm(P, axis=2).max(axis=1, keepdims=True)[:, :, None]
    return (P / (scale + EPS)).reshape(-1, 63).astype(np.float32)


def normalize_tf(X):
    """Differentiable twin of normalize_np (used by gradient attacks)."""
    import tensorflow as tf
    P = tf.reshape(X, (-1, 21, 3))
    P = P - P[:, :1, :]
    scale = tf.reduce_max(tf.norm(P, axis=2), axis=1)[:, None, None]
    return tf.reshape(P / (scale + EPS), (-1, 63))


def prepare(X, mode):
    if mode == "raw":
        return np.asarray(X, np.float32)
    if mode == "norm":
        return normalize_np(X)
    raise ValueError(f"mode must be one of {MODES}")
