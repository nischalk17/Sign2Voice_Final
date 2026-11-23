"""White-box FGSM / PGD attacks on the 63-d landmark input of the Keras classifier.

Threat model (state this in every result): the adversary can perturb the landmark vector that the
CNN receives (e.g. a corrupted/compromised hand-landmark stage) with an L_inf or L_2 budget measured in
MediaPipe's normalised image coordinates (1.0 = full image width; eps=0.01 is 1% of the image).
It is NOT a physical or pixel-space attack on the camera image, and MediaPipe itself is not attacked.
Models use raw coordinates, so the budget is applied directly to the raw input.
"""
import numpy as np
import tensorflow as tf

_loss = tf.keras.losses.SparseCategoricalCrossentropy(reduction="none")


@tf.function(reduce_retracing=True)
def _grad(model, x, y):
    with tf.GradientTape() as t:
        t.watch(x)
        loss = tf.reduce_sum(_loss(y, model(x, training=False)))
    return t.gradient(loss, x)


def fgsm(model, x, y, eps):
    x = tf.convert_to_tensor(x, tf.float32); y = tf.convert_to_tensor(y)
    return x + eps * tf.sign(_grad(model, x, y))


def pgd_linf(model, x, y, eps, steps=20, alpha=None, random_start=True):
    x0 = tf.convert_to_tensor(x, tf.float32); y = tf.convert_to_tensor(y)
    alpha = alpha or 2.5 * eps / steps
    xa = x0 + tf.random.uniform(tf.shape(x0), -eps, eps) if random_start else x0
    for _ in range(steps):
        xa = xa + alpha * tf.sign(_grad(model, xa, y))
        xa = tf.clip_by_value(xa, x0 - eps, x0 + eps)
    return xa


def pgd_l2(model, x, y, eps, steps=20, alpha=None):
    x0 = tf.convert_to_tensor(x, tf.float32); y = tf.convert_to_tensor(y)
    alpha = alpha or 2.5 * eps / steps
    xa = x0
    for _ in range(steps):
        g = _grad(model, xa, y)
        g = g / (tf.norm(g, axis=1, keepdims=True) + 1e-12)
        xa = xa + alpha * g
        d = xa - x0
        n = tf.norm(d, axis=1, keepdims=True)
        xa = x0 + d * tf.minimum(1.0, eps / (n + 1e-12))
    return xa


def accuracy_under_attack(model, X, y, attack, batch=4096, **kw):
    correct = 0
    for i in range(0, len(X), batch):
        xb, yb = X[i:i + batch], y[i:i + batch]
        xa = attack(model, xb, yb, **kw) if attack is not None else tf.convert_to_tensor(xb)
        correct += int((model.predict(xa, verbose=0).argmax(1) == yb).sum())
    return correct / len(X)
