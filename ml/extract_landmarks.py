"""
Extract MediaPipe hand landmarks from the Kaggle "ASL Alphabet" training folder.

    python -m ml.extract_landmarks --dataset raw/asl_alphabet_train --output ml/data/landmarks_v2.npz

Saved arrays (raw MediaPipe coordinates; normalisation happens later, in ml/features.py):
    X        (N, 63) float32   21 landmarks x (x, y, z)
    y        (N,)    int32     class index into `classes`
    classes  (C,)    str       sorted folder names
    img_id   (N,)    int32     numeric part of the file name (A123.jpg -> 123); Kaggle frames are
                               consecutive video frames, so neighbouring ids are near-duplicates
    stats    JSON str          per-class seen / kept counts

Difference from the original script: static_image_mode=True. The original used False, which makes
MediaPipe *track* from the previous image, so one image's detection could depend on the previous one.
Images in a folder are independent, so static mode is the correct setting.
"""
import argparse, json, os, re
from multiprocessing import Pool

import cv2
import numpy as np
import mediapipe as mp
from tqdm import tqdm

IMG_EXT = (".jpg", ".jpeg", ".png")
_num = re.compile(r"(\d+)")


def landmarks_from_image(image_bgr, hands):
    res = hands.process(cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB))
    if not res.multi_hand_landmarks:
        return None
    hand = res.multi_hand_landmarks[0]
    return [c for lm in hand.landmark for c in (lm.x, lm.y, lm.z)]


def process_class(args):
    class_idx, class_name, class_dir, min_conf = args
    hands = mp.solutions.hands.Hands(static_image_mode=True, max_num_hands=1,
                                     min_detection_confidence=min_conf)
    files = sorted(f for f in os.listdir(class_dir) if f.lower().endswith(IMG_EXT))
    X, ids = [], []
    for f in files:
        img = cv2.imread(os.path.join(class_dir, f))
        if img is None:
            continue
        vec = landmarks_from_image(img, hands)
        if vec is not None:
            m = _num.search(f)
            X.append(vec)
            ids.append(int(m.group(1)) if m else -1)
    hands.close()
    return class_idx, class_name, len(files), np.array(X, np.float32).reshape(-1, 63), np.array(ids, np.int32)


def main(dataset, output, min_conf, workers, limit):
    classes = sorted(d for d in os.listdir(dataset) if os.path.isdir(os.path.join(dataset, d)))
    print(f"{len(classes)} classes: {classes}")
    jobs = [(i, c, os.path.join(dataset, c), min_conf) for i, c in enumerate(classes)]
    if limit:  # quick smoke test: only the first N classes
        jobs = jobs[:limit]
    X_all, y_all, id_all, stats = [], [], [], {}
    with Pool(workers) as pool:
        for idx, name, seen, X, ids in tqdm(pool.imap_unordered(process_class, jobs), total=len(jobs)):
            X_all.append(X); id_all.append(ids); y_all.append(np.full(len(X), idx, np.int32))
            stats[name] = {"seen": seen, "kept": int(len(X))}
            print(f"  {name}: kept {len(X)}/{seen}", flush=True)
    X = np.concatenate(X_all); y = np.concatenate(y_all); img_id = np.concatenate(id_all)
    order = np.lexsort((img_id, y))                      # deterministic order: class, then image id
    X, y, img_id = X[order], y[order], img_id[order]
    os.makedirs(os.path.dirname(output) or ".", exist_ok=True)
    np.savez_compressed(output, X=X, y=y, classes=np.array(classes), img_id=img_id,
                        stats=json.dumps(stats))
    seen = sum(s["seen"] for s in stats.values())
    print(f"Saved {output}: {len(X)} of {seen} images kept ({len(X)/seen:.1%})")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--dataset", required=True)
    ap.add_argument("--output", default="ml/data/landmarks_v2.npz")
    ap.add_argument("--min_conf", type=float, default=0.20)   # same as the original extraction
    ap.add_argument("--workers", type=int, default=max(1, (os.cpu_count() or 2) - 1))
    ap.add_argument("--limit_classes", type=int, default=0, help="smoke test: first N classes only")
    a = ap.parse_args()
    main(a.dataset, a.output, a.min_conf, a.workers, a.limit_classes)
