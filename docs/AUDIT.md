# Sign2Voice – Read-Only Audit

Audited: 2026-11-23, branch `main`, HEAD `087069c`, 8 commits (2025-08-30 to 2025-09-01).
Method: reading files and git history only. Nothing was run, trained, installed or changed.
Limits: Python is not on PATH in the audit shell, so `.npz` and `.h5` contents were **not** opened. Anything that needs that is marked **NOT VERIFIED**.

---

## 1. Did you train the model yourself?

### Verdict
| Model | File | Verdict |
|---|---|---|
| **Landmark CNN (the one the app actually uses)** | `app/models/landmark_cnn.h5` | **Trained here** (from scratch, on MediaPipe landmarks) |
| Image CNN | `app/models/asl_cnn.h5` | **Trained here** by `models/gesture_cnn.py`, but **dead code**: no running path uses it |
| Trigram LM | `app/models/trigram_mle.pkl` | Unclear. Its producer scripts are gitignored and absent. Nothing loads it. |
| Word suggestions | `distilgpt2` | **Downloaded/pretrained** (HuggingFace). Not trained or fine-tuned. |
| Hand landmarks | MediaPipe Hands | **Pretrained** (Google). Used as a frozen feature extractor. |

**The sign classifier is not a default or pretrained model. You defined it, trained it and saved it.** The pretrained parts are MediaPipe (the hand detector and landmarker) and distilgpt2 (suggestions). Say this plainly in the README.

### Evidence that the landmark CNN was trained here
- `models/landmark_cnn.py` is a complete training script. It loads `.npz` with `np.load` (l.11-14), defines the Conv1D layers (l.16-29), calls `model.fit` (l.89), runs `model.evaluate` (l.100) and calls `model.save("models/landmark_cnn.h5")` (l.123).
- The script's outputs are committed and match the architecture:
  - `app/models/landmark_cnn_architecture.txt` shows Reshape(21,3), Conv1D 64, Conv1D 128, Flatten, Dense 256, Dropout, Dense 28. It has 589,852 params, matching the code.
  - `app/models/landmark_cnn_history.json` has 20 epochs of loss, accuracy, val_loss and val_accuracy.
  - `app/models/landmark_cnn_accuracy.txt` says `Test accuracy: 0.9915`.
- The `.h5` file stores a `training_config` entry, so it was compiled and trained in Keras and is not a re-saved download.
- The app loads this file: `app/gui_main.py:25-30` and `app/main.py:7` call `load_model` on `landmark_cnn.h5`. `app/gui_main.py` and `app/main.py` read `landmark_classes.json`.
- No URL, `gdown`, `wget`, `hf_hub` or `keras.applications` download of a classifier exists anywhere in the code. The only downloads are `distilgpt2` (`app/suggestions.py:6-7`) and the MediaPipe wheel.

### Model files and the commit that added each
| File | Size | Added in |
|---|---|---|
| `app/models/trigram_mle.pkl` | 22.9 MB | `c1c8f68` 2025-08-30 "first commit" |
| `app/models/asl_cnn.h5` | 15.4 MB | `c1c8f68` |
| `app/models/landmark_cnn.h5` | 7.1 MB | `c1c8f68` |
| `data/processed/landmarks_train.npz` | 16.9 MB | `c1c8f68` |

All of these arrived in one "first commit". There is no incremental training history in git. That is not damning, but it means git alone cannot prove the training timeline. See "Provenance gaps".

### Dataset references
- The README says **"Used the ASL Alphabet Dataset"** (A-Z, space, delete, nothing; ~29 classes; 80,000+ images). It gives **no URL, no author credit and no licence**. The folder names in the code (`data/raw/asl_alphabet_train/asl_alphabet_train/`) match the Kaggle "ASL Alphabet" (grassknoted) dataset. That dataset is 87,000 images, 3,000 per class.
- Raw images are not in the repo (`data/raw/` is gitignored). Only the extracted landmark file is.

### Provenance gaps (things git cannot prove)
1. `landmark_cnn.py` writes to `models/`, but the app loads from `app/models/`. A manual copy happened. The committed `app/models/landmark_cnn.h5` therefore cannot be tied to a specific script run. The root `models/*.h5` files are gitignored and not present.
2. `trigram_mle.pkl` was produced by `utils/train_trigram.py` and `data/build_language_model.py`. Both are gitignored and absent, and the README says Local distilgpt2 replaced it. It is orphaned.
3. `asl_cnn.h5` was trained by `gesture_cnn.py` with `--limit_per_class 1000` by default. Its accuracy was never recorded in the repo.
4. `app/models/gesture_cnn.py` is an exact duplicate of `models/gesture_cnn.py`.

