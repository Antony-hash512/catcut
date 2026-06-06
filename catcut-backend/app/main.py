import os
import shutil
import tempfile
from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks, Request
from fastapi.responses import StreamingResponse, JSONResponse, FileResponse, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import io

from app.core import transcribe_media
from app.ass_builder import build_ass

app = FastAPI(title="catcut API", description="API for transcribing audio and generating ASS subtitles")

# Setup CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class WordItem(BaseModel):
    word: str
    start: float
    end: float

class ASSGenerateRequest(BaseModel):
    words: List[WordItem]
    font_name: Optional[str] = "Montserrat"
    font_size: Optional[int] = 26
    active_color: Optional[str] = "#FFD700"
    inactive_color: Optional[str] = "#FFFFFF"
    style_mode: Optional[str] = "active_word"
    max_words_per_line: Optional[int] = 3
    max_gap_seconds: Optional[float] = 0.8

# Ensure temporary upload directory exists
TEMP_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "temp")
os.makedirs(TEMP_DIR, exist_ok=True)

class DownloadModelRequest(BaseModel):
    model_name: str

# In-memory status tracker for downloads
download_statuses = {}

def get_cached_models_list():
    """
    Checks the local HuggingFace cache directory for downloaded models.
    """
    cache_dir = os.path.expanduser("~/.cache/huggingface/hub")
    cached = set()
    if os.path.exists(cache_dir):
        try:
            for item in os.listdir(cache_dir):
                if item.startswith("models--Systran--faster-whisper-"):
                    size = item.replace("models--Systran--faster-whisper-", "")
                    cached.add(size)
        except Exception as e:
            print(f"Error scanning cache directory: {e}")
    return cached

def background_download_model(model_name: str):
    global download_statuses
    download_statuses[model_name] = "downloading"
    try:
        from huggingface_hub import snapshot_download
        repo_id = f"Systran/faster-whisper-{model_name}"
        print(f"Starting background download for {repo_id}...")
        snapshot_download(repo_id=repo_id)
        download_statuses[model_name] = "completed"
        print(f"Background download for {repo_id} completed.")
    except Exception as e:
        print(f"Failed background download for {model_name}: {e}")
        download_statuses[model_name] = f"failed: {str(e)}"

@app.get("/api/models")
async def api_get_models():
    """
    Returns lists of available Whisper models with their local download cache status.
    """
    supported_models = ["tiny", "base", "small", "medium", "large-v3"]
    cached_models = get_cached_models_list()
    
    models_status = []
    for m in supported_models:
        status = download_statuses.get(m, "idle")
        is_cached = m in cached_models
        
        # Override status if already cached
        if is_cached:
            status = "completed"
            
        models_status.append({
            "name": m,
            "cached": is_cached,
            "status": status
        })
    return JSONResponse(content=models_status)

@app.post("/api/models/download")
async def api_download_model(req: DownloadModelRequest, background_tasks: BackgroundTasks):
    """
    Triggers background downloading for a Whisper model from Hugging Face.
    """
    model_name = req.model_name
    supported_models = ["tiny", "base", "small", "medium", "large-v3"]
    if model_name not in supported_models:
        raise HTTPException(status_code=400, detail="Unsupported model size")
        
    cached_models = get_cached_models_list()
    if model_name in cached_models:
        return JSONResponse(content={"message": "Model is already cached", "status": "completed"})
        
    current_status = download_statuses.get(model_name, "idle")
    if current_status == "downloading":
        return JSONResponse(content={"message": "Download in progress", "status": "downloading"})
        
    # Launch background task
    background_tasks.add_task(background_download_model, model_name)
    return JSONResponse(content={"message": "Download started in background", "status": "downloading"})

@app.get("/api/models/download-status/{model_name}")
async def api_download_status(model_name: str):
    """
    Gets the current download progress status for a specific model size.
    """
    cached_models = get_cached_models_list()
    if model_name in cached_models:
        return JSONResponse(content={"status": "completed"})
        
    status = download_statuses.get(model_name, "idle")
    return JSONResponse(content={"status": status})

