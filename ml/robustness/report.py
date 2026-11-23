"""Aggregate ml/results/robustness/*.json into summary.md and plots (mean +- std over seeds).

    python -m ml.robustness.report
"""
import glob, json, os, re
from collections import defaultdict
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

RES = "ml/results/robustness"
LABEL = {"base": "baseline", "aug": "augmentation", "adv": "PGD adversarial training", "augadv": "augmentation + PGD-AT"}


def group_of(run):
    m = re.match(r"rob_(\w+?)_s\d+$", run)
    return m.group(1) if m else "base"


def ms(vals):
    v = np.array(vals) * 100
    return f"{v.mean():.1f} ± {v.std():.1f}"


groups = defaultdict(list)
for p in sorted(glob.glob(f"{RES}/*.json")):
    r = json.load(open(p)); groups[group_of(r["run"])].append(r)
order = [g for g in ("base", "aug", "adv", "augadv") if g in groups]

L = ["# Robustness results", "",
     "Mean ± std (percentage points) over seeds. Models: same CNN, raw landmarks, block split.",
     "Threat model: white-box L_inf / L2 perturbations of the 63-d landmark input (units: fraction of image width); "
     "NOT a pixel-space attack; MediaPipe is not attacked. Attacks use a fixed 5,000-sample subset of the Kaggle block-test set "
     "(about ±0.6 points sampling error); PGD = 20 steps with random start.", ""]
L += ["## Clean accuracy on each held-out set", "", "| model | seeds | " + " | ".join(groups[order[0]][0]["clean"].keys()) + " |",
      "|---|---|" + "---|" * len(groups[order[0]][0]["clean"])]
for g in order:
    L.append(f"| {LABEL[g]} | {len(groups[g])} | " + " | ".join(ms([r["clean"][k] for r in groups[g]]) for k in groups[g][0]["clean"]) + " |")

for key, title in (("pgd_linf", "PGD L_inf accuracy by eps"), ("fgsm", "FGSM accuracy by eps"), ("pgd_l2", "PGD L2 accuracy by eps")):
    ks = list(groups[order[0]][0][key].keys())
    L += ["", f"## {title}", "", "| model | " + " | ".join(f"eps={k}" for k in ks) + " |", "|---|" + "---|" * len(ks)]
    for g in order:
        L.append(f"| {LABEL[g]} | " + " | ".join(ms([r[key][k] for r in groups[g]]) for k in ks) + " |")

ks = list(groups[order[0]][0]["natural"].keys())
L += ["", "## Natural perturbations (Kaggle block-test, full set)", "", "| perturbation | " + " | ".join(LABEL[g] for g in order) + " |", "|---|" + "---|" * len(order)]
for k in ks:
    L.append(f"| {k} | " + " | ".join(ms([r["natural"][k] for r in groups[g]]) for g in order) + " |")
open(f"{RES}/summary.md", "w", encoding="utf-8").write("\n".join(L) + "\n")


def curve(key, fname, xlabel):
    plt.figure(figsize=(6, 4))
    for g in order:
        xs = [0.0] + [float(k) for k in groups[g][0][key]]
        ys = np.array([[r["clean_attack_subset"]] + [r[key][k] for k in r[key]] for r in groups[g]]) * 100
        plt.errorbar(xs, ys.mean(0), yerr=ys.std(0), marker="o", capsize=2, label=LABEL[g])
    plt.xlabel(xlabel); plt.ylabel("accuracy (%)"); plt.ylim(0, 100); plt.grid(alpha=.3); plt.legend(fontsize=8)
    plt.tight_layout(); plt.savefig(f"{RES}/{fname}", dpi=130); plt.close()


curve("pgd_linf", "pgd_linf.png", "PGD L_inf budget eps (fraction of image width)")
curve("pgd_l2", "pgd_l2.png", "PGD L2 budget eps")

plt.figure(figsize=(6, 4))
for g in order:
    angs = [0, 10, 20, 30, 45]
    ys = np.array([[r["clean_attack_subset"] if False else r["clean"]["kaggle_block_test"]] +
                   [r["natural"][f"rot_inplane_{a}"] for a in angs[1:]] for r in groups[g]]) * 100
    plt.errorbar(angs, ys.mean(0), yerr=ys.std(0), marker="o", capsize=2, label=LABEL[g])
plt.xlabel("in-plane rotation (degrees)"); plt.ylabel("accuracy (%)"); plt.ylim(0, 100); plt.grid(alpha=.3); plt.legend(fontsize=8)
plt.tight_layout(); plt.savefig(f"{RES}/rotation.png", dpi=130); plt.close()
print(open(f"{RES}/summary.md", encoding="utf-8").read())