---

## 2. ML pipeline facts (from code and recorded outputs only)

| Item | What the repo shows | Source |
|---|---|---|
| Dataset | ASL Alphabet (Kaggle-style folder layout) | README, `utils/extract_landmarks.py` |
| Hand detection | MediaPipe Hands, `static_image_mode=False`, `max_num_hands=1`, `min_detection_confidence=0.20` for extraction. Live app uses 0.3 detection and 0.3 tracking. | `utils/extract_landmarks.py:39-43`, `app/main.py:12-17` |
| Feature | 21 landmarks × (x, y, z) = 63 floats, as raw MediaPipe normalized image coordinates. **No wrist-centering, no scale normalization, no handedness flip.** | `extract_landmarks.py:35` |
| Images with no hand | Dropped. Kept counts per class are printed but **not saved**. | `extract_landmarks.py:71-75` |
| Cropping / resizing | None for the landmark model. The 64×64 resize applies only to the unused image CNN. | `utils/preprocessing.py:80` |
| Architecture | Reshape(21,3), Conv1D(64,3), Conv1D(128,3), Flatten, Dense(256), Dropout(0.3), Dense(28, softmax). 589,852 params. | `landmark_cnn_architecture.txt` |
| Classes | **28**: A-Z, `del`, `space`. `nothing` is dropped by the `min_samples=100` filter. | `landmark_classes.json`, `landmark_cnn.py:64-73` |
| Split | `train_test_split(test_size=0.3, stratify=y, random_state=42)` on a single `.npz`. Then `validation_split=0.1` of the training part. | `landmark_cnn.py:77,93` |
| Training | Adam, sparse CE, batch 128, 20 epochs, no augmentation, no seeds set for TF/NumPy. | `landmark_cnn.py` |
| Recorded accuracy | Test **0.9915**. Final train acc 0.9920, val acc 0.9926 (epoch 20). | `landmark_cnn_accuracy.txt`, `landmark_cnn_history.json` |
| Confusion matrix / per-class report | The script writes them to `metrics/`. That folder is gitignored and **not in the repo**. They are not available. | `landmark_cnn.py:45,55,111` |
| Sample counts | README says 73,498 total (51,448 train / 22,050 test). The arithmetic is consistent (70/30 of 73,498 = 51,449/22,049), but **NOT VERIFIED** because the `.npz` was not opened. | README |

### Leakage and validity of the 99.15% (important)
- **The test set is not a held-out test set in any meaningful sense.** It is a random 30% of the same dataset. The Kaggle ASL Alphabet images are ~3,000 near-duplicate frames per class from a small number of signers, one background and one lighting setup. A random split puts near-identical frames of the same signer and session in both train and test. The 99.15% measures memorization of that session, not generalization.
- Nothing in the repo records signer IDs, and the dataset has none. A signer-disjoint split is **not possible** with this dataset as-is.
- The validation split reuses the same pool, so val accuracy (99.26%) is also optimistic.
- The README states "Final test accuracy (on unseen data): 99.15%, demonstrating excellent generalization." and "no signs of overfitting". Both claims are **not supported**. The README also mentions a `landmarks_test.npz` that does not exist. The official `asl_alphabet_test` folder (28 images) was never used.
- Live webcam accuracy is **unmeasured**. Preprocessing is applied consistently between training and the live app (same raw MediaPipe x, y, z). The distribution shift (different hands, camera, lighting, mirrored webcam) is not evaluated. The webcam feed is not flipped, but the dataset images are unflipped as well, so that part is probably consistent. Letters J and Z need motion and are static-classified, so those are inherently unreliable.
- `app/main.py` and `app/gui_main.py` apply a `conf > 0.8` threshold plus majority voting (6 of 10 frames). That is a heuristic on top of the classifier, and its effect is not measured.

---

## 3. Repo hygiene

### 3a. Tracked junk
Tracked files total 5,216. About 5,135 of them are `node_modules`.

