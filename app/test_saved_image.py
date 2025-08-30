import cv2
from app.recognizer import ASLRecognizer

recognizer = ASLRecognizer()

# Change this path to a known good image from your training set
image_path = "data/raw/asl_alphabet_train/asl_alphabet_train/A/A1.jpg"

img = cv2.imread(image_path)
if img is None:
    print(f"Failed to load image at {image_path}")
    exit()

letter, confidence = recognizer.predict(img)
print(f"Predicted letter: {letter} with confidence {confidence:.2f}")

cv2.imshow("Test Image", img)
cv2.waitKey(0)
cv2.destroyAllWindows()
