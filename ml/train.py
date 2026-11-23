import argparse, json, os
import numpy as np
import tensorflow as tf
from tensorflow.keras import layers, models
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix
from contextlib import redirect_stdout
import matplotlib.pyplot as plt
import seaborn as sns

def load_data(path):
    data = np.load(path, allow_pickle=True)
    X, y, classes = data["X"], data["y"], list(data["classes"])
    return X, y, classes

def build_model(num_classes):
    model = models.Sequential([
        layers.Reshape((21, 3), input_shape=(63,)),
        layers.Conv1D(64, 3, activation="relu"),
        layers.Conv1D(128, 3, activation="relu"),
        layers.Flatten(),
        layers.Dense(256, activation="relu"),
        layers.Dropout(0.3),
        layers.Dense(num_classes, activation="softmax")
    ])
    model.compile(optimizer="adam",
                  loss="sparse_categorical_crossentropy",
                  metrics=["accuracy"])
    return model

def plot_metrics(report, class_names):
    precision = [report[cls]["precision"] for cls in class_names]
    recall = [report[cls]["recall"] for cls in class_names]
    x = np.arange(len(class_names))
    width = 0.35

    plt.figure(figsize=(14, 6))
    plt.bar(x - width/2, precision, width, label='Precision')
    plt.bar(x + width/2, recall, width, label='Recall')
    plt.xticks(x, class_names, rotation=90)
    plt.ylabel("Score")
    plt.title("Precision and Recall per Class")
    plt.legend()
    plt.tight_layout()
    plt.savefig("metrics/precision_recall_bar_chart.png")
    plt.close()

def plot_confusion_matrix(cm, class_names):
    plt.figure(figsize=(12, 10))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', xticklabels=class_names, yticklabels=class_names)
    plt.title("Confusion Matrix")
    plt.xlabel("Predicted")
    plt.ylabel("Actual")
    plt.tight_layout()
    plt.savefig("metrics/confusion_matrix.png")
    plt.close()

def main(args):
    # Load data
    X, y, classes = load_data(args.train)
    os.makedirs("models", exist_ok=True)
    os.makedirs("metrics", exist_ok=True)

    # Drop low sample classes
    min_samples = 100
    keep_mask = np.bincount(y) >= min_samples
    keep_classes = [i for i, k in enumerate(keep_mask) if k]
    mapping = {old: new for new, old in enumerate(keep_classes)}
    indices = np.isin(y, keep_classes)

    X = X[indices]
    y = np.vectorize(mapping.get)(y[indices])
    classes = [classes[i] for i in keep_classes]

    print(f"✅ {len(classes)} classes kept | Total samples: {len(X)}")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.3, stratify=y, random_state=42
    )
    print(f"📦 Train: {len(X_train)} | Test: {len(X_test)}")

    model = build_model(num_classes=len(classes))

    # Save model architecture
    with open("models/landmark_cnn_architecture.txt", "w") as f:
        with redirect_stdout(f):
            model.summary()

    history = model.fit(
        X_train, y_train,
        epochs=args.epochs,
        batch_size=args.batch,
        validation_split=0.1,
        verbose=2
    )

    with open("models/landmark_cnn_history.json", "w") as f:
        json.dump(history.history, f)

    test_loss, test_acc = model.evaluate(X_test, y_test, verbose=0)
    print(f"\n🎯 Test accuracy: {test_acc:.4f}")
    with open("models/landmark_cnn_accuracy.txt", "w") as f:
        f.write(f"Test accuracy: {test_acc:.4f}\n")

    y_pred = model.predict(X_test)
    y_pred_labels = np.argmax(y_pred, axis=1)

    report_dict = classification_report(
        y_test, y_pred_labels, target_names=classes, output_dict=True, digits=3
    )
    with open("metrics/classification_report.json", "w") as f:
        json.dump(report_dict, f, indent=4)
    print("\n📊 Classification report saved to metrics/classification_report.json")

    # Plot metrics
    plot_metrics(report_dict, classes)
    print("📈 Bar chart saved to metrics/precision_recall_bar_chart.png")

    cm = confusion_matrix(y_test, y_pred_labels)
    plot_confusion_matrix(cm, classes)
    print("📉 Confusion matrix saved to metrics/confusion_matrix.png")

    model.save("models/landmark_cnn.h5")
    with open("models/landmark_classes.json", "w") as f:
        json.dump(classes, f)

    print("✅ All artifacts saved in /models and /metrics folders.")

if __name__ == "__main__":
    import numpy as np
    parser = argparse.ArgumentParser()
    parser.add_argument("--train", required=True, help="Path to .npz landmark file")
    parser.add_argument("--epochs", type=int, default=20)
    parser.add_argument("--batch", type=int, default=128)
    main(parser.parse_args())