import os
import stable_whisper
from typing import Dict, Any

# Global model variable to support lazy loading
_model = None

def get_model(model_name: str = "small", device: str = "cuda", compute_type: str = "float16"):
    """
    Lazy loader for the stable-ts model.
    Loads on CUDA by default if available.
    """
    global _model
    if _model is None:
        print(f"Loading stable-ts model '{model_name}' on '{device}' with '{compute_type}'...")
        # stable-ts wraps faster-whisper load_model
        _model = stable_whisper.load_faster_whisper(model_name, device=device, compute_type=compute_type)
    return _model

def transcribe_media(file_path: str, model_name: str = "small", device: str = "cuda") -> Dict[str, Any]:
    """
    Transcribes a media file (audio/video) and returns word-level timestamps.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")
    
    # Auto-fallback to CPU if CUDA is not available or if there is a CUDA error
    try:
        model = get_model(model_name=model_name, device=device)
    except Exception as e:
        print(f"Failed to load model on GPU ({e}). Falling back to CPU...")
        model = get_model(model_name=model_name, device="cpu", compute_type="int8")
        
    print(f"Starting transcription for: {file_path}")
    # stable-ts handles video files automatically by extracting audio via ffmpeg under the hood
    result = model.transcribe(file_path, language="ru") # default to Russian language
    
    # Convert result to dict structure containing segments and word-level timestamps
    return result.to_dict()
