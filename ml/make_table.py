"""Collect ml/runs/*/metrics.json into ml/results/eval_table.md (mean +- std over seeds)."""
import glob, json, os
from collections import defaultdict
import numpy as np

rows = defaultdict(list)
for p in sorted(glob.glob("ml/runs/*/metrics.json")):
    m = json.load(open(p))
    if "mode" not in m:
        continue
    rows[(m["split"], m["mode"])].append(m)

lines = ["| split | landmarks | seeds | test accuracy | macro-F1 | n_train | n_test |", "|---|---|---|---|---|---|---|"]
for (split, mode), ms in sorted(rows.items()):
    acc = np.array([m["accuracy"] for m in ms]) * 100
    f1 = np.array([m["macro_f1"] for m in ms]) * 100
    lines.append(f"| {split} | {mode} | {len(ms)} | {acc.mean():.2f} ± {acc.std():.2f} % | "
                 f"{f1.mean():.2f} ± {f1.std():.2f} % | {ms[0]['n_train']} | {ms[0]['n_test']} |")
os.makedirs("ml/results", exist_ok=True)
open("ml/results/eval_table.md", "w", encoding="utf-8").write("\n".join(lines) + "\n")
print("\n".join(lines))

# --- external / held-out sets (single model per row; see ml/eval.py) -------------------------
ext = sorted(glob.glob("ml/results/external_*/metrics.json") + glob.glob("ml/results/webcam_*/metrics.json"))
if ext:
    out = ["", "| held-out set | landmarks | n | accuracy | macro-F1 |", "|---|---|---|---|---|"]
    for p in ext:
        name = os.path.basename(os.path.dirname(p)); m = json.load(open(p))
        out.append(f"| {name} | {name.split('_')[-1]} | {m['n']} | {m['accuracy']*100:.2f} % | {m.get('macro_f1',0)*100:.2f} % |")
    open("ml/results/eval_table.md", "a", encoding="utf-8").write("\n".join(out) + "\n")
    print("\n".join(out))
