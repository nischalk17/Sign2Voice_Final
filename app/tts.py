# app/tts.py
import pyttsx3

_engine = pyttsx3.init()        # initialise once
_engine.setProperty("rate", 180)  # words-per-minute
_engine.setProperty("volume", 1.0)

def speak(text: str):
    """Speak the given text aloud (non-blocking)."""
    if not text.strip():
        return
    _engine.say(text)
    _engine.runAndWait()
