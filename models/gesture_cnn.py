"""
Gesture CNN trainer for ASL Alphabet
------------------------------------
Usage (from Sign2Voice/ root):

    python -m models.gesture_cnn \
        --dataset data/raw/asl_alphabet_train \
        --epochs 10 \
        --img_size 64 \
        --batch 64 \
        --limit_per_class 1000   # images per letter (speed-up)

        

        
Saves:
    models/asl_cnn.h5          (Keras model)
    models/label_map.json      (dict: {'A':0, 'B':1, ...})
"""

import os, json, argparse
import numpy as np
import tensorflow as tf                      
from keras import layers, models             # ← NEW: pull layers/models from Keras 3
from utils.preprocessing import load_asl_dataset


def build_cnn(input_shape=(64, 64, 3), num_classes=29):
    model = models.Sequential([
        layers.Conv2D(32, (3, 3), activation="relu", input_shape=input_shape),
        layers.MaxPooling2D(2, 2),

        layers.Conv2D(64, (3, 3), activation="relu"),
        layers.MaxPooling2D(2, 2),

        layers.Conv2D(128, (3, 3), activation="relu"),
        layers.MaxPooling2D(2, 2),

        layers.Flatten(),
        layers.Dense(256, activation="relu"),
        layers.Dropout(0.3),
        layers.Dense(num_classes, activation="softmax"),
    ])

    model.compile(
        optimizer="adam",
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )
    return model


def main(args):
    # 1️⃣  Load & split data
    print("⏳ Loading dataset …")
    X_train, X_test, y_train, y_test, label_map = load_asl_dataset(
        args.dataset,
        img_size=(args.img_size, args.img_size),
        test_size=0.2,
        limit_per_class=args.limit_per_class,
    )

    num_classes = len(label_map)
    print(f"✅ Dataset loaded: {X_train.shape[0]} train / {X_test.shape[0]} test samples ➜ {num_classes} classes")

    # 2️⃣  Build model
    model = build_cnn(input_shape=(args.img_size, args.img_size, 3),
                      num_classes=num_classes)
    model.summary()

    # 3️⃣  Train
    history = model.fit(
        X_train, y_train,
        epochs=args.epochs,
        batch_size=args.batch,
        validation_split=0.1,
    )

    # 4️⃣  Evaluate
    test_loss, test_acc = model.evaluate(X_test, y_test, verbose=0)
    print(f"🧪 Test accuracy: {test_acc:.4f}")

    # 5️⃣  Save model + label map
    model_out = os.path.join("models", "asl_cnn.h5")
    label_out = os.path.join("models", "label_map.json")
    model.save(model_out)
    with open(label_out, "w") as f:
        json.dump(label_map, f)

    print(f"💾 Saved model to {model_out}")
    print(f"💾 Saved label map to {label_out}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", type=str, required=True,
                        help="Path to asl_alphabet_train directory")
    parser.add_argument("--epochs", type=int, default=10)
    parser.add_argument("--batch", type=int, default=64)
    parser.add_argument("--img_size", type=int, default=64)
    parser.add_argument("--limit_per_class", type=int, default=1000,
                        help="Images per class to load (speed-up). Set 0 for unlimited")
    args = parser.parse_args()
    main(args)