| Item | Count / size | Action | Reason |
|---|---|---|---|
| `app/Server/node_modules/` | 3,199 tracked files | **DELETE** from git (`git rm -r --cached`) + **GITIGNORE** | Reinstallable from `package-lock.json`. The Client `.gitignore` ignores it, but no Server `.gitignore` exists. |
| Root `node_modules/` | 1,936 tracked files | **DELETE** from git + **GITIGNORE** | It holds only tailwind and vite, and is not needed at the root. |
| Root `package.json`, `package-lock.json` | tailwind deps only | **DELETE** | Duplicates `app/Client/`. Unclear purpose. |
| `app/Server/package.json` | 6.9 KB | **KEEP**, but clean | Lists hundreds of transitive deps (`abbrev`, `accepts`, ...) as direct dependencies. This looks like a `package-lock` paste. Rebuild with `npm init` and re-add only the 8-10 real deps. |
| `__pycache__`, `.ipynb_checkpoints`, venvs, `dist/`, `*.log`, `.env` | 0 tracked | KEEP ignored | `.gitignore` already covers `__pycache__/` and `.env`. |
| `sign2voice.db`, `app/sign2voice.db`, `app/Server/sign2voice.db` | 20 / 24 / 20 KB | **DELETE** + **GITIGNORE** `*.db` | 3 SQLite files (different content). Nothing in the code reads SQLite (the app uses MongoDB). They may contain user data. **Check them locally before deletion.** |
| `app/models/trigram_mle.pkl` | 22.9 MB | **DELETE** | Orphaned (nothing loads it) and the producing script is missing. A pickle is also an arbitrary-code-execution risk, which matters for a security-flavoured application. |
| `app/models/asl_cnn.h5`, `label_map.json` (both copies), `recognizer.py`, `test_saved_image.py`, `gesture_cnn.py` (both copies), `utils/preprocessing.py` | 15.4 MB | **MOVE to `ml/legacy/`** or **DELETE** | The image-CNN path is superseded. It is unused at runtime. Keep it only if you want it as a baseline. |
| `app/main.py` | 3 KB | **KEEP** as a CLI demo, or **DELETE** | It duplicates the `gui_main.py` loop. |
| `app/camera.py` | 1 KB | **DELETE** (verify first) | It imports mediapipe only. Dead code. |
| `app/Server/route/camera.js` | 1 KB | **FIX or DELETE** | It is never mounted in `main.js`. The Dashboard calls `/api/open-webcam`, which does not exist. Even the route name `/start-webcam` does not match it. The "Open webcam" button is likely broken. |
| Duplicated `models/` at root vs `app/models/` | 2 copies of `landmark_cnn.py`, `label_map.json`, etc. | **MOVE** → single `ml/` | Duplicate directories cause the provenance gap above. |
| `data/processed/landmarks_train.npz` | 16.9 MB | **MOVE** to Release asset / Git LFS / download link | It is committed even though `data/*.npz` is in `.gitignore`. The pattern does not match the `data/processed/` subfolder. |
| `app/models/*.h5` | 7.1 MB, 15.4 MB | **KEEP landmark_cnn.h5** (small, needed to run). Remove `asl_cnn.h5`. | `.gitignore` says `models/*.h5` but that pattern does not match `app/models/`. |
| `.gitignore` | | **FIX** | Add `node_modules/`, `*.db`, `*.npz`, `app/models/*.pkl`, `.env*`, `metrics/`, `*.h5` (with an allowlist for the shipped model). Remove the stale NLTK lines. |

Files over 50 MB: **none** (largest is 22.9 MB). No GitHub-limit problem. Nothing needs LFS today, but the 16 MB `.npz` and any retrained models are better as Release assets.

### 3b. SECURITY

**Good news (verified):**
- No `.env` file has ever been committed. `git log --all --name-only` shows no `.env*` path in any commit.
- No MongoDB Atlas URI (`mongodb+srv://`) appears anywhere in history. The only fallback is `mongodb://localhost:27017/sign2voice` (harmless, local).
- No `API_KEY` string appears in history. JWT secrets are read from `process.env.JWT_SECRET` and not committed as values.
- No third-party API keys are used (distilgpt2 is local).

**Problems found:**

