"""Evaluate a trained model on any landmark .npz and write metrics.

    python -m ml.eval --model ml/runs/norm_block/model.keras --classes ml/runs/norm_block/classes.json \
        --data ml/data/webcam_test.npz --mode norm --out ml/results/webcam

The .npz needs X (N,63), y (N,) and classes (C,) (names). Labels are matched to the model's classes
by NAME, and rows whose class the model does not know are dropped (and counted).
"""
import argparse, json, os
import numpy as np

from ml.features import prepare


def align_labels(y, data_classes, model_classes):
    """Map labels from the data's class list onto the model's class list. Returns (y_new, keep_mask)."""
    upper = [m.upper() for m in model_classes]          # case-insensitive: 'a' in asl_dataset == 'A'
    lut = np.array([upper.index(c.upper()) if c.upper() in upper else -1 for c in data_classes])
    y_new = lut[y]
    return y_new, y_new >= 0


def evaluate(model, X, y, classes, out_dir=None, tag=""):
    from sklearn.metrics import classification_report, confusion_matrix
    probs = model.predict(X, verbose=0)
    pred = probs.argmax(1)
    acc = float((pred == y).mean())
    res = {"accuracy": acc, "n": int(len(y))}
    if out_dir:
        os.makedirs(out_dir, exist_ok=True)
        labels = list(range(len(classes)))
        rep = classification_report(y, pred, labels=labels, target_names=classes,
                                    output_dict=True, zero_division=0)
        cm = confusion_matrix(y, pred, labels=labels)
        res["macro_f1"] = float(rep["macro avg"]["f1-score"])
        json.dump(rep, open(os.path.join(out_dir, f"classification_report{tag}.json"), "w"), indent=2)
        np.save(os.path.join(out_dir, f"confusion_matrix{tag}.npy"), cm)
        _plot_cm(cm, classes, os.path.join(out_dir, f"confusion_matrix{tag}.png"))
        json.dump(res, open(os.path.join(out_dir, f"metrics{tag}.json"), "w"), indent=2)
    return res


def _plot_cm(cm, classes, path):
    import matplotlib; matplotlib.use("Agg")
    import matplotlib.pyplot as plt, seaborn as sns
    plt.figure(figsize=(12, 10))
    sns.heatmap(cm, annot=True, fmt="d", cmap="Blues", xticklabels=classes, yticklabels=classes, cbar=False)
    plt.xlabel("Predicted"); plt.ylabel("Actual"); plt.title("Confusion matrix")
    plt.tight_layout(); plt.savefig(path, dpi=120); plt.close()


def main():
    import tensorflow as tf
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", required=True)
    ap.add_argument("--classes", required=True, help="model class names (json list)")
    ap.add_argument("--data", required=True)
    ap.add_argument("--mode", choices=["raw", "norm"], required=True)
    ap.add_argument("--out", default=None)
    a = ap.parse_args()
    model = tf.keras.models.load_model(a.model)
    model_classes = json.load(open(a.classes))
    d = np.load(a.data, allow_pickle=True)
    y, keep = align_labels(d["y"], [str(c) for c in d["classes"]], model_classes)
    print(f"dropped {int((~keep).sum())} rows with classes unknown to the model")
    res = evaluate(model, prepare(d["X"][keep], a.mode), y[keep], model_classes, a.out)
    print(res)


if __name__ == "__main__":
    main()
