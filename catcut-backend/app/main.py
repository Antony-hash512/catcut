import os
import shutil
import tempfile
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse, JSONResponse
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

@app.post("/api/transcribe")
async def api_transcribe(file: UploadFile = File(...)):
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
            
        # Transcribe
        result = transcribe_media(temp_file_path)
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
