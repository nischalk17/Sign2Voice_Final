import os
import cv2
import json
import time
import numpy as np
import tensorflow as tf
import mediapipe as mp
from collections import deque, Counter
import tkinter as tk
from PIL import Image, ImageTk
import requests
import uuid
import sys
import io

# Fix Unicode print issues for Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from tts import speak
from suggestions import get_suggestions

# ---------------- Paths ----------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "models", "landmark_cnn.h5")
CLASSES_PATH = os.path.join(BASE_DIR, "models", "landmark_classes.json")

# ---------------- Load Model ----------------
print("Loading TensorFlow model...")
model = tf.keras.models.load_model(MODEL_PATH)
print("Loading class names...")
class_names = json.load(open(CLASSES_PATH))

# ---------------- MediaPipe Hands ----------------
print("Initializing MediaPipe...")
mp_hands = mp.solutions.hands
hands = mp_hands.Hands(static_image_mode=False,
                       max_num_hands=1,
                       min_detection_confidence=0.3,
                       min_tracking_confidence=0.3)
mp_draw = mp.solutions.drawing_utils
print("SIGN2VOICE_READY")

# ---------------- Tkinter GUI ----------------
root = tk.Tk()
root.title("Sign2Voice")

video_panel = tk.Label(root)
video_panel.grid(row=0, column=0, columnspan=5, padx=10, pady=10)

current_var = tk.StringVar(value="Current: _")
sentence_var = tk.StringVar(value="Sentence:")
tk.Label(root, textvariable=current_var, font=("Arial", 14, "bold")).grid(row=1, column=0, sticky="w")
tk.Label(root, textvariable=sentence_var, font=("Arial", 14)).grid(row=2, column=0, columnspan=5, sticky="w")

# ---------------- Suggestions ----------------
sugg_btns = []
sugg_text = [tk.StringVar(value="") for _ in range(3)]
BTN_SUGG = {"font": ("Arial", 11), "width": 16, "state": "disabled",
            "relief": "groove", "bd": 2, "bg": "#e6f7ff", "cursor": "hand2"}

sentence = ""
session_id = str(uuid.uuid4())  # unique session id for this run

def add_suggestion(word):
    global sentence
    if word:
        if sentence and not sentence.endswith(" "):
            sentence += " "
        sentence += word + " "
        sentence_var.set(f"Sentence: {sentence}")
        update_suggestion_buttons([])
        reset_suggestion_timer()

for i in range(3):
    btn = tk.Button(root, textvariable=sugg_text[i],
                    command=lambda i=i: add_suggestion(sugg_text[i].get()),
                    **BTN_SUGG)
    btn.grid(row=3, column=i, padx=4, pady=(0, 10))
    sugg_btns.append(btn)

def update_suggestion_buttons(words):
    for i in range(3):
        if i < len(words):
            raw = words[i]
            sugg_text[i].set("💡 " + raw)
            sugg_btns[i].config(state="normal", command=lambda w=raw: add_suggestion(w))
        else:
            sugg_text[i].set("")
            sugg_btns[i].config(state="disabled")

# ---------------- Control Buttons ----------------
BTN_CTRL = {"font": ("Arial", 12, "bold"), "width": 12, "bd": 3, "cursor": "hand2"}

def clear_sentence():
    global sentence
    sentence = ""
    sentence_var.set("Sentence:")
    update_suggestion_buttons([])

def speak_sentence():
    speak(sentence)

def show_save_feedback(message):
    feedback_label = tk.Label(root, text=message, font=("Arial", 10),
                              bg="#d4edda" if "✅" in message else "#f8d7da",
                              fg="#155724" if "✅" in message else "#721c24")
    feedback_label.grid(row=4, column=0, columnspan=5, pady=5)
    root.after(2000, feedback_label.destroy)

