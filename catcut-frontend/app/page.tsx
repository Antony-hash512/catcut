"use client";

import React, { useState, useRef, useEffect } from "react";

interface WordItem {
  word: string;
  start: number;
  end: number;
  id: string; // unique identifier
}

export default function Home() {
  const [step, setStep] = useState<"upload" | "loading" | "editor">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [words, setWords] = useState<WordItem[]>([]);
  const [isTranscribing, setIsTranscribing] = useState(false);
  
  // Styling settings
  const [fontName, setFontName] = useState("Montserrat");
  const [fontSize, setFontSize] = useState(26);
  const [activeColor, setActiveColor] = useState("#FFD700"); // Yellow
  const [inactiveColor, setInactiveColor] = useState("#FFFFFF"); // White
  const [styleMode, setStyleMode] = useState<"active_word" | "karaoke">("active_word");
  const [maxWordsPerLine, setMaxWordsPerLine] = useState(3);
  const [maxGapSeconds, setMaxGapSeconds] = useState(0.8);

  const [currentTime, setCurrentTime] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const mediaRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Clean up media URL on unmount
  useEffect(() => {
    return () => {
      if (mediaUrl) URL.revokeObjectURL(mediaUrl);
    };
  }, [mediaUrl]);

  // Handle file drop/select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setupFile(e.target.files[0]);
    }
  };

  const setupFile = (selectedFile: File) => {
    setFile(selectedFile);
    const url = URL.createObjectURL(selectedFile);
    setMediaUrl(url);
    setErrorMsg(null);
    setStep("upload");
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setupFile(e.dataTransfer.files[0]);
    }
  };

  // Upload file and start transcription
  const startTranscription = async () => {
    if (!file) return;

    setStep("loading");
    setIsTranscribing(true);
    setErrorMsg(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("http://localhost:8000/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Ошибка при распознавании видео.");
      }

      const data = await response.json();
      
      // Map segments and words from stable-ts response structure
      const allWords: WordItem[] = [];
      let counter = 0;
      
      if (data.segments && Array.isArray(data.segments)) {
        data.segments.forEach((seg: any) => {
          if (seg.words && Array.isArray(seg.words)) {
            seg.words.forEach((w: any) => {
              allWords.push({
                word: w.word,
                start: w.start,
                end: w.end,
                id: `w-${counter++}`
              });
            });
          }
        });
      }
      
      setWords(allWords);
      setStep("editor");
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Не удалось связаться с сервером бэкенда. Убедитесь, что FastAPI сервер запущен на порту 8000.");
      setStep("upload");
    } finally {
      setIsTranscribing(false);
    }
  };

  // Handle word edit
  const updateWordText = (id: string, text: string) => {
    setWords(prev => prev.map(w => w.id === id ? { ...w, word: text } : w));
  };

  const updateWordTime = (id: string, field: "start" | "end", value: number) => {
    setWords(prev => prev.map(w => w.id === id ? { ...w, [field]: value } : w));
  };

  // Seek and play specific word
  const playWordSegment = (word: WordItem) => {
    if (mediaRef.current) {
      mediaRef.current.currentTime = word.start;
      mediaRef.current.play();
      // Optionally stop playing after the word end
      const checkStop = () => {
        if (mediaRef.current && mediaRef.current.currentTime >= word.end) {
          mediaRef.current.pause();
          mediaRef.current.removeEventListener("timeupdate", checkStop);
        }
      };
      mediaRef.current.addEventListener("timeupdate", checkStop);
    }
  };

  // Time update handler from player
  const handleTimeUpdate = () => {
    if (mediaRef.current) {
      setCurrentTime(mediaRef.current.currentTime);
    }
  };

  // Grouping logic for visualization on screen
  const getGroupedLines = () => {
    const lines: WordItem[][] = [];
    let currentLine: WordItem[] = [];

    words.forEach((word) => {
      if (currentLine.length === 0) {
        currentLine.push(word);
        return;
      }

      const prevWord = currentLine[currentLine.length - 1];
      const gap = word.start - prevWord.end;

      if (currentLine.length >= maxWordsPerLine || gap > maxGapSeconds) {
        lines.push(currentLine);
        currentLine = [word];
      } else {
        currentLine.push(word);
      }
    });

    if (currentLine.length > 0) {
      lines.push(currentLine);
    }

    return lines;
  };

  // Request generated ASS and trigger browser download
  const downloadAssFile = async () => {
    if (words.length === 0) return;

    try {
      const response = await fetch("http://localhost:8000/api/generate-ass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          words: words.map(({ word, start, end }) => ({ word, start, end })),
          font_name: fontName,
          font_size: fontSize,
          active_color: activeColor,
          inactive_color: inactiveColor,
          style_mode: styleMode,
          max_words_per_line: maxWordsPerLine,
          max_gap_seconds: maxGapSeconds,
        }),
      });

      if (!response.ok) throw new Error("Не удалось сгенерировать файл субтитров.");

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `${file?.name ? file.name.split(".")[0] : "subtitles"}.ass`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err: any) {
      alert(err.message || "Ошибка при генерации .ass файла.");
    }
  };

  return (
    <div className="container">
      {/* Header */}
      <header className="header">
        <div className="logo-container">
          <h1 className="logo-cat">cat<span className="logo-cut">cut</span></h1>
          <span className="logo-badge">AI MVP</span>
        </div>
        <div style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
          Генерация пословных субтитров
        </div>
      </header>

      {/* Error Message banner */}
      {errorMsg && (
        <div style={{
          background: "rgba(239, 68, 68, 0.15)",
          border: "1px solid var(--error)",
          borderRadius: "0.75rem",
          padding: "1rem",
          marginBottom: "2rem",
          color: "#fca5a5"
        }}>
          ⚠️ <strong>Ошибка:</strong> {errorMsg}
        </div>
      )}

      {/* STEP 1: UPLOAD SCREEN */}
      {step === "upload" && (
        <div className="step-container">
          <div 
            className="upload-card"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              style={{ display: "none" }}
              accept="video/*,audio/*"
            />
            <span className="upload-icon">🎬</span>
            <h2 className="upload-title">Перетащите видео или аудио файл</h2>
            <p className="upload-subtitle">Поддерживаются форматы MP4, MKV, MOV, MP3, WAV и др.</p>
            
            {file && (
              <div style={{
                background: "rgba(255, 255, 255, 0.05)",
                padding: "0.75rem 1.5rem",
                borderRadius: "0.5rem",
                display: "inline-block",
                marginBottom: "2rem",
                border: "1px solid var(--border-color)"
              }}>
                📄 <strong>Выбран файл:</strong> {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
              </div>
            )}
          </div>

          {file && (
            <div style={{ textAlign: "center", marginTop: "1rem" }}>
              <button className="btn btn-primary" onClick={startTranscription}>
                🚀 Начать распознавание речи
              </button>
            </div>
          )}
        </div>
      )}

      {/* STEP 2: LOADING SCREEN */}
      {step === "loading" && (
        <div className="step-container">
          <div className="loader-card">
            <div className="spinner"></div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>
              Распознаем речь...
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>
              Это может занять некоторое время. Наша нейросеть извлекает дорожку, выравнивает таймкоды каждого слова с помощью GPU ускорения.
            </p>
          </div>
        </div>
      )}

      {/* STEP 3: WORKSPACE / EDITOR */}
      {step === "editor" && (
        <div className="step-container editor-layout">
          
          {/* Left Column: Styles and Preview */}
          <aside className="sidebar-panel">
            <h3 className="panel-title">🎨 Настройки стиля ASS</h3>
            
            {/* Font Selection */}
            <div className="form-group">
              <label className="form-label">Шрифт субтитров</label>
              <select 
                className="form-control"
                value={fontName}
                onChange={(e) => setFontName(e.target.value)}
              >
                <option value="Montserrat">Montserrat (Уже в каталоге)</option>
                <option value="Inter">Inter (Уже в каталоге)</option>
                <option value="Oswald">Oswald (Уже в каталоге)</option>
                <option value="Roboto">Roboto (Уже в каталоге)</option>
                <option value="Fira Mono">Fira Mono (Уже в каталоге)</option>
                <option value="Noto Sans">Noto Sans (Уже в каталоге)</option>
                <option value="Arial">Arial</option>
                <option value="Impact">Impact (Классика мемов)</option>
              </select>
            </div>

            {/* Font Size */}
            <div className="form-group">
              <label className="form-label">Размер шрифта: {fontSize}</label>
              <input 
                type="range" 
                min="14" 
                max="50" 
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                style={{ width: "100%" }}
              />
            </div>

            {/* Subtitle Style Type */}
            <div className="form-group">
              <label className="form-label">Стиль анимации</label>
              <select 
                className="form-control"
                value={styleMode}
                onChange={(e) => setStyleMode(e.target.value as any)}
              >
                <option value="active_word">Active Word (Highlight текущего слова)</option>
                <option value="karaoke">Karaoke (Заполнение цветом в строке)</option>
              </select>
            </div>

            {/* Inactive Word Color */}
            <div className="form-group">
              <label className="form-label">Цвет обычного текста</label>
              <div className="color-picker-container">
                <div className="color-picker-preview" style={{ backgroundColor: inactiveColor }}>
                  <input 
                    type="color" 
                    className="color-picker-input"
                    value={inactiveColor}
                    onChange={(e) => setInactiveColor(e.target.value)}
                  />
                </div>
                <span className="color-hex-text">{inactiveColor.toUpperCase()}</span>
              </div>
            </div>

            {/* Active Word Highlight Color */}
            <div className="form-group">
              <label className="form-label">Цвет активного слова</label>
              <div className="color-picker-container">
                <div className="color-picker-preview" style={{ backgroundColor: activeColor }}>
                  <input 
                    type="color" 
                    className="color-picker-input"
                    value={activeColor}
                    onChange={(e) => setActiveColor(e.target.value)}
                  />
                </div>
                <span className="color-hex-text">{activeColor.toUpperCase()}</span>
              </div>
            </div>

            {/* Grouping parameters */}
            <div className="flex-inputs">
              <div className="form-group">
                <label className="form-label">Слов в строке: {maxWordsPerLine}</label>
                <input 
                  type="number" 
                  className="form-control"
                  min="1" 
                  max="10"
                  value={maxWordsPerLine}
                  onChange={(e) => setMaxWordsPerLine(Math.max(1, Number(e.target.value)))}
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Пауза-стык (сек): {maxGapSeconds}</label>
                <input 
                  type="number" 
                  className="form-control"
                  step="0.1"
                  min="0.2"
                  max="3.0"
                  value={maxGapSeconds}
                  onChange={(e) => setMaxGapSeconds(Math.max(0.1, Number(e.target.value)))}
                />
              </div>
            </div>

            {/* Media Preview Player */}
            {mediaUrl && (
              <div style={{ marginTop: "2rem" }}>
                <h4 className="form-label" style={{ marginBottom: "0.5rem" }}>Предпросмотр аудио/видео</h4>
                <video 
                  ref={mediaRef}
                  src={mediaUrl}
                  controls
                  onTimeUpdate={handleTimeUpdate}
                  style={{
                    width: "100%",
                    borderRadius: "0.75rem",
                    border: "1px solid var(--border-color)",
                    background: "#000"
                  }}
                />
              </div>
            )}
          </aside>

          {/* Right Column: Editable Words Timeline */}
          <main className="timeline-panel">
            <div className="timeline-header">
              <h3 style={{ fontSize: "1.25rem", fontWeight: 700 }}>✏️ Пословный редактор</h3>
              <button className="btn btn-primary" onClick={downloadAssFile} style={{ padding: "0.5rem 1.5rem", fontSize: "0.9rem" }}>
                💾 Скачать .ass файл
              </button>
            </div>

            <div className="timeline-scroll">
              {getGroupedLines().map((line, lineIdx) => {
                // Check if the current player playback position falls within this entire line
                const isLineActive = line.some(w => currentTime >= w.start && currentTime <= w.end);
                
                return (
                  <div 
                    key={`line-${lineIdx}`} 
                    className="word-group-row"
                    style={{
                      borderColor: isLineActive ? "var(--primary)" : "var(--border-color)",
                      boxShadow: isLineActive ? "0 0 10px rgba(168, 85, 247, 0.1)" : "none"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--primary)", fontWeight: 600 }}>
                        Строка {lineIdx + 1} ({line[0].start.toFixed(2)}s)
                      </span>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        {line.map(w => w.word.trim()).join(" ")}
                      </span>
                    </div>

                    <div className="word-cards-container">
                      {line.map((word) => {
                        const isWordActive = currentTime >= word.start && currentTime <= word.end;
                        
                        return (
                          <div 
                            key={word.id} 
                            className="word-card"
                            style={{
                              backgroundColor: isWordActive ? "rgba(168, 85, 247, 0.15)" : "rgba(20, 22, 28, 0.8)",
                              borderColor: isWordActive ? "var(--primary)" : "var(--border-color)"
                            }}
                          >
                            <input 
                              type="text" 
                              className="word-input"
                              value={word.word}
                              onChange={(e) => updateWordText(word.id, e.target.value)}
                              style={{
                                color: isWordActive ? "var(--accent)" : "var(--text-main)"
                              }}
                            />
                            
                            <div className="time-inputs">
                              <div>
                                <span>старт:</span>
                                <input 
                                  type="number" 
                                  className="time-input"
                                  step="0.05"
                                  value={parseFloat(word.start.toFixed(2))}
                                  onChange={(e) => updateWordTime(word.id, "start", parseFloat(e.target.value))}
                                />
                              </div>
                              <div>
                                <span>конец:</span>
                                <input 
                                  type="number" 
                                  className="time-input"
                                  step="0.05"
                                  value={parseFloat(word.end.toFixed(2))}
                                  onChange={(e) => updateWordTime(word.id, "end", parseFloat(e.target.value))}
                                />
                              </div>
                            </div>

                            <button className="play-word-btn" onClick={() => playWordSegment(word)}>
                              🔊 Прослушать
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </main>

        </div>
      )}
    </div>
  );
}
