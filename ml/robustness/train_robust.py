"""Train the same CNN with augmentation and/or PGD adversarial training (raw landmarks, block split).

    python -m ml.robustness.train_robust --variant aug    --seed 42
    python -m ml.robustness.train_robust --variant adv    --seed 42 --eps 0.01
    python -m ml.robustness.train_robust --variant augadv --seed 42

Variants:  aug    = random roll/tilt/scale/shift/jitter about the wrist (ml.robustness.perturb.augment_tf)
           adv    = PGD-L_inf adversarial training (random start, --adv_steps steps, budget --eps)
           augadv = augmentation first, then PGD on the augmented batch
Architecture, optimiser, batch size, epochs and the block split are identical to ml.train (the baseline),
so differences are caused only by the training procedure. No early stopping / model selection on test data.
"""
import argparse, json, os
import numpy as np
import tensorflow as tf

from ml.train import build_model, block_split, drop_rare_classes, set_seeds
from ml.eval import evaluate
from ml.robustness.perturb import augment_tf
from ml.robustness.attacks import pgd_linf


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default="ml/data/landmarks_v2.npz")
    ap.add_argument("--variant", choices=["aug", "adv", "augadv"], required=True)
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--eps", type=float, default=0.01)
    ap.add_argument("--adv_steps", type=int, default=5)
    ap.add_argument("--epochs", type=int, default=20)
    ap.add_argument("--batch", type=int, default=128)
    ap.add_argument("--gap", type=int, default=25)
    ap.add_argument("--runs_dir", default="ml/runs")
    a = ap.parse_args()
    use_aug, use_adv = a.variant in ("aug", "augadv"), a.variant in ("adv", "augadv")

    set_seeds(a.seed)
    d = np.load(a.data, allow_pickle=True)
    X, y, classes, img_id = drop_rare_classes(d["X"], d["y"], [str(c) for c in d["classes"]], d["img_id"], 100)
    tr, te = block_split(y, img_id, a.seed, gap=a.gap)
    Xtr, ytr = X[tr].astype(np.float32), y[tr].astype(np.int32)

    model = build_model(len(classes))
    opt = tf.keras.optimizers.Adam()
    loss_fn = tf.keras.losses.SparseCategoricalCrossentropy()

    @tf.function(reduce_retracing=True)
    def step(xb, yb):
        if use_aug:
            xb = augment_tf(xb)
        if use_adv:
            xb = tf.stop_gradient(pgd_linf(model, xb, yb, a.eps, steps=a.adv_steps))
        with tf.GradientTape() as t:
            loss = loss_fn(yb, model(xb, training=True))
        opt.apply_gradients(zip(t.gradient(loss, model.trainable_variables), model.trainable_variables))
        return loss

    rng = np.random.default_rng(a.seed)
    hist = []
    for ep in range(a.epochs):
        perm = rng.permutation(len(Xtr)); losses = []
        for i in range(0, len(perm), a.batch):
            b = perm[i:i + a.batch]
            losses.append(float(step(tf.constant(Xtr[b]), tf.constant(ytr[b]))))
        hist.append(float(np.mean(losses)))
        print(f"epoch {ep + 1}/{a.epochs} loss {hist[-1]:.4f}", flush=True)

    name = f"rob_{a.variant}_s{a.seed}"
    out = os.path.join(a.runs_dir, name)
    os.makedirs(out, exist_ok=True)
    res = evaluate(model, X[te].astype(np.float32), y[te], classes, out)
    res.update(variant=a.variant, seed=a.seed, eps=a.eps, adv_steps=a.adv_steps, split="block",
               mode=f"raw+{a.variant}", n_train=int(len(tr)), n_test=int(len(te)), classes=len(classes))
    json.dump(res, open(os.path.join(out, "metrics.json"), "w"), indent=2)
    json.dump(hist, open(os.path.join(out, "history.json"), "w"))
    json.dump(classes, open(os.path.join(out, "classes.json"), "w"))
    np.savez(os.path.join(out, "split.npz"), train=tr, test=te)
    model.save(os.path.join(out, "model.keras"))
    print(f"TEST accuracy (block split, raw+{a.variant}): {res['accuracy']:.4f} -> {out}")


if __name__ == "__main__":
    main()