# ---------------- Save Sentence ----------------
def save_sentence_to_db():
    global sentence
    if not sentence.strip():
        return
    try:
        response = requests.post(
            "http://localhost:5000/api/sentences/save",
            json={"text": sentence.strip(), "sessionId": session_id, "source": "gui"},
            timeout=10
        )
        if response.status_code in [200, 201]:
            print(f"✅ Saved sentence: {sentence.strip()}")
            root.after(0, lambda: show_save_feedback("✅ Saved!"))
        else:
            print(f"❌ Failed to save: {response.status_code}, {response.text}")
            root.after(0, lambda: show_save_feedback("❌ Save failed"))
    except Exception as e:
        print("❌ Error saving sentence:", e)
        root.after(0, lambda: show_save_feedback("❌ Connection error"))

tk.Button(root, text="🗑️ Clear", bg="#ffb3b3", command=clear_sentence, **BTN_CTRL).grid(row=1, column=3, padx=5, pady=5)
tk.Button(root, text="🗣 Speak", bg="#b3e6ff", command=speak_sentence, **BTN_CTRL).grid(row=1, column=4, padx=5, pady=5)
tk.Button(root, text="💾 Save", bg="#d4edda", command=save_sentence_to_db, **BTN_CTRL).grid(row=2, column=3, padx=5, pady=5)
tk.Button(root, text="❌ Exit", bg="#ff6666", fg="white", command=root.destroy, **BTN_CTRL).grid(row=2, column=4, padx=5, pady=5, sticky="e")

# ---------------- Webcam & Prediction ----------------
cap = cv2.VideoCapture(0)
pred_buffer = deque(maxlen=10)
buffer_vote = 6
last_added = ""
last_sugg_time = 0
SUGG_INTERVAL = 5
last_ctx_used = ""

def is_valid_suggestion(w):
    return len(w) > 1 and not all(c == w[0] for c in w)

def reset_suggestion_timer():
    global last_sugg_time, last_ctx_used
    last_sugg_time = 0
    last_ctx_used = ""

def maybe_fetch_suggestions():
    global last_sugg_time, last_ctx_used
    ctx_words = sentence.strip().split()[-5:]
    if not ctx_words:
        update_suggestion_buttons([])
        return
    ctx = " ".join(ctx_words)
    now = time.time()
    if (now - last_sugg_time) >= SUGG_INTERVAL and ctx != last_ctx_used:
        last_sugg_time = now
        last_ctx_used = ctx
        try:
            raw = get_suggestions(ctx)
            filtered = [w for w in raw if is_valid_suggestion(w)]
            update_suggestion_buttons(filtered[:3])
        except Exception as e:
            print("Suggestion error:", e)
            update_suggestion_buttons([])

def update_frame():
    global sentence, last_added
    ok, frame = cap.read()
    if not ok:
        root.after(10, update_frame)
        return

    results = hands.process(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))

    if results.multi_hand_landmarks:
        hand = results.multi_hand_landmarks[0]
        lm_vec = [c for p in hand.landmark for c in (p.x, p.y, p.z)]
        preds = model.predict(np.expand_dims(lm_vec, 0), verbose=0)[0]
        conf = preds.max()
        letter = class_names[int(preds.argmax())]

        if conf >= 0.8:
            pred_buffer.append(letter)
            vote, count = Counter(pred_buffer).most_common(1)[0]
            if count >= buffer_vote and vote != last_added:
                if vote == "space":
                    sentence += " "
                elif vote == "del":
                    sentence = sentence[:-1]
                else:
                    sentence += vote
                last_added = vote
                pred_buffer.clear()
                sentence_var.set(f"Sentence: {sentence}")
                reset_suggestion_timer()
            current_var.set(f"Current: {letter} ({conf:.2f})")

        mp_draw.draw_landmarks(frame, hand, mp_hands.HAND_CONNECTIONS)
        cv2.putText(frame, f"{letter} ({conf:.2f})", (10, 40),
                    cv2.FONT_HERSHEY_SIMPLEX, 1.5, (0, 255, 0), 3)
    else:
        pred_buffer.clear()
        last_added = ""
        current_var.set("Current: _")

    maybe_fetch_suggestions()

    img = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
    imgtk = ImageTk.PhotoImage(image=img)
    video_panel.imgtk = imgtk
    video_panel.configure(image=imgtk)
    root.after(10, update_frame)

update_frame()
root.mainloop()
cap.release()
cv2.destroyAllWindows()
