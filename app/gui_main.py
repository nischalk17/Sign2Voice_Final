import os
import cv2
import json
import time
import numpy as np
import tensorflow as tf
import mediapipe as mp
from collections import deque, Counter
import tkinter as tk
from tkinter import ttk
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
root.title("Sign2Voice - Minimal")
root.configure(bg='#333333')
root.geometry("900x600")

# ---------------- Color Palette ----------------
COLORS = {
    'bg_primary': '#333333',
    'bg_secondary': '#444444',
    'bg_tertiary': '#555555',
    'text_primary': '#ffffff',
    'text_secondary': '#cccccc',

    # Control buttons
    'btn_clear': '#4d3d3d', 'btn_clear_hover': '#6b5656',
    'btn_speak': '#3d4d4d', 'btn_speak_hover': '#5a6868',
    'btn_save': '#3d4d3d', 'btn_save_hover': '#5a685a',
    'btn_exit': '#4d4d4d', 'btn_exit_hover': '#686868',

    # Suggestions
    'suggestion_bg': '#F9E79F', 'suggestion_hover': '#FFF3A0',

    # Prediction letter & current (bright green)
    'letter_fg': '#00FF7F'
}

# ---------------- Helper: Hover Button ----------------
def create_hover_button(parent, textvariable, command, bg_color, hover_color, text_color='#ffffff'):
    btn = tk.Button(parent, textvariable=textvariable, command=command,
                    font=("Segoe UI", 12), width=18, height=2,
                    bg=bg_color, fg=text_color, relief='flat', bd=0,
                    cursor='hand2', activebackground=hover_color,
                    activeforeground=text_color)
    btn.bind("<Enter>", lambda e: btn.config(bg=hover_color))
    btn.bind("<Leave>", lambda e: btn.config(bg=bg_color))
    return btn

# ---------------- Video Frame ----------------
video_frame = tk.Frame(root, bg=COLORS['bg_secondary'], relief='solid', bd=2)
video_frame.grid(row=0, column=0, columnspan=5, padx=20, pady=10, sticky='ew')
video_panel = tk.Label(video_frame, bg=COLORS['bg_secondary'])
video_panel.pack(padx=5, pady=5)

# ---------------- Status Labels ----------------
status_frame = tk.Frame(root, bg=COLORS['bg_primary'])
status_frame.grid(row=1, column=0, columnspan=5, padx=20, pady=(0, 10), sticky='ew')

current_var = tk.StringVar(value="Current: _")
sentence_var = tk.StringVar(value="Sentence:")

current_label = tk.Label(status_frame, textvariable=current_var,
                        font=("Segoe UI", 16, "bold"),
                        fg=COLORS['letter_fg'], bg=COLORS['bg_primary'])
current_label.pack(anchor='w', pady=(0, 5))

sentence_label = tk.Label(status_frame, textvariable=sentence_var,
                         font=("Segoe UI", 14),
                         fg=COLORS['text_primary'], bg=COLORS['bg_primary'],
                         wraplength=800, justify='left')
sentence_label.pack(anchor='w')

# ---------------- Smart Suggestions ----------------
sugg_btns = []
sugg_text = [tk.StringVar(value="") for _ in range(3)]
sentence = ""
session_id = str(uuid.uuid4())

def add_suggestion(word):
    global sentence
    if word:
        if sentence and not sentence.endswith(" "):
            sentence += " "
        sentence += word + " "
        sentence_var.set(f"Sentence: {sentence}")
        update_suggestion_buttons([])
        reset_suggestion_timer()

sugg_frame = tk.Frame(root, bg=COLORS['bg_primary'])
sugg_frame.grid(row=2, column=0, columnspan=5, padx=20, pady=(0, 10), sticky='ew')

sugg_title = tk.Label(sugg_frame, text="💡 Smart Suggestions",
                     font=("Segoe UI", 12, "bold"),
                     fg=COLORS['text_secondary'], bg=COLORS['bg_primary'])
sugg_title.pack(anchor='w', pady=(0, 5))

sugg_buttons_frame = tk.Frame(sugg_frame, bg=COLORS['bg_primary'])
sugg_buttons_frame.pack(fill='x')

