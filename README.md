# Sign2Voice: Voice For All


# Project Goal:
-> To build a system that translates American Sign Language (ASL) hand gestures into spoken words or text in real-time.


# System Architecture:
[Camera Input (Webcam)]
        ↓
[Hand Detection + Landmark Extraction (MediaPipe)]
        ↓
[Gesture Classification (Built CNN Model from scratch to train on Landmarks)]
        ↓
[Text Output (Real-time transcription)]
        ↓
[Text-to-Speech Engine (Audio output)]


# Tech Stack and Libraries:
-> Python as the primary language.
-> OpenCV for webcam video capture and UI display.
-> MediaPipe for robust hand landmark detection.
-> TensorFlow 2.x / Keras for ML model training and inference.
-> NumPy for data manipulation.
-> scikit-learn for train/test splitting and evaluation.
-> Text-to-Speech (TTS): Python pyttsx3 or any other TTS library for audio output.
-> JSON for saving label mappings and model metadata.
-> Tkinter + OpenCV video for GUI
-> Local distilgpt2 (HuggingFace) for Smart word suggestions


# Dataset:
-> Used the ASL Alphabet Dataset
            Contained images organized by letter folders (A-Z, space, delete, nothing).
            Approximately 29 classes.
            Over 80,000+ images initially.


# Processing steps:
-> Used a landmark extraction script (extract_landmarks.py) with MediaPipe to convert raw images into 63-dimensional vectors (21 landmarks × 3 coordinates).
-> Filtered out images with low confidence or no hand detected.
-> Created .npz files (landmarks_train.npz, landmarks_test.npz) with landmark vectors and labels.


# Machine Learning Model:
-> Chose to train a Convolutional Neural Network (CNN) on extracted landmark vectors rather than raw images.


# Model Architecture:
-> Input reshape to (21, 3) i.e. CNN was trained on extracted 63-dimensional hand landmark vectors
-> Two Conv1D layers with ReLU activations.
-> Flatten layer(Data is converted from 2D to 1D)
-> Dense layer with dropout for regularization.
-> Output softmax layer for classification.


# Training Details:
-> 73,498 samples representing 28 different ASL classes (letters and signs)
-> 70-30 Train-test Split Ratio -> 51,448 training samples (70%) and 22,050 testing samples (30%)
-> Batch size: 128 samples per training step
-> Number of epochs: 20
-> Loss function: Sparse categorical cross-entropy
-> Optimizer: Adam


# Training Performance:
-> Initial epoch accuracy: 76.1% 
-> By epoch 5, Accuracy: 97.8%
-> By epoch 10, Accuracy: 98.7%
-> By epoch 15, Accuracy: 99.2%
-> By epoch 20, training accuracy improved to 99.2%, and validation accuracy reached 99.3%
-> Validation loss steadily decreased, indicating good learning and no signs of overfitting
-> Final test accuracy (on unseen data): 99.15%, demonstrating excellent generalization


# Current Functionalities: 
-> Webcam captures live hand gestures.
-> MediaPipe extracts 3D hand landmarks.
-> CNN model predicts the signed letter.
-> Text output is shown on the screen.
-> Control/Suggestion buttons.
-> Local distilgpt2 (HuggingFace) queried once every 5 s → top-3 next-token words for Smart Word Suggestions.
-> Model loading and prediction in real-time with reasonable speed.


# Potential Enhancements:
-> Responsive and Interactive full-stack website with Modern UI, Proper Frontend and Backend
-> User Authentication (Login/Register)
-> Light and Dark Mode and State Management Concept
-> CRUD Functionality- 
    Create: Auto-save detected speech, 
    Read: Display history, 
    Update: Allow editing of saved transcripts, 
    Delete: Remove unwanted records
-> More Robust TTS- Customize voices or languages
-> Improve Smart Word Suggestions
-> Reverse Module: Voice/Text to Sign Animation 