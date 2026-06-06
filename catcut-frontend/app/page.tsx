"use client";

import React, { useState, useRef, useEffect } from "react";

interface WordItem {
  word: string;
  start: number;
  end: number;
  id: string; // unique identifier
}

interface ModelItem {
  name: string;
  cached: boolean;
  status: "idle" | "downloading" | "completed" | string;
}

export default function Home() {
  const [step, setStep] = useState<"upload" | "loading" | "editor">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [words, setWords] = useState<WordItem[]>([]);
  const [isTranscribing, setIsTranscribing] = useState(false);

  // AI Models state
  const [modelsList, setModelsList] = useState<ModelItem[]>([]);
  const [selectedModel, setSelectedModel] = useState("small");

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

  // Tauri integration states
  const [isTauri, setIsTauri] = useState(false);
  const [showTauriWarning, setShowTauriWarning] = useState(true); // Show/hide the warning banner 
  const [localFilePath, setLocalFilePath] = useState<string | null>(null);

  // Clean up media URL on unmount
  useEffect(() => {
    return () => {
      if (mediaUrl) URL.revokeObjectURL(mediaUrl);
    };
  }, [mediaUrl]);

  // Prevent Next.js error overlays for video playback AbortErrors and other DOMExceptions
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason) {
        const name = event.reason.name || "";
        const message = event.reason.message || "";
        const isAbortError = name === "AbortError" || message.includes("The operation was aborted");
        const isVideoError = message.includes("play()") || message.includes("pause()") || message.includes("currentTime");
        
        if (isAbortError || isVideoError) {
          console.warn("Muffled unhandled rejection from video playback:", event.reason);
          event.preventDefault();
        }
      }
    };
    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    return () => {
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  // Removed getAssetUrl since asset:// protocol breaks Range requests on Linux

  // Check if we are running under Tauri and setup drag-and-drop listener
  useEffect(() => {
    let unlistenDragDrop: (() => void) | undefined;

    const setupTauri = async () => {
      if (typeof window !== "undefined" && ("__TAURI__" in window || "__TAURI_INTERNALS__" in window)) {
        setIsTauri(true);
        try {
          const { getCurrentWebviewWindow } = await import("@tauri-apps/api/webviewWindow");

          const appWindow = getCurrentWebviewWindow();
          const unlisten = await appWindow.onDragDropEvent((event) => {
            if (event.payload.type === "drop") {
              const paths = event.payload.paths;
              if (paths && paths.length > 0) {
                const filePath = paths[0];
                const filename = filePath.split(/[/\\]/).pop() || "local_media";

                setLocalFilePath(filePath);
                setFile({ name: filename, size: 0 } as any);
                setErrorMsg(null);
                setStep("upload");

                // Use the FastAPI endpoint which properly handles HTTP Range requests for video seeking
                const url = `http://localhost:8000/api/stream-file?file_path=${encodeURIComponent(filePath)}`;
                setMediaUrl(url);
              }
            }
          });
          unlistenDragDrop = unlisten;
        } catch (err) {
          console.error("Failed to initialize Tauri window/core APIs:", err);
        }
      }
    };

    setupTauri();

    return () => {
      if (unlistenDragDrop) {
        unlistenDragDrop();
      }
    };
  }, []);

  // Fetch models list on startup
  const fetchModels = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/models");
      if (response.ok) {
        const data = await response.json();
        setModelsList(data);
      }
    } catch (err) {
      console.error("Failed to fetch models list:", err);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  // Poll model download status if any model is currently downloading
  useEffect(() => {
    const hasDownloading = modelsList.some(m => m.status === "downloading");
    if (hasDownloading) {
      const timer = setInterval(() => {
        fetchModels();
      }, 2000);
      return () => clearInterval(timer);
    }
  }, [modelsList]);

  // Trigger model download
  const handleDownloadModel = async (modelName: string) => {
    // Optimistic local state update to trigger spinner
    setModelsList(prev => prev.map(m => m.name === modelName ? { ...m, status: "downloading" } : m));

    try {
      const response = await fetch("http://localhost:8000/api/models/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model_name: modelName }),
      });
      if (response.ok) {
        fetchModels();
      } else {
        alert("Не удалось запустить скачивание модели.");
        fetchModels();
      }
    } catch (err) {
      console.error(err);
      alert("Ошибка при связи с сервером.");
      fetchModels();
    }
  };

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
    setLocalFilePath(null); // Clear local file path since we are uploading a browser file
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

  // Open native Tauri open dialog if in desktop mode, else fall back to file input
  const handleUploadClick = async () => {
    if (isTauri) {
      try {
        const { open } = await import("@tauri-apps/plugin-dialog");

        const selected = await open({
          multiple: false,
          filters: [{
            name: "Video and Audio",
            extensions: ["mp4", "mkv", "mov", "avi", "mp3", "wav", "m4a", "flac"]
          }]
        });

        if (selected && typeof selected === "string") {
          const filePath = selected;
          const filename = filePath.split(/[/\\]/).pop() || "local_media";

          setLocalFilePath(filePath);
          setFile({ name: filename, size: 0 } as any);
          setErrorMsg(null);
          setStep("upload");

          // Use the FastAPI endpoint which properly handles HTTP Range requests for video seeking
          const url = `http://localhost:8000/api/stream-file?file_path=${encodeURIComponent(filePath)}`;
          setMediaUrl(url);
        }
      } catch (err) {
        console.error("Failed to open Tauri file dialog:", err);
      }
    } else {
      fileInputRef.current?.click();
    }
  };

  // Upload file and start transcription
  const startTranscription = async () => {
    if (!file && !localFilePath) return;

    setStep("loading");
    setIsTranscribing(true);
    setErrorMsg(null);

    try {
      let response;
      if (localFilePath) {
        // Direct local path transcription (bypassing file upload)
        response = await fetch("http://localhost:8000/api/transcribe-path", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            file_path: localFilePath,
            model_name: selectedModel,
          }),
        });
      } else {
        // Standard multipart file upload
        const formData = new FormData();
        formData.append("file", file!);
        response = await fetch(`http://localhost:8000/api/transcribe?model_name=${selectedModel}`, {
          method: "POST",
          body: formData,
        });
      }

      if (!response.ok) {
        const errorText = await response.json().catch(() => ({ detail: "Неизвестная ошибка" }));
        throw new Error(errorText.detail || "Ошибка при распознавании видео.");
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
      fetchModels(); // Refresh model states
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

  // Play a specific word segment
  const playWordSegment = async (word: WordItem) => {
    if (!mediaRef.current) return;

    try {
      // Catch synchronous DOMExceptions if video readyState is too low
      mediaRef.current.currentTime = word.start;

      const playPromise = mediaRef.current.play();
      if (playPromise !== undefined) {
        // Catch asynchronous AbortError from play() interrupting
        playPromise.catch((err) => {
          console.warn("Video playback async interrupted:", err);
        });
      }

      // Optionally stop playing after the word end
      const checkStop = () => {
        if (mediaRef.current && mediaRef.current.currentTime >= word.end) {
          mediaRef.current.pause();
          mediaRef.current.removeEventListener("timeupdate", checkStop);
        }
      };
      mediaRef.current.addEventListener("timeupdate", checkStop);
    } catch (err) {
      console.warn("Video playback sync error (DOMException):", err);
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

      const assContent = await response.text();
      const defaultFilename = `${file?.name ? file.name.split(".")[0] : "subtitles"}.ass`;

      if (isTauri) {
        // Native Tauri file save
        const { save } = await import("@tauri-apps/plugin-dialog");
        const { writeTextFile } = await import("@tauri-apps/plugin-fs");

        const savePath = await save({
          defaultPath: defaultFilename,
          filters: [{ name: "ASS Subtitles", extensions: ["ass"] }]
        });

        if (savePath) {
          await writeTextFile(savePath, assContent);
        }
      } else {
        // Browser fallback
        const blob = new Blob([assContent], { type: "text/plain;charset=utf-8" });
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = defaultFilename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
      }
    } catch (err: any) {
      console.error("ASS file saving error:", err);
      const details = typeof err === "string" ? err : (err?.message || JSON.stringify(err));
      alert(`Ошибка при генерации/сохранении .ass файла:\n${details || "Неизвестная ошибка"}`);
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

      {/* Tauri Warning Banner */}
      {isTauri && showTauriWarning && (
        <div style={{
          background: "rgba(245, 158, 11, 0.15)",
          border: "1px solid #f59e0b",
          borderRadius: "0.75rem",
          padding: "1rem",
          marginBottom: "2rem",
          color: "#fcd34d",
          fontSize: "0.95rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "1rem"
        }}>
          <div>
            ⚠️ <strong>Внимание:</strong> Вы используете десктопную версию (Tauri). Из-за особенностей движка WebKit2GTK воспроизведение видео в предпросмотре может работать нестабильно (лаги, артефакты). Мы рекомендуем пока использовать веб-версию для более плавной работы.
          </div>
          <button
            onClick={() => setShowTauriWarning(false)}
            style={{
              background: "none",
              border: "none",
              color: "#fcd34d",
              cursor: "pointer",
              fontSize: "1.5rem",
              lineHeight: 1,
              padding: "0.2rem 0.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: 0.8,
              transition: "opacity 0.2s"
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = "1"}
            onMouseLeave={(e) => e.currentTarget.style.opacity = "0.8"}
            title="Скрыть предупреждение"
          >
            ×
          </button>
        </div>
      )}

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
        <div className="step-container" style={{ display: "grid", gridTemplateColumns: file ? "1fr 350px" : "1fr", gap: "2rem" }}>

          {/* Main upload area */}
          <div>
            <div
              className="upload-card"
              style={{ maxWidth: "100%", margin: "0 auto" }}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={handleUploadClick}
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
                  border: "1px solid var(--border-color)",
                  maxWidth: "100%",
                  wordBreak: "break-all"
                }}>
                  📄 <strong>Выбран файл:</strong> {file.name} {file.size > 0 && `(${(file.size / (1024 * 1024)).toFixed(2)} MB)`}
                  {localFilePath && (
                    <div style={{ marginTop: "0.5rem", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                      <strong>Путь на диске:</strong> {localFilePath}
                    </div>
                  )}
                </div>
              )}
            </div>

            {file && (
              <div style={{ textAlign: "center", marginTop: "2rem" }}>
                <button
                  className="btn btn-primary"
                  onClick={startTranscription}
                  disabled={modelsList.find(m => m.name === selectedModel)?.cached === false}
                >
                  🚀 Начать распознавание речи
                </button>
                {modelsList.find(m => m.name === selectedModel)?.cached === false && (
                  <p style={{ color: "var(--error)", fontSize: "0.85rem", marginTop: "0.5rem" }}>
                    Выбранная модель не скачана. Скачайте её справа перед продолжением.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Sidebar: Model Selection and Downloader */}
          <aside style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-color)",
            borderRadius: "1.25rem",
            padding: "1.5rem",
            backdropFilter: "blur(12px)",
            display: "flex",
            flexDirection: "column",
            gap: "1.5rem"
          }}>
            <div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                🧠 Модель Whisper ИИ
              </h3>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
                Выберите размер модели. Большие модели точнее, но работают медленнее и требуют больше VRAM/ОЗУ.
              </p>
              <select
                className="form-control"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                style={{ fontWeight: 600 }}
              >
                <option value="tiny">Tiny (~75 MB) - Сверхбыстрая</option>
                <option value="base">Base (~140 MB) - Быстрая</option>
                <option value="small">Small (~460 MB) - Оптимально</option>
                <option value="medium">Medium (~1.5 GB) - Высокая точность</option>
                <option value="large-v3">Large-v3 (~3 GB) - Максимальная точность</option>
              </select>
            </div>

            <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "1rem" }}>
              <h4 style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "1rem", color: "var(--text-muted)" }}>
                Менеджер моделей на диске
              </h4>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {modelsList.map((m) => (
                  <div
                    key={m.name}
                    style={{
                      background: "rgba(10, 11, 14, 0.5)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "0.5rem",
                      padding: "0.75rem",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 700, fontSize: "0.9rem", textTransform: "capitalize" }}>
                        {m.name}
                      </span>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
                        {m.name === "tiny" && "75 MB"}
                        {m.name === "base" && "140 MB"}
                        {m.name === "small" && "460 MB"}
                        {m.name === "medium" && "1.5 GB"}
                        {m.name === "large-v3" && "3.0 GB"}
                      </div>
                    </div>

                    <div>
                      {m.cached ? (
                        <span style={{
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          color: "var(--success)",
                          background: "rgba(34, 197, 94, 0.12)",
                          padding: "0.2rem 0.5rem",
                          borderRadius: "0.25rem",
                          border: "1px solid rgba(34, 197, 94, 0.2)"
                        }}>
                          Скачана
                        </span>
                      ) : m.status === "downloading" ? (
                        <span style={{
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          color: "var(--primary)",
                          background: "rgba(168, 85, 247, 0.12)",
                          padding: "0.2rem 0.5rem",
                          borderRadius: "0.25rem",
                          border: "1px solid rgba(168, 85, 247, 0.2)",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.3rem"
                        }}>
                          <span className="spinner" style={{ width: "10px", height: "10px", borderWidth: "1.5px", margin: 0 }}></span>
                          Загрузка...
                        </span>
                      ) : (
                        <button
                          onClick={() => handleDownloadModel(m.name)}
                          style={{
                            background: "rgba(255, 255, 255, 0.05)",
                            border: "1px solid var(--border-color)",
                            color: "var(--text-main)",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            padding: "0.3rem 0.75rem",
                            borderRadius: "0.25rem",
                            cursor: "pointer"
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)"}
                          onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)"}
                        >
                          Скачать
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
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
              Это может занять некоторое время. Наша нейросеть запускает модель <strong>{selectedModel}</strong>, извлекает дорожку и выравнивает таймкоды каждого слова с помощью GPU ускорения.
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