for i in range(3):
    btn = create_hover_button(
        sugg_buttons_frame, sugg_text[i],
        lambda i=i: add_suggestion(sugg_text[i].get().replace("💡 ", "")),
        COLORS['suggestion_bg'], COLORS['suggestion_hover'], '#333333'
    )
    btn.pack(side='left', padx=(0, 15), fill='x', expand=True)
    btn.config(state="disabled", fg='#333333')
    sugg_btns.append(btn)

def update_suggestion_buttons(words):
    for i in range(3):
        if i < len(words):
            raw = words[i]
            sugg_text[i].set("💡 " + raw)
            sugg_btns[i].config(state="normal",
                                command=lambda w=raw: add_suggestion(w),
                                bg=COLORS['suggestion_bg'],
                                activebackground=COLORS['suggestion_hover'],
                                fg='#333333')
        else:
            sugg_text[i].set("")
            sugg_btns[i].config(state="disabled",
                                bg=COLORS['suggestion_bg'],
                                activebackground=COLORS['suggestion_bg'],
                                fg='#333333')

# ---------------- Control Buttons ----------------
control_frame = tk.Frame(root, bg=COLORS['bg_primary'])
control_frame.grid(row=3, column=0, columnspan=5, padx=20, pady=10, sticky='ew')
buttons_container = tk.Frame(control_frame, bg=COLORS['bg_primary'])
buttons_container.pack(fill='x', pady=5)

def clear_sentence():
    global sentence
    sentence = ""
    sentence_var.set("Sentence:")
    update_suggestion_buttons([])

def speak_sentence():
    speak(sentence)

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
            root.after(0, lambda: show_save_feedback("✅ Sentence saved successfully!"))
        else:
            print(f"❌ Failed to save: {response.status_code}, {response.text}")
            root.after(0, lambda: show_save_feedback("❌ Failed to save sentence"))
    except Exception as e:
        print("❌ Error saving sentence:", e)
        root.after(0, lambda: show_save_feedback("❌ Connection error - check server"))

def show_save_feedback(message):
    feedback_frame = tk.Frame(root, bg=COLORS['bg_tertiary'])
    feedback_frame.grid(row=5, column=0, columnspan=5, padx=20, pady=10, sticky='ew')
    feedback_label = tk.Label(feedback_frame, text=message,
                              font=("Segoe UI", 11, "bold"),
                              bg=COLORS['bg_tertiary'], fg='#ffffff', pady=8)
    feedback_label.pack()
    root.after(3000, feedback_frame.destroy)

# Create control buttons
clear_btn = create_hover_button(buttons_container, tk.StringVar(value="🗑️ Clear"),
                               clear_sentence, COLORS['btn_clear'], COLORS['btn_clear_hover'])
clear_btn.pack(side='left', padx=8, fill='x', expand=True)

speak_btn = create_hover_button(buttons_container, tk.StringVar(value="🔊 Speak"),
                               speak_sentence, COLORS['btn_speak'], COLORS['btn_speak_hover'])
speak_btn.pack(side='left', padx=8, fill='x', expand=True)

save_btn = create_hover_button(buttons_container, tk.StringVar(value="💾 Save"),
                              save_sentence_to_db, COLORS['btn_save'], COLORS['btn_save_hover'])
save_btn.pack(side='left', padx=8, fill='x', expand=True)

exit_btn = create_hover_button(buttons_container, tk.StringVar(value="❌ Exit"),
                              root.destroy, COLORS['btn_exit'], COLORS['btn_exit_hover'])
exit_btn.pack(side='left', padx=8, fill='x', expand=True)

for i in range(5):
    root.grid_columnconfigure(i, weight=1)

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
            current_var.set(f"Current: 💡 {letter} ({conf:.2f})")  # bright green

        mp_draw.draw_landmarks(frame, hand, mp_hands.HAND_CONNECTIONS)
        cv2.putText(frame, f"{letter} ({conf:.2f})", (10, 40),
                    cv2.FONT_HERSHEY_SIMPLEX, 1.5, (0, 255, 127), 2)  # bright green
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
