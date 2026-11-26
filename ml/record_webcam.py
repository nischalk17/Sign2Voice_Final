"""Record a held-out WEBCAM test set (landmarks only, no images are stored).

    python -m ml.record_webcam --person me --tag daylight

Controls (click the video window first):
    A-Z     choose the letter you are about to sign
    TAB     start / stop recording (about 10 samples per second while on)
    ESC     save and quit

Tips for a useful test set:
    * 100+ samples per letter, hold the sign and slightly move/rotate the hand between samples
    * record at least two different people and two lighting conditions (--tag)
    * never use this file for training: it exists only to measure real-world accuracy
J and Z involve motion; record them as a static pose or skip them (report which you skipped).
"""
import argparse, os, time
import cv2
import numpy as np
import mediapipe as mp

LETTERS = [chr(c) for c in range(ord("A"), ord("Z") + 1)]


def main(person, tag, out_dir, camera, rate_hz):
    os.makedirs(out_dir, exist_ok=True)
    out = os.path.join(out_dir, f"webcam_{person}_{tag}.npz")
    hands = mp.solutions.hands.Hands(static_image_mode=False, max_num_hands=1,
                                     min_detection_confidence=0.3, min_tracking_confidence=0.3)
    draw = mp.solutions.drawing_utils
    cap = cv2.VideoCapture(camera)
    X, y, frame_no = [], [], []
    counts = {c: 0 for c in LETTERS}
    cur, rec, last, n = "A", False, 0.0, 0

    while True:
        ok, frame = cap.read()
        if not ok:
            break
        n += 1
        res = hands.process(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))   # same unflipped frame the app uses
        if res.multi_hand_landmarks:
            hand = res.multi_hand_landmarks[0]
            draw.draw_landmarks(frame, hand, mp.solutions.hands.HAND_CONNECTIONS)
            if rec and time.time() - last >= 1.0 / rate_hz:
                X.append([c for lm in hand.landmark for c in (lm.x, lm.y, lm.z)])
                y.append(LETTERS.index(cur)); frame_no.append(n)
                counts[cur] += 1; last = time.time()
        cv2.putText(frame, f"letter {cur}  {'REC' if rec else 'paused'}  n={counts[cur]}  total={len(X)}",
                    (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255) if rec else (0, 255, 0), 2)
        cv2.imshow("record webcam test set (TAB=rec, ESC=save+quit)", frame)
        k = cv2.waitKey(1) & 0xFF
        if k == 27:
            break
        if k == 9:
            rec = not rec
        elif 0 < k < 128 and chr(k).upper() in LETTERS:
            cur = chr(k).upper()

    cap.release(); cv2.destroyAllWindows(); hands.close()
    if not X:
        print("nothing recorded"); return
    np.savez_compressed(out, X=np.array(X, np.float32), y=np.array(y, np.int32),
                        classes=np.array(LETTERS), img_id=np.array(frame_no, np.int32))
    print(f"saved {len(X)} samples -> {out}")
    print({c: v for c, v in counts.items() if v})


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--person", required=True, help="short id, e.g. me, friend1 (no real names needed)")
    ap.add_argument("--tag", default="default", help="condition, e.g. daylight, lamp")
    ap.add_argument("--out_dir", default="ml/data")
    ap.add_argument("--camera", type=int, default=0)
    ap.add_argument("--rate_hz", type=float, default=10.0)
    a = ap.parse_args()
    main(a.person, a.tag, a.out_dir, a.camera, a.rate_hz)
