"""
Utility functions for loading and preprocessing the ASL Alphabet dataset
------------------------------------------------------------------------
`load_asl_dataset` returns NumPy arrays ready for Keras / TensorFlow.

Example:
    from utils.preprocessing import load_asl_dataset
    X_train, X_test, y_train, y_test, label_map = load_asl_dataset(
        "data/raw/asl_alphabet_train",
        img_size=(64, 64),
        test_size=0.2,
        limit_per_class=1000
    )
"""

import os
import cv2
import numpy as np
from sklearn.model_selection import train_test_split


def load_asl_dataset(
    dataset_path: str,
    img_size=(64, 64),
    test_size: float = 0.2,
    limit_per_class: int = 0,
    shuffle: bool = True,
    seed: int = 42,
):
    """
    Load images from the ASL Alphabet directory structure.

    Args:
        dataset_path (str): Path to folder containing sub-folders A, B, C, …, Z.
        img_size (tuple): (width, height) for resizing.
        test_size (float): Fraction of data reserved for the test set.
        limit_per_class (int): Max images to load per class
                               (0 = load everything).
        shuffle (bool): Whether to shuffle after loading.
        seed (int): RNG seed for reproducibility.

    Returns:
        X_train, X_test, y_train, y_test, label_map
    """
    X, y = [], []

    # Sorted so label indices are stable
    labels = sorted(
        [
            d
            for d in os.listdir(dataset_path)
            if os.path.isdir(os.path.join(dataset_path, d))
        ]
    )
    label_map = {label: idx for idx, label in enumerate(labels)}
    rng = np.random.default_rng(seed)

    for label in labels:
        class_dir = os.path.join(dataset_path, label)

        # Collect valid image file names
        images = [
            f
            for f in os.listdir(class_dir)
            if f.lower().endswith((".jpg", ".jpeg", ".png"))
        ]

        # Sub-sample to speed up training if requested
        if limit_per_class > 0 and len(images) > limit_per_class:
            images = rng.choice(images, size=limit_per_class, replace=False)

        for img_name in images:
            img_path = os.path.join(class_dir, img_name)
            img = cv2.imread(img_path)

            if img is None:
                # skip unreadable images
                continue

            img = cv2.resize(img, img_size)
            X.append(img)
            y.append(label_map[label])

    # Convert to NumPy and scale to 0-1
    X = np.array(X, dtype=np.float32) / 255.0
    y = np.array(y, dtype=np.int32)

    if shuffle:
        idx = rng.permutation(len(X))
        X, y = X[idx], y[idx]

    # Stratified split keeps class balance
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=seed, stratify=y
    )

    return X_train, X_test, y_train, y_test, label_map
