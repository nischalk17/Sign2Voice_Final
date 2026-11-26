import json
import numpy as np
from keras.models import load_model
import cv2

class ASLRecognizer:
    def __init__(self, model_path="models/asl_cnn.h5", label_map_path="models/label_map.json", img_size=64):
        # Load Keras model
        self.model = load_model(model_path)
        # Load label map: { 'A':0, ... } → invert to {0:'A', ...}
        with open(label_map_path, "r") as f:
            label_map = json.load(f)
        self.labels = {v: k for k, v in label_map.items()}
        self.img_size = img_size

    def preprocess(self, frame):
    # Convert BGR to RGB
        img_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        img_resized = cv2.resize(img_rgb, (self.img_size, self.img_size))
        img_normalized = img_resized.astype(np.float32) / 255.0
        img_batch = np.expand_dims(img_normalized, axis=0)
        return img_batch


    def predict(self, frame):
        """
        Predict the ASL letter in the given frame image.
        Returns: (predicted_letter:str, confidence:float)
        """
        img = self.preprocess(frame)
        preds = self.model.predict(img)
        class_idx = np.argmax(preds)
        confidence = preds[0][class_idx]
        letter = self.labels.get(class_idx, "?")
        return letter, confidence
