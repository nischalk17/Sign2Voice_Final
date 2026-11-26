"""Results-at-a-glance figure for the README: baseline vs shipped model (mean +- std over 3 seeds).

    python -m ml.robustness.figure      # -> docs/results_at_a_glance.png
"""
import glob, json, re
from collections import defaultdict
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

RES = "ml/results/robustness"
BASE, SHIP = "#2a78d6", "#eb6834"                     # validated categorical slots 1 and 2
SURF, INK, INK2, GRID = "#fcfcfb", "#0b0b0b", "#52514e", "#e6e5e1"

runs = defaultdict(list)
for p in glob.glob(f"{RES}/*.json"):
    r = json.load(open(p)); m = re.match(r"rob_(\w+?)_s\d+$", r["run"])
    runs[m.group(1) if m else "base"].append(r)

ROWS = [  # (group heading, label, getter)
    ("Same dataset as training", "Kaggle test split (leakage-aware)", lambda r: r["clean"]["kaggle_block_test"]),
    ("Other people and cameras", "5 other signers", lambda r: r["clean"]["external_5signers"]),
    (None, "Own webcam, one light", lambda r: r["clean"]["webcam_onelight"]),
    (None, "Own webcam, three lights", lambda r: r["clean"]["webcam_threelights"]),
    ("Perturbed test data", "Adversarial attack (PGD, 1% of width)", lambda r: r["pgd_linf"]["0.01"]),
    (None, "Adversarial attack (PGD, 2% of width)", lambda r: r["pgd_linf"]["0.02"]),
    (None, "Hand rotated 45 degrees", lambda r: r["natural"]["rot_inplane_45"]),
]

fig, ax = plt.subplots(figsize=(9, 5.6), facecolor=SURF)
ax.set_facecolor(SURF)
h, gap, y = 0.34, 0.9, 0.0
ypos, ticks, labels, heads = [], [], [], []
for head, label, get in ROWS:
    if head:
        y += 0.55
        heads.append((y - 0.35, head))
    ypos.append(y); y += gap
for (head, label, get), y0 in zip(ROWS, ypos):
    for off, key, col in ((-h / 2 - 0.01, "base", BASE), (h / 2 + 0.01, "augadv", SHIP)):
        v = np.array([get(r) for r in runs[key]]) * 100
        ax.barh(y0 + off, v.mean(), height=h, color=col, edgecolor=SURF, linewidth=1.5, zorder=3)
        ax.errorbar(v.mean(), y0 + off, xerr=v.std(), color=INK2, capsize=2, lw=1, zorder=4)
        ax.text(v.mean() + v.std() + 1.2, y0 + off, f"{v.mean():.0f}%", va="center", fontsize=9, color=INK)
    ticks.append(y0); labels.append(label)
for yh, t in heads:
    ax.text(-1, yh, t.upper(), fontsize=8.5, color=INK2, fontweight="bold", va="center", ha="right", transform=ax.transData)
ax.set_yticks(ticks); ax.set_yticklabels(labels, fontsize=10, color=INK)
ax.set_xlim(0, 108); ax.set_xticks([0, 25, 50, 75, 100]); ax.set_xticklabels([f"{t}%" for t in (0, 25, 50, 75, 100)], color=INK2, fontsize=9)
ax.invert_yaxis()
ax.grid(axis="x", color=GRID, lw=0.8, zorder=0)
for s in ("top", "right", "left"):
    ax.spines[s].set_visible(False)
ax.spines["bottom"].set_color(GRID); ax.tick_params(axis="y", length=0)
fig.text(0.02, 0.965, "Accuracy is high on the training dataset, low on new people and cameras", fontsize=12.5, color=INK, fontweight="bold", va="top")
fig.text(0.02, 0.915, "Mean over 3 seeds; whiskers = 1 std. Webcam sets come from one person.", fontsize=9, color=INK2, va="top")
ax.legend(handles=[plt.Rectangle((0, 0), 1, 1, color=BASE), plt.Rectangle((0, 0), 1, 1, color=SHIP)],
          labels=["Baseline CNN", "Shipped model (augmentation + adversarial training)"],
          loc="lower left", bbox_to_anchor=(-0.52, 1.0), ncol=2, frameon=False, fontsize=9, labelcolor=INK)
fig.tight_layout(rect=(0, 0, 1, 0.9))
fig.savefig("docs/results_at_a_glance.png", dpi=150, facecolor=SURF)
print("saved docs/results_at_a_glance.png")
