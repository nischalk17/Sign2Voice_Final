# utils/extract_landmarks.py
"""
Extracts MediaPipe-Hand landmarks from every image in an ASL dataset folder
and stores them (X, y) together with the class list in a single .npz file.

Example run:
    python -m utils.extract_landmarks \
        --dataset data/raw/asl_alphabet_train/asl_alphabet_train \
        --output  data/landmarks_train.npz
"""

import os
import cv2
import numpy as np
import mediapipe as mp
from tqdm import tqdm

mp_hands = mp.solutions.hands


def extract_landmarks_from_image(image, hands_detector):
    """Return a flat 63-value landmark vector or None if no hand detected."""
    # OPTIONAL: uncomment if many images are upside-down
    # image = cv2.rotate(image, cv2.ROTATE_180)

    # OPTIONAL: uncomment if mirroring helps detection
    # image = cv2.flip(image, 1)

    img_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    results = hands_detector.process(img_rgb)
    if not results.multi_hand_landmarks:
        return None

    hand = results.multi_hand_landmarks[0]
    return [c for lm in hand.landmark for c in (lm.x, lm.y, lm.z)]  # 63 values


def process_dataset(dataset_path: str, output_path: str):
    hands = mp_hands.Hands(
        static_image_mode=False,          # run detector on each image
        max_num_hands=1,
        min_detection_confidence=0.20,    # more lenient than default 0.5
    )

    classes = sorted(
        d for d in os.listdir(dataset_path)
        if os.path.isdir(os.path.join(dataset_path, d))
    )
    print(f"Classes ({len(classes)}): {classes}")

    X, y = [], []
    total_seen, total_kept = 0, 0

    for label, class_name in enumerate(classes):
        class_dir = os.path.join(dataset_path, class_name)
        img_files = [
            f for f in os.listdir(class_dir)
            if f.lower().endswith((".jpg", ".jpeg", ".png"))
        ]

        print(f"\n▶ {class_name}: {len(img_files)} images")
        kept_here = 0
        for img_file in tqdm(img_files, mininterval=0.1, leave=False):
            total_seen += 1
            img_path = os.path.join(class_dir, img_file)
            img = cv2.imread(img_path)
            if img is None:
                continue

            vec = extract_landmarks_from_image(img, hands)
            if vec is not None:
                X.append(vec)
                y.append(label)
                total_kept += 1
                kept_here += 1

        print(f"   ✓ kept {kept_here} / {len(img_files)}")

    print(f"\nOverall kept {total_kept} of {total_seen} images "
          f"({(total_kept/total_seen):.1%})")

    X = np.array(X, dtype=np.float32)
    y = np.array(y, dtype=np.int32)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    np.savez_compressed(output_path, X=X, y=y, classes=classes)
    print(f"Saved → {output_path}")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="ASL landmark extractor")
    parser.add_argument("--dataset", required=True,
                        help="Path to ASL dataset folder (letters A-Z subdirs)")
    parser.add_argument("--output", default="data/landmarks.npz",
                        help="Output .npz file path")
    args = parser.parse_args()

    process_dataset(args.dataset, args.output)
