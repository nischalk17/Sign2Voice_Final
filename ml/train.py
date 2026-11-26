"""Train the landmark CNN.

    python -m ml.train --data ml/data/landmarks_v2.npz --mode norm --split block --name norm_block

Everything is written to ml/runs/<name>/ (model, classes, history, split indices, metrics, plots).
Architecture, optimiser and hyper-parameters are the same as the original model
(Conv1D64 -> Conv1D128 -> Dense256 -> Dropout0.3, Adam, batch 128, 20 epochs).

--split random : stratified random 70/30 (how the ORIGINAL 99.15% was measured; leaky)
--split block  : per class, test = whole contiguous runs of image ids, with a gap of `--gap` images
                 removed from train around each test run, so near-duplicate neighbouring frames
                 cannot sit on both sides of the split.
"""
import argparse, json, os, random
import numpy as np

from ml.features import prepare


def set_seeds(seed):
    import tensorflow as tf
    random.seed(seed); np.random.seed(seed); tf.keras.utils.set_random_seed(seed)


def build_model(num_classes):
    from tensorflow.keras import layers, models
    m = models.Sequential([
        layers.Input(shape=(63,)),
        layers.Reshape((21, 3)),
        layers.Conv1D(64, 3, activation="relu"),
        layers.Conv1D(128, 3, activation="relu"),
        layers.Flatten(),
        layers.Dense(256, activation="relu"),
        layers.Dropout(0.3),
        layers.Dense(num_classes, activation="softmax"),
    ])
    m.compile(optimizer="adam", loss="sparse_categorical_crossentropy", metrics=["accuracy"])
    return m


def drop_rare_classes(X, y, classes, img_id, min_samples):
    keep = [i for i, n in enumerate(np.bincount(y, minlength=len(classes))) if n >= min_samples]
    remap = {old: new for new, old in enumerate(keep)}
    m = np.isin(y, keep)
    return (X[m], np.array([remap[v] for v in y[m]], np.int32), [classes[i] for i in keep],
            None if img_id is None else img_id[m])


def random_split(y, seed, test_size=0.3):
    from sklearn.model_selection import train_test_split
    idx = np.arange(len(y))
    tr, te = train_test_split(idx, test_size=test_size, stratify=y, random_state=seed)
    return np.sort(tr), np.sort(te)


def block_split(y, img_id, seed, n_blocks=10, test_blocks=3, gap=25):
    rng = np.random.default_rng(seed)
    train, test = [], []
    for c in np.unique(y):
        idx = np.where(y == c)[0]
        idx = idx[np.argsort(img_id[idx], kind="stable")]       # temporal order within the class
        n = len(idx)
        edges = np.linspace(0, n, n_blocks + 1).astype(int)
        chosen = set(rng.choice(n_blocks, test_blocks, replace=False).tolist())
        is_test = np.zeros(n, bool)
        for b in chosen:
            is_test[edges[b]:edges[b + 1]] = True
        near_test = is_test.copy()                               # widen test runs by `gap` each side
        for s in range(1, gap + 1):
            near_test[:-s] |= is_test[s:]
            near_test[s:] |= is_test[:-s]
        test.append(idx[is_test]); train.append(idx[~near_test])
    return np.sort(np.concatenate(train)), np.sort(np.concatenate(test))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", required=True)
    ap.add_argument("--mode", choices=["raw", "norm"], default="norm")
    ap.add_argument("--split", choices=["random", "block"], default="block")
    ap.add_argument("--name", required=True)
    ap.add_argument("--epochs", type=int, default=20)
    ap.add_argument("--batch", type=int, default=128)
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--min_samples", type=int, default=100)
    ap.add_argument("--gap", type=int, default=25)
    ap.add_argument("--runs_dir", default="ml/runs")
    a = ap.parse_args()

    set_seeds(a.seed)
    d = np.load(a.data, allow_pickle=True)
    X, y, classes = d["X"], d["y"], [str(c) for c in d["classes"]]
    img_id = d["img_id"] if "img_id" in d.files else None
    if a.split == "block" and img_id is None:
        raise SystemExit("block split needs img_id in the .npz (re-run ml.extract_landmarks)")
    X, y, classes, img_id = drop_rare_classes(X, y, classes, img_id, a.min_samples)
    print(f"{len(classes)} classes, {len(X)} samples")

    tr, te = random_split(y, a.seed) if a.split == "random" else block_split(y, img_id, a.seed, gap=a.gap)
    print(f"split={a.split}: train {len(tr)} | test {len(te)} | dropped-by-gap {len(y) - len(tr) - len(te)}")
    assert not set(tr) & set(te)

    Xf = prepare(X, a.mode)
    model = build_model(len(classes))
    # Keras' validation_split takes the LAST 10% of the arrays without shuffling, and the data is
    # ordered by class, so the training indices must be shuffled (seeded) before fitting.
    tr_fit = np.random.default_rng(a.seed).permutation(tr)
    hist = model.fit(Xf[tr_fit], y[tr_fit], epochs=a.epochs, batch_size=a.batch, validation_split=0.1, verbose=2)

    out = os.path.join(a.runs_dir, a.name)
    os.makedirs(out, exist_ok=True)
    from ml.eval import evaluate
    res = evaluate(model, Xf[te], y[te], classes, out)
    res.update(vars(a)); res.update(n_train=int(len(tr)), n_test=int(len(te)), classes=len(classes),
                                    final_train_acc=float(hist.history["accuracy"][-1]),
                                    final_val_acc=float(hist.history["val_accuracy"][-1]))
    json.dump(res, open(os.path.join(out, "metrics.json"), "w"), indent=2)
    json.dump(hist.history, open(os.path.join(out, "history.json"), "w"))
    json.dump(classes, open(os.path.join(out, "classes.json"), "w"))
    np.savez(os.path.join(out, "split.npz"), train=tr, test=te)
    model.save(os.path.join(out, "model.keras"))
    print(f"TEST accuracy ({a.split} split, {a.mode}): {res['accuracy']:.4f}  -> {out}")


if __name__ == "__main__":
    main()
