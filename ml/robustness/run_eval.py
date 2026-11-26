"""Evaluate trained runs under natural perturbations and white-box attacks; cache one JSON per run.

    python -m ml.robustness.run_eval            # every run in ml/runs that is a baseline or rob_* run

Outputs ml/results/robustness/<run>.json with:
    clean    accuracy on each held-out set (kaggle block-test, 5-signer external, two webcam sessions)
    natural  accuracy on the kaggle block-test after each landmark perturbation (ml.robustness.perturb)
    fgsm / pgd_linf / pgd_l2   accuracy on the kaggle block-test under attack, keyed by eps
"""
import argparse, glob, json, os
import numpy as np
import tensorflow as tf

from ml.eval import align_labels
from ml.train import drop_rare_classes
from ml.robustness import attacks
from ml.robustness.perturb import NATURAL

BASELINES = ["raw_block", "raw_block_seed1", "raw_block_seed2"]
LINF = [0.0025, 0.005, 0.01, 0.02, 0.05]
L2 = [0.02, 0.05, 0.1, 0.2]
ATTACK_N = 5000
EXTRA = {"external_5signers": "ml/data/external_asl_dataset.npz",
         "webcam_onelight": "ml/data/webcam_me_onelight.npz",
         "webcam_threelights": "ml/data/webcam_me_threelights.npz"}


def acc(model, X, y):
    return float((model.predict(X, verbose=0).argmax(1) == y).mean())


def load_sets(run_dir, classes, data_path):
    d = np.load(data_path, allow_pickle=True)
    X, y, cl, _ = drop_rare_classes(d["X"], d["y"], [str(c) for c in d["classes"]], d["img_id"], 100)
    te = np.load(os.path.join(run_dir, "split.npz"))["test"]
    sets = {"kaggle_block_test": (X[te].astype(np.float32), y[te].astype(np.int32))}
    for name, path in EXTRA.items():
        if os.path.exists(path):
            e = np.load(path, allow_pickle=True)
            ye, keep = align_labels(e["y"], [str(c) for c in e["classes"]], classes)
            sets[name] = (e["X"][keep].astype(np.float32), ye[keep].astype(np.int32))
    return sets


def eval_run(name, runs_dir, out_dir, data_path, force):
    out = os.path.join(out_dir, f"{name}.json")
    if os.path.exists(out) and not force:
        return
    run = os.path.join(runs_dir, name)
    model = tf.keras.models.load_model(os.path.join(run, "model.keras"))
    classes = json.load(open(os.path.join(run, "classes.json")))
    sets = load_sets(run, classes, data_path)
    Xt, yt = sets["kaggle_block_test"]
    tf.random.set_seed(0)
    res = {"run": name, "clean": {k: acc(model, *v) for k, v in sets.items()}, "natural": {}, "fgsm": {},
           "pgd_linf": {}, "pgd_l2": {}}
    for k, fns in NATURAL.items():
        fns = fns if isinstance(fns, list) else [fns]
        res["natural"][k] = float(np.mean([acc(model, f(Xt), yt) for f in fns]))
    # attacks run on a fixed random subset (same indices for every model with the same test size)
    sub = np.random.default_rng(0).permutation(len(Xt))[:ATTACK_N]
    Xa, ya = Xt[sub], yt[sub]
    res["attack_n"] = int(len(sub))
    res["clean_attack_subset"] = acc(model, Xa, ya)
    for e in LINF:
        res["fgsm"][str(e)] = attacks.accuracy_under_attack(model, Xa, ya, attacks.fgsm, eps=e)
        res["pgd_linf"][str(e)] = attacks.accuracy_under_attack(model, Xa, ya, attacks.pgd_linf, eps=e)
    for e in L2:
        res["pgd_l2"][str(e)] = attacks.accuracy_under_attack(model, Xa, ya, attacks.pgd_l2, eps=e)
    os.makedirs(out_dir, exist_ok=True)
    json.dump(res, open(out, "w"), indent=2)
    print(name, {k: round(v, 3) for k, v in res["clean"].items()}, "pgd@0.01", round(res["pgd_linf"]["0.01"], 3), flush=True)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--runs_dir", default="ml/runs")
    ap.add_argument("--out_dir", default="ml/results/robustness")
    ap.add_argument("--data", default="ml/data/landmarks_v2.npz")
    ap.add_argument("--force", action="store_true")
    a = ap.parse_args()
    names = [n for n in BASELINES if os.path.isdir(os.path.join(a.runs_dir, n))]
    names += sorted(os.path.basename(p) for p in glob.glob(os.path.join(a.runs_dir, "rob_*")) if os.path.isdir(p))
    for n in names:
        eval_run(n, a.runs_dir, a.out_dir, a.data, a.force)