| # | Finding | Where | Severity | Action |
|---|---|---|---|---|
| S1 | **Hardcoded default admin credentials**: email `su***********@gmail.com`, password `Su*********1$`. They are in source and also **printed to the console**. Added in `087069c`. | `app/Server/createAdmin.js:15-24` | **High** | **Rotate/change the admin password in any deployed or local DB that used it** and treat it as public. Replace with env-provided values or a prompt. It remains in git history, so changing it is the real fix. |
| S2 | **JWT fallback secret `"secret"`** for admin tokens, if `JWT_SECRET` is unset. Anyone can forge an admin JWT. Admin tokens last 7 days. | `app/Server/middleware/adminAuthMiddleware.js:5`, `app/Server/route/adminAuth.js:7` | **High** | Fail startup if `JWT_SECRET` is missing. If you ever ran with the fallback, rotate. |
| S3 | `JWT_SECRET` and `MONGO_URI` are referenced in the first commit and `087069c`, but only as `process.env.*` reads. | `main.js`, `authroute.js` | Info | **Rotate JWT_SECRET and the MongoDB password only if they ever ended up in a committed file.** History shows they did not. Rotate anyway if the repo was ever public and you used weak values. |
| S4 | `sign2voice.db` ×3 (SQLite) are committed. Contents **not inspected** (no tools). They may contain user emails or password hashes. | root, `app/`, `app/Server/` | Medium | Inspect locally. If they contain real users, treat them as exposed and purge them from history. |
| S5 | All API calls use `http://localhost:5000` hardcoded in 8+ client files. Not a secret leak, but it blocks deployment. | `app/Client/src/pages/*.jsx`, `gui_main.py` | Low | Use `import.meta.env.VITE_API_URL`. |
| S6 | `camera.js` runs `exec("python -m app.gui_main")` from an HTTP route. Not currently mounted, but if enabled, it is an unauthenticated process-spawn endpoint. | `app/Server/route/camera.js` | Medium | Delete or put behind auth. |
| S7 | Hardcoded CORS origin fallback, `express.json({limit:"10mb"})`, no rate limiting, no helmet. JWTs are returned to the client (storage location in the client was not audited). | `main.js` | Low | Fine for a student project. Mention in the README if you pitch security. |
| S8 | `trigram_mle.pkl` is a pickle, so loading an untrusted pickle executes code. | `app/models/` | Low | Remove. |

**Secrets to rotate (summary):** (1) the admin password `Su*********1$` for `su***********@gmail.com` wherever that account exists; (2) the `JWT_SECRET` only if it was ever the fallback `"secret"` or a weak value; (3) the MongoDB user password only if the Atlas URI was ever shared outside `.env`. Nothing in the repo proves any of the last two were exposed. History scrubbing (`git filter-repo`) is only needed for S1/S4.

---

## 4. Does it run?

### ML part: steps implied by the code
1. Install Python (3.9-3.11 is the safe range for `tensorflow==2.16.1` and `mediapipe`), then `pip install -r requirements.txt`.
2. Download the Kaggle ASL Alphabet dataset into `data/raw/asl_alphabet_train/asl_alphabet_train/`.
3. `python -m utils.extract_landmarks --dataset data/raw/asl_alphabet_train/asl_alphabet_train --output data/processed/landmarks_train.npz`
4. `python models/landmark_cnn.py --train data/processed/landmarks_train.npz`. It writes to `models/` and `metrics/`.
5. **Manually copy** `models/landmark_cnn.h5` and `models/landmark_classes.json` into `app/models/`. This step is undocumented.
6. Run the GUI: `python -m app.gui_main`, or the CLI `python -m app.main`.

### Web app
1. MongoDB running locally, or a `MONGO_URI` in `app/Server/.env` along with `JWT_SECRET`, `PORT`, `CLIENT_URL`. **There is no `.env.example`.**
2. `cd app/Server && npm install && node main.js` (ES modules, so `"type": "module"` is needed in package.json, **not verified**).
3. Optional: `node createAdmin.js` (creates the hardcoded admin, see S1).
4. `cd app/Client && npm install && npm run dev` (Vite, port 5173).