@app.post("/api/transcribe")
async def api_transcribe(file: UploadFile = File(...), model_name: str = "small"):
    """
    Accepts video or audio file, transcribes it, and returns word-level timestamps.
    """
    # Verify file is uploaded
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded")
        
    # Generate unique temporary file name
    file_ext = os.path.splitext(file.filename)[1]
    temp_file_path = os.path.join(TEMP_DIR, f"upload_{os.urandom(8).hex()}{file_ext}")
    
    try:
        # Save uploaded file to disk
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Transcribe with the user selected model
        result = transcribe_media(temp_file_path, model_name=model_name)
        return JSONResponse(content=result)
        
    except Exception as e:
        print(f"Error during transcription: {e}")
        raise HTTPException(status_code=500, detail=str(e))
        
    finally:
        # Clean up temporary file
        if os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
            except Exception as cleanup_err:
                print(f"Error cleaning up temp file {temp_file_path}: {cleanup_err}")

class TranscribePathRequest(BaseModel):
    file_path: str
    model_name: Optional[str] = "small"

@app.post("/api/transcribe-path")
async def api_transcribe_path(req: TranscribePathRequest):
    """
    Accepts an absolute file path directly from the desktop client, transcribes it, 
    and returns word-level timestamps without copying or uploading.
    """
    if not os.path.exists(req.file_path):
        raise HTTPException(status_code=400, detail=f"File not found on disk: {req.file_path}")
    
    try:
        result = transcribe_media(req.file_path, model_name=req.model_name)
        return JSONResponse(content=result)
    except Exception as e:
        print(f"Error during path transcription: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/stream-file")
async def api_stream_file(file_path: str, request: Request):
    """
    Streams a local file with full HTTP Range request support.
    Required for <video> seeking, scrubbing, and efficient playback.
    """
    import mimetypes

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"File not found: {file_path}")

    file_size = os.path.getsize(file_path)
    content_type, _ = mimetypes.guess_type(file_path)
    if content_type is None:
        content_type = "application/octet-stream"

    range_header = request.headers.get("range")

    if range_header:
        # Parse "bytes=START-END"
        range_spec = range_header.replace("bytes=", "")
        parts = range_spec.split("-")
        start = int(parts[0]) if parts[0] else 0
        end = int(parts[1]) if parts[1] else file_size - 1

        if start >= file_size:
            return Response(
                status_code=416,
                headers={"Content-Range": f"bytes */{file_size}"}
            )

        end = min(end, file_size - 1)
        content_length = end - start + 1

        def iter_range():
            with open(file_path, "rb") as f:
                f.seek(start)
                remaining = content_length
                while remaining > 0:
                    chunk = f.read(min(65536, remaining))
                    if not chunk:
                        break
                    remaining -= len(chunk)
                    yield chunk

        return StreamingResponse(
            iter_range(),
            status_code=206,
            media_type=content_type,
            headers={
                "Content-Range": f"bytes {start}-{end}/{file_size}",
                "Accept-Ranges": "bytes",
                "Content-Length": str(content_length),
            },
        )
    else:
        # Full file — still advertise Range support
        return FileResponse(
            file_path,
            media_type=content_type,
            headers={"Accept-Ranges": "bytes"},
        )

@app.post("/api/generate-ass")
async def api_generate_ass(request: ASSGenerateRequest):
    """
    Accepts list of words and style options, returns a downloadable ASS file.
    """
    try:
        # Convert Pydantic models to dicts for builder
        words_list = [w.model_dump() for w in request.words]
        
        # Build ASS string
        ass_content = build_ass(
            words_data=words_list,
            font_name=request.font_name,
            font_size=request.font_size,
            active_color_hex=request.active_color,
            inactive_color_hex=request.inactive_color,
            style_mode=request.style_mode,
            max_words_per_line=request.max_words_per_line,
            max_gap_seconds=request.max_gap_seconds
        )
        
        # Stream file response
        file_like = io.BytesIO(ass_content.encode('utf-8'))
        return StreamingResponse(
            file_like,
            media_type="text/plain",
            headers={"Content-Disposition": "attachment; filename=subtitles.ass"}
        )
        
    except Exception as e:
        print(f"Error generating ASS: {e}")
        raise HTTPException(status_code=500, detail=str(e))
