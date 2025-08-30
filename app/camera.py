import cv2
import mediapipe as mp

class HandDetector:
    def __init__(self, max_hands=2, detection_confidence=0.7, tracking_confidence=0.7):
        self.mpHands = mp.solutions.hands
        self.hands = self.mpHands.Hands(
            max_num_hands=max_hands,
            min_detection_confidence=detection_confidence,
            min_tracking_confidence=tracking_confidence
        )
        self.mpDraw = mp.solutions.drawing_utils

    def detect_hands(self, img, draw=True):
        imgRGB = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        self.results = self.hands.process(imgRGB)
        all_landmarks = []

        if self.results.multi_hand_landmarks:
            for handLms in self.results.multi_hand_landmarks:
                landmarks = []
                for id, lm in enumerate(handLms.landmark):
                    h, w, _ = img.shape
                    cx, cy = int(lm.x * w), int(lm.y * h)
                    landmarks.append((id, cx, cy))
                all_landmarks.append(landmarks)

                if draw:
                    self.mpDraw.draw_landmarks(img, handLms, self.mpHands.HAND_CONNECTIONS)

        return img, all_landmarks