### What would likely break
| # | Problem | Evidence |
|---|---|---|
| R1 | **Missing Python deps in `requirements.txt`**: `tqdm`, `matplotlib`, `seaborn`, `Pillow`, `requests`, `transformers`, `torch` are all imported but not listed. It does list `pyttsx3`. Also unpinned: opencv-python, mediapipe, numpy, scikit-learn. | `extract_landmarks.py`, `landmark_cnn.py`, `gui_main.py`, `suggestions.py` |
| R2 | **Keras mismatch**: `gesture_cnn.py`, `recognizer.py` do `from keras import ...`, while `main.py` uses `tf.keras`. TF 2.16 ships Keras 3. Loading old `.h5` files from Keras 3 is lossy and can throw. `layers.Reshape(..., input_shape=)` is deprecated in Keras 3. | scripts |
| R3 | **`mediapipe` + `mp.solutions`**: the legacy `solutions` API is deprecated in recent mediapipe releases. Unpinned `mediapipe` can break extraction. | `extract_landmarks.py:18` |
| R4 | **Import path conflict**: `gui_main.py` does `from tts import speak` (relative to the script dir), but `camera.js` launches it as `python -m app.gui_main`. One of them fails depending on the working directory. `main.py` uses `from app.tts import speak`. | `gui_main.py:20-21`, `camera.js:5` |
| R5 | **Relative paths**: `app/main.py` loads `models/landmark_cnn.h5` from the CWD, which only exists at the repo root (and the `.h5` there is gitignored and absent). `landmark_cnn.py` writes to the CWD `models/`. | `main.py:7` |
| R6 | **`metrics/` and `models/` created in the CWD** by the training script; both gitignored. | `landmark_cnn.py:61-62` |
| R7 | **Web "Open Webcam" button hits `/api/open-webcam`**, which does not exist in `main.js`. | `Dashboard.jsx:239`, `main.js` |
| R8 | **The GUI needs the Node server running** (`localhost:5000`) for login and history. | `gui_main.py:266-379` |
| R9 | **First-run network**: `distilgpt2` downloads (~350 MB) from HuggingFace at import time. Offline demos fail. | `suggestions.py:6-7` |
| R10 | **Windows-specific**: `sys.stdout = io.TextIOWrapper(...)` hack, `pyttsx3` uses SAPI5, and `exec("python ...")` assumes `python` on PATH. These work on Windows, but not on Mac/Linux without changes. | `gui_main.py:15`, `camera.js` |
| R11 | The README documents none of the run steps. It has no install, run or dataset-download section. | README |
| R12 | The training script has no random seed for TF/NumPy, so results are not exactly reproducible. | `landmark_cnn.py` |

---

## 5. Recommendations (priority order)

### MUST fix: honesty and credibility (≈ 8-10 h total)
| # | Task | Hours |
|---|---|---|
| M1 | **README rewrite**: state that the CNN was trained from scratch on MediaPipe landmarks, name the Kaggle dataset with a link and credit, and state that MediaPipe and distilgpt2 are pretrained third-party components. Add a "Limitations" paragraph. | 1.5 |
| M2 | **Remove the overclaims** ("unseen data", "excellent generalization", "no signs of overfitting"). Report 99.15% as "random-split accuracy on the same dataset". | 0.5 |
| M3 | **A genuinely held-out evaluation**: (a) record ~10-20 minutes of your own webcam samples for all 26 letters (ideally 2-3 other people, different lighting), extract landmarks, and test the shipped model with zero training involvement; (b) at minimum also split the dataset by contiguous image-ID blocks (the Kaggle files are numbered sequentially from continuous video, so block splits reduce near-duplicate leakage). Report both numbers. Expect a large drop, and report it honestly. This is the single most valuable change for your application. | 4-5 |
| M4 | **Security cleanup**: remove the hardcoded admin password (S1), fail on missing JWT_SECRET (S2), add `.env.example`, rotate as per section 3b, check the 3 `.db` files and remove them. | 1.5 |
| M5 | **Remove 5,000+ tracked `node_modules` files** and the orphaned pickle, and fix `.gitignore`. | 0.5 |
| M6 | Save the confusion matrix and per-class report (the script already produces them) into `ml/results/` and cite them in the README. | 0.5 (+ re-run time) |

### SHOULD fix: reproducibility (≈ 8-10 h)
| # | Task | Hours |
|---|---|---|
| R-a | Restructure into `ml/` (extract, train, eval, `models/`, `results/`) and `web/` (Client, Server) and a thin `desktop/` (GUI). Remove the duplicate `models/` dirs. | 2 |
| R-b | **Pin all dependencies**: `requirements.txt` with exact versions (`pip freeze` from a working env), a Python version note, and `package.json` rebuilt with only direct deps. | 1.5 |
| R-c | One train script with seeds (`tf.random.set_seed`, `np.random.seed`) and a config. Save the final split indices and class counts. | 1.5 |
| R-d | One eval script: loads the model and a test `.npz`, writes accuracy, per-class report, confusion matrix and JSON. Reused by the robustness work. | 1.5 |
| R-e | Normalize landmarks (subtract the wrist, divide by hand size). This often improves out-of-distribution accuracy a lot. It requires retraining and should be reported as an ablation with the held-out numbers. | 2 |
| R-f | Fix the path and import bugs (R4, R5, R7), and add a run section to the README plus a Windows note. | 1.5 |
| R-g | Host the `.npz` and `.h5` as a GitHub Release asset with a checksum and a download script. | 0.5 |

