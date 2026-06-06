import os
import stable_whisper
from typing import Dict, Any

# Global dict to cache loaded models in memory (key: (model_name, device, compute_type))
_models = {}

def get_model(model_name: str = "small", device: str = "cuda", compute_type: str = "float16"):
    """
    Lazy loader for the stable-ts model.
    Caches loaded models in memory for instant subsequent runs.
    """
    global _models
    key = (model_name, device, compute_type)
    if key not in _models:
        print(f"Loading stable-ts model '{model_name}' on '{device}' with '{compute_type}'...")
        # stable-ts wraps faster-whisper load_faster_whisper
        _models[key] = stable_whisper.load_faster_whisper(model_name, device=device, compute_type=compute_type)
    return _models[key]

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
        print(f"Failed to load model '{model_name}' on GPU ({e}). Falling back to CPU...")
        model = get_model(model_name=model_name, device="cpu", compute_type="int8")
        
    print(f"Starting transcription for: {file_path} using model: {model_name}")
    # stable-ts handles video files automatically by extracting audio via ffmpeg under the hood
    result = model.transcribe(file_path, language="ru") # default to Russian language
    
    # Convert result to dict structure containing segments and word-level timestamps
    return result.to_dict()