### RESEARCH extension, if time allows (≈ 10-14 h): robustness for AI-security framing
Because the model takes **63-dim landmark vectors**, gradient attacks are straightforward and cheap, and **natural perturbations should be applied to landmarks as well as images**.
| # | Task | Hours |
|---|---|---|
| X1 | **FGSM and PGD** (L∞ and L2) on the landmark input, ε sweep in coordinate units (e.g. 0.005-0.05). Report **clean vs robust accuracy curves**. State the threat model: perturbing landmarks equals a corrupted detector output, not a physical attack on the camera. | 3-4 |
| X2 | **Natural perturbations**: Gaussian landmark jitter, 2D rotation (±15-45°), scale, translation, partial-occlusion (dropping finger landmarks), plus image-level blur/brightness/noise **before** MediaPipe to measure the full pipeline. | 3-4 |
| X3 | **Adversarial training** (PGD-AT) and/or augmentation with the above. Report the clean-vs-robust tradeoff table, with seeds and 3 runs for error bars. | 3-4 |
| X4 | Short write-up with 2-3 plots and an honest statement of the limits. Include a threat-model paragraph and the caveat that the MediaPipe stage is itself attackable (a pixel-space attack would be a stronger extension). | 1-2 |

### SKIP before Dec 3
- Replacing the CNN with a transformer/GCN or collecting a new large dataset.
- 2FA, mobile app, dark mode, reverse sign animation (all in "Potential Enhancements").
- Deploying the web app to the cloud, CI/CD, Docker (unless you have spare time).
- Rewriting the MERN frontend or the Tkinter GUI.
- Pixel-space attacks through MediaPipe (non-differentiable). Mention as future work only.
- Purging git history with `filter-repo`, unless the `.db` files turn out to hold real user data. If the repo is private, rotating credentials is enough.

**Suggested budget before Dec 3:** the Must group (≈ 9 h) + R-a, R-b, R-c, R-d (≈ 6.5 h) + X1-X2 (≈ 7 h) = **~22 h**. That leaves a buffer for adversarial training if time remains.

---

## 6. Default model or created by you?

**You created it.** The classifier is a custom Sequential Conv1D network defined in `models/landmark_cnn.py`, trained by that script, with its architecture dump, per-epoch history and test score committed alongside. It is not `keras.applications`, not a downloaded checkpoint and not a MediaPipe gesture-recognizer task file.

What is **default/pretrained** and not yours:
- **MediaPipe Hands** (palm detector + landmark model): Google's pretrained models, used as a frozen feature extractor. The README should call this out in the architecture diagram ("Gesture Classification (Built CNN Model from scratch...)" is accurate but incomplete).
- **distilgpt2**: unmodified HuggingFace weights, inference only.
- **Dataset**: third-party (Kaggle ASL Alphabet). Not collected by you.
- **pyttsx3**: the OS speech engine.

A fair one-line description for your SOP/CV: *"Trained a 1-D CNN from scratch on MediaPipe hand-landmark features from the ASL Alphabet dataset; integrated pretrained MediaPipe and distilgpt2 into a MERN + desktop application."* Only add a robust-accuracy claim after M3 is done.

---

## Corrections after deeper checking (2026-11-23)
- **R7 / camera.js was wrong in the original audit.** `POST /api/open-webcam` *does* exist, as an inline route in `main.js`, so the Dashboard button was not broken. `route/camera.js` was the dead file (never imported) and has been removed.
- **S2 is worse than stated.** `main.js` calls `dotenv.config()` *after* its ES-module imports run, so the old module-level `process.env.JWT_SECRET || "secret"` always evaluated to `"secret"` even when `.env` set a real secret. All admin JWTs issued by the old code were signed with `"secret"`. Fixed by reading the secret lazily and failing if it is unset.
- **Sample count verified:** `landmarks_train.npz` holds 73,500 rows over 29 classes. The `nothing` class has about 2 samples, so it is removed by the `min_samples=100` filter, leaving the 73,498 / 28 classes reported in the README.
- **`asl_dataset/` (digits + lowercase, 2,515 images, 5 signers) is a different dataset** from the training set. The original `raw/asl_alphabet_train` (87,000 images, 3,000 per class) is now available locally.
