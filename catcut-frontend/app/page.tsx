"use client";

import React, { useState, useRef, useEffect } from "react";

interface WordItem {
  word: string;
  start: number;
  end: number;
  id: string; // unique identifier
  deactivated?: boolean;
  is_newline?: boolean;
  line_auto_wrap?: boolean;
  mergedFrom?: WordItem[];
}

interface ModelItem {
  name: string;
  cached: boolean;
  status: "idle" | "downloading" | "completed" | string;
}

const hexToRgba = (hex: string, opacity: number) => {
  const cleanHex = hex.replace("#", "");
  const num = parseInt(cleanHex, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";


type LangType = "ru" | "en";

const DICT = {
  ru: {
    appDesc: "Генерация пословных субтитров",
    themeSystem: "💻 Системная",
    themeLight: "☀️ Светлая",
    themeDark: "🌙 Тёмная",
    themeLabel: "Тема оформления:",
    tauriWarning: "⚠️ <strong>Внимание:</strong> Вы используете десктопную версию (Tauri). Из-за особенностей движка WebKit2GTK воспроизведение видео в предпросмотре может работать нестабильно (лаги, артефакты). Мы рекомендуем пока использовать веб-версию для более плавной работы.",
    errorLabel: "⚠️ <strong>Ошибка:</strong>",
    uploadTitle: "Перетащите видео или аудио файл",
    uploadSubtitle: "Поддерживаются форматы MP4, MKV, MOV, MP3, WAV и др.",
    fileSelected: "📄 <strong>Выбран файл:</strong>",
    filePath: "Путь на диске:",
    startTranscription: "🚀 Начать распознавание речи",
    modelNotDownloaded: "Выбранная модель не скачана. Скачайте её справа перед продолжением.",
    modelTitle: "🧠 Модель Whisper ИИ",
    modelDesc: "Выберите размер модели. Большие модели точнее, но работают медленнее и требуют больше VRAM/ОЗУ.",
    modelTinyDesc: "Tiny (~75 MB) - Сверхбыстрая",
    modelBaseDesc: "Base (~140 MB) - Быстрая",
    modelSmallDesc: "Small (~460 MB) - Оптимально",
    modelMediumDesc: "Medium (~1.5 GB) - Высокая точность",
    modelLargeDesc: "Large-v3 (~3 GB) - Максимальная точность",
    modelManager: "Менеджер моделей на диске",
    downloaded: "Скачана",
    downloading: "Загрузка...",
    downloadBtn: "Скачать",
    loadingTitle: "Распознаем речь...",
    loadingDesc: "Это может занять некоторое время. Наша нейросеть запускает модель",
    loadingDesc2: ", извлекает дорожку и выравнивает таймкоды каждого слова с помощью GPU ускорения.",
    assStylesTitle: "🎨 Настройки стиля ASS",
    fontFamilyLabel: "Шрифт субтитров",
    fontInCatalog: "Уже в каталоге",
    fontClassic: "Классика мемов",
    fontSizeLabel: "Размер шрифта:",
    fontBoldLabel: "Жирное начертание (Bold)",
    verticalShiftLabel: "Смещение по вертикали:",
    textOpacityLabel: "Прозрачность текста:",
    animationStyleLabel: "Стиль анимации",
    animationActiveWord: "Active Word (Highlight текущего слова)",
    animationKaraoke: "Karaoke (Заполнение цветом в строке)",
    inactiveColorLabel: "Цвет обычного текста",
    activeColorLabel: "Цвет активного слова",
    outlineLabel: "Обводка текста",
    outlineWidthLabel: "Толщина обводки:",
    shadowLabel: "Тень текста",
    bgLabel: "Задний фон (плашка)",
    bgOpacityLabel: "Прозрачность фона:",
    wordsPerLineLabel: "Слов в строке:",
    gapLabel: "Пауза-стык (сек):",
    minWordDurationLabel: "Минимальная длительность слова (сек):",
    applyBtn: "Применить",
    applyTitle: "Применить минимальную длительность и скорректировать наложения для всех слов",
    previewTitle: "Предпросмотр аудио/видео",
    editorTitle: "✏️ Пословный редактор",
    downloadAssBtn: "💾 Скачать .ass файл",
    lineLabel: "Строка",
    addStartBtn: "+ в начало",
    addStartTitle: "Добавить слово в начало строки",
    addLineBelowBtn: "+ строку ниже",
    addLineBelowTitle: "Добавить новую строку ниже",
    listenTitle: "Прослушать",
    startNewLineTitle: "Начинать новую строку с этого слова",
    addAfterTitle: "Добавить слово после",
    activateTitle: "Активировать",
    deactivateTitle: "Деактивировать",
    deleteTitle: "Удалить",
    startLabel: "старт:",
    endLabel: "конец:",
    addLineEndBtn: "➕ Добавить строку в конец",
    addLineStartBtn: "➕ Добавить строку в начало",
    autoWrapLabel: "Авто-перенос слов",
    moveFirstWordPrev: "⬅️ Первое слово на пред.",
    moveLastWordNext: "Последнее слово на след. ➡️",
    mergeNextTitle: "Объединить со след. словом",
    splitWordTitle: "Разделить слово на исходные",
    newWordPlaceholder: "слово",
    newLinePlaceholder: "новая строка",
    errorModelDownload: "Не удалось запустить скачивание модели.",
    errorServerConn: "Ошибка при связи с сервером.",
    errorTranscription: "Ошибка при распознавании видео.",
    errorAssGeneration: "Не удалось сгенерировать файл субтитров.",
    errorUnknown: "Неизвестная ошибка",
    errorAssSave: "Ошибка при генерации/сохранении .ass файла:",
    errorFastApi: "Не удалось связаться с сервером бэкенда. Убедитесь, что FastAPI сервер запущен на порту 8000.",
    ffmpegHardsubInfo: "💡 Команда для наложения субтитров (хардсаб) на видео через FFmpeg:",
  },
  en: {
    appDesc: "Word-by-word subtitle generation",
    themeSystem: "💻 System",
    themeLight: "☀️ Light",
    themeDark: "🌙 Dark",
    themeLabel: "Theme:",
    tauriWarning: "⚠️ <strong>Warning:</strong> You are using the desktop version (Tauri). Due to WebKit2GTK engine specifics, video preview playback may be unstable (lags, artifacts). We recommend using the web version for smoother performance for now.",
    errorLabel: "⚠️ <strong>Error:</strong>",
    uploadTitle: "Drag & drop video or audio file",
    uploadSubtitle: "Supported formats: MP4, MKV, MOV, MP3, WAV, etc.",
    fileSelected: "📄 <strong>Selected file:</strong>",
    filePath: "Disk path:",
    startTranscription: "🚀 Start transcription",
    modelNotDownloaded: "The selected model is not downloaded. Download it on the right before proceeding.",
    modelTitle: "🧠 Whisper AI Model",
    modelDesc: "Select model size. Larger models are more accurate but slower and require more VRAM/RAM.",
    modelTinyDesc: "Tiny (~75 MB) - Super fast",
    modelBaseDesc: "Base (~140 MB) - Fast",
    modelSmallDesc: "Small (~460 MB) - Optimal",
    modelMediumDesc: "Medium (~1.5 GB) - High accuracy",
    modelLargeDesc: "Large-v3 (~3 GB) - Maximum accuracy",
    modelManager: "On-disk Model Manager",
    downloaded: "Downloaded",
    downloading: "Downloading...",
    downloadBtn: "Download",
    loadingTitle: "Transcribing speech...",
    loadingDesc: "This might take a while. Our neural network runs the",
    loadingDesc2: "model, extracts the track and aligns timecodes for each word using GPU acceleration.",
    assStylesTitle: "🎨 ASS Style Settings",
    fontFamilyLabel: "Subtitle Font",
    fontInCatalog: "Already in catalog",
    fontClassic: "Meme classic",
    fontSizeLabel: "Font Size:",
    fontBoldLabel: "Bold text",
    verticalShiftLabel: "Vertical Shift:",
    textOpacityLabel: "Text Opacity:",
    animationStyleLabel: "Animation Style",
    animationActiveWord: "Active Word (Highlight current word)",
    animationKaraoke: "Karaoke (Color fill by line)",
    inactiveColorLabel: "Inactive text color",
    activeColorLabel: "Active word color",
    outlineLabel: "Text Outline",
    outlineWidthLabel: "Outline Width:",
    shadowLabel: "Text Shadow",
    bgLabel: "Background Box",
    bgOpacityLabel: "Background Opacity:",
    wordsPerLineLabel: "Words per line:",
    gapLabel: "Pause gap (sec):",
    minWordDurationLabel: "Min word duration (sec):",
    applyBtn: "Apply",
    applyTitle: "Apply minimum duration and adjust overlaps for all words",
    previewTitle: "Audio/Video Preview",
    editorTitle: "✏️ Word-by-Word Editor",
    downloadAssBtn: "💾 Download .ass file",
    lineLabel: "Line",
    addStartBtn: "+ at start",
    addStartTitle: "Add word at the beginning of the line",
    addLineBelowBtn: "+ line below",
    addLineBelowTitle: "Add new line below",
    listenTitle: "Listen",
    startNewLineTitle: "Start new line from this word",
    addAfterTitle: "Add word after",
    activateTitle: "Activate",
    deactivateTitle: "Deactivate",
    deleteTitle: "Delete",
    startLabel: "start:",
    endLabel: "end:",
    addLineEndBtn: "➕ Add line at the end",
    addLineStartBtn: "➕ Add line at the beginning",
    autoWrapLabel: "Auto-wrap words",
    moveFirstWordPrev: "⬅️ First word to prev",
    moveLastWordNext: "Last word to next ➡️",
    mergeNextTitle: "Merge with next word",
    splitWordTitle: "Split word into original parts",
    newWordPlaceholder: "word",
    newLinePlaceholder: "new line",
    errorModelDownload: "Failed to start model download.",
    errorServerConn: "Error connecting to the server.",
    errorTranscription: "Error transcribing video.",
    errorAssGeneration: "Failed to generate subtitle file.",
    errorUnknown: "Unknown error",
    errorAssSave: "Error generating/saving .ass file:",
    errorFastApi: "Could not connect to backend server. Make sure the FastAPI server is running on port 8000.",
    ffmpegHardsubInfo: "💡 Command to hardsub subtitles onto a video using FFmpeg:",
  }
};


// Helper function to enforce minimum word duration and shift overlapping words
const adjustWordTimings = (wordsList: WordItem[], minDuration: number): WordItem[] => {
  // Deep copy to avoid mutating original objects
  const adjusted = wordsList.map(w => ({ ...w }));
  const n = adjusted.length;

  for (let i = 0; i < n; i++) {
    const duration = adjusted[i].end - adjusted[i].start;
    if (duration < minDuration) {
      adjusted[i].end = adjusted[i].start + minDuration;

      // Propagate potential overlaps to subsequent words
      for (let j = i + 1; j < n; j++) {
        if (adjusted[j - 1].end > adjusted[j].start) {
          const overlap = adjusted[j - 1].end - adjusted[j].start;
          adjusted[j].start += overlap;
          adjusted[j].end += overlap;
        } else {
          break;
        }
      }
    }
  }

  // Format numbers to 2 decimal places to keep them clean
  return adjusted.map(w => ({
    ...w,
    start: Number(w.start.toFixed(2)),
    end: Number(w.end.toFixed(2))
  }));
};

const applyStaticSegmentation = (wordsList: WordItem[], maxWords: number, maxGap: number): WordItem[] => {
  if (wordsList.length === 0) return [];

  const updated = wordsList.map((w, idx) => {
    return {
      ...w,
      is_newline: idx === 0 ? true : w.is_newline,
      line_auto_wrap: idx === 0 ? false : w.line_auto_wrap
    };
  });

  let currentLineCount = 0;
  let prevWord: WordItem | null = null;

  for (let i = 0; i < updated.length; i++) {
    const word = updated[i];

    if (i === 0) {
      currentLineCount = 1;
      prevWord = word;
      word.is_newline = true;
      word.line_auto_wrap = false;
      continue;
    }

    const gap = word.start - prevWord!.end;

    if (currentLineCount >= maxWords || gap > maxGap) {
      word.is_newline = true;
      word.line_auto_wrap = false;
      currentLineCount = 1;
    } else {
      word.is_newline = false;
      word.line_auto_wrap = undefined;
      currentLineCount++;
    }

    prevWord = word;
  }

  return updated;
};

export default function Home() {
  const [step, setStep] = useState<"upload" | "loading" | "editor">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [words, setWords] = useState<WordItem[]>([]);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isTauri, setIsTauri] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");
  const [lang, setLang] = useState<LangType>("en");
  const [copied, setCopied] = useState(false);

  const getFfmpegCommand = () => {
    const inputName = file?.name || "video.mp4";
    const escapeShellArg = (arg: string) => `'${arg.replace(/'/g, "'\\''")}'`;
    let baseName = inputName;
    let ext = ".mp4";
    const lastDot = inputName.lastIndexOf('.');
    if (lastDot > 0) {
      baseName = inputName.substring(0, lastDot);
      ext = inputName.substring(lastDot);
    }
    const outName = `${baseName}_hardsubbed${ext}`;
    const assName = `${baseName}.ass`;
    return `ffmpeg -i ${escapeShellArg(inputName)} -vf "ass=${escapeShellArg(assName)}" -c:a copy ${escapeShellArg(outName)}`;
  };

  const handleCopyCommand = async () => {
    try {
      await navigator.clipboard.writeText(getFfmpegCommand());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  // Load theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | "system" | null;
    if (savedTheme) {
      setTheme(savedTheme);
    }
    const savedLang = localStorage.getItem("lang") as LangType | null;
    if (savedLang) {
      setLang(savedLang);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("lang", lang);
  }, [lang]);

  // Apply theme and setup media listeners
  useEffect(() => {
    localStorage.setItem("theme", theme);

    let active = true;

    const applyTheme = async (themeName: "light" | "dark" | "system") => {
      const root = document.documentElement;
      if (themeName === "system") {
        let systemTheme: "light" | "dark" = "dark";
        if (isTauri) {
          try {
            const { getCurrentWebviewWindow } = await import("@tauri-apps/api/webviewWindow");
            const tauriTheme = await getCurrentWebviewWindow().theme();
            if (active) {
              if (tauriTheme === "light" || tauriTheme === "dark") {
                systemTheme = tauriTheme;
              } else {
                // Default to dark for Linux Tauri if OS theme is not detected (returns null)
                systemTheme = "dark";
              }
            }
          } catch (err) {
            console.error("Failed to get Tauri window theme:", err);
            systemTheme = "dark";
          }
        } else {
          systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
        }
        if (active) {
          root.setAttribute("data-theme", systemTheme);
        }
      } else {
        root.setAttribute("data-theme", themeName);
      }
    };

    applyTheme(theme);

    let unlistenTauriTheme: (() => void) | undefined;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleWebSystemThemeChange = () => {
      applyTheme("system");
    };

    if (theme === "system") {
      // Always listen to mediaQuery change event as a fallback
      mediaQuery.addEventListener("change", handleWebSystemThemeChange);

      if (isTauri) {
        import("@tauri-apps/api/webviewWindow").then(({ getCurrentWebviewWindow }) => {
          if (!active) return;
          getCurrentWebviewWindow().onThemeChanged(({ payload: newTauriTheme }) => {
            if (!active) return;
            if (newTauriTheme === "light" || newTauriTheme === "dark") {
              document.documentElement.setAttribute("data-theme", newTauriTheme);
            } else {
              // Fallback to media query if OS payload is null/undetermined
              const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
              document.documentElement.setAttribute("data-theme", systemTheme);
            }
          }).then(unlisten => {
            unlistenTauriTheme = unlisten;
          });
        }).catch(err => {
          console.error("Failed to load Tauri webviewWindow API for theme:", err);
        });
      }
    }

    return () => {
      active = false;
      if (unlistenTauriTheme) {
        unlistenTauriTheme();
      }
      mediaQuery.removeEventListener("change", handleWebSystemThemeChange);
    };
  }, [theme, isTauri]);

  // AI Models state
  const [modelsList, setModelsList] = useState<ModelItem[]>([]);
  const [selectedModel, setSelectedModel] = useState("large-v3");

  // Styling settings
  const [fontName, setFontName] = useState("Montserrat");
  const [fontSize, setFontSize] = useState(56);
  const [fontBold, setFontBold] = useState(true);
  const [verticalShift, setVerticalShift] = useState(0);
  const [bgOpacity, setBgOpacity] = useState(80);
  const [textOpacity, setTextOpacity] = useState(80);
  const [outlineColor, setOutlineColor] = useState("#000000");
  const [outlineWidth, setOutlineWidth] = useState(8);
  const [shadowColor, setShadowColor] = useState("#000000");
  const [bgColor, setBgColor] = useState("#000000");
  const [outlineEnabled, setOutlineEnabled] = useState(true);
  const [shadowEnabled, setShadowEnabled] = useState(false);
  const [bgEnabled, setBgEnabled] = useState(false);
  const [activeColor, setActiveColor] = useState("#FFD700"); // Yellow
  const [inactiveColor, setInactiveColor] = useState("#FFFFFF"); // White
  const [styleMode, setStyleMode] = useState<"active_word" | "karaoke">("active_word");
  const [maxWordsPerLine, setMaxWordsPerLine] = useState(1);
  const [maxGapSeconds, setMaxGapSeconds] = useState(0.8);
  const [minWordDuration, setMinWordDuration] = useState(0.25);

  const [currentTime, setCurrentTime] = useState(0);
  const [videoAspectRatio, setVideoAspectRatio] = useState<string>("16/9");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const mediaRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Tauri integration states
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
                const url = `${API_URL}/api/stream-file?file_path=${encodeURIComponent(filePath)}`;
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
      const response = await fetch(`${API_URL}/api/models`);
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
      const response = await fetch(`${API_URL}/api/models/download`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model_name: modelName }),
      });
      if (response.ok) {
        fetchModels();
      } else {
        alert(DICT[lang].errorModelDownload);
        fetchModels();
      }
    } catch (err) {
      console.error(err);
      alert(DICT[lang].errorServerConn);
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
          const url = `${API_URL}/api/stream-file?file_path=${encodeURIComponent(filePath)}`;
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
        response = await fetch(`${API_URL}/api/transcribe-path`, {
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
        response = await fetch(`${API_URL}/api/transcribe?model_name=${selectedModel}`, {
          method: "POST",
          body: formData,
        });
      }

      if (!response.ok) {
        const errorText = await response.json().catch(() => ({ detail: DICT[lang].errorUnknown }));
        throw new Error(errorText.detail || DICT[lang].errorTranscription);
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

      const adjustedWords = adjustWordTimings(allWords, minWordDuration);
      const segmented = applyStaticSegmentation(adjustedWords, maxWordsPerLine, maxGapSeconds);
      setWords(segmented);
      setStep("editor");
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || DICT[lang].errorFastApi);
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

  const deleteWord = (id: string) => {
    setWords(prev => {
      const idx = prev.findIndex(w => w.id === id);
      if (idx === -1) return prev;

      const target = prev[idx];
      const nextWord = idx < prev.length - 1 ? prev[idx + 1] : null;

      const updated = prev.filter(w => w.id !== id);
      if (nextWord && (target.is_newline || target.line_auto_wrap !== undefined)) {
        return updated.map(w => {
          if (w.id === nextWord.id) {
            return {
              ...w,
              is_newline: w.is_newline || target.is_newline,
              line_auto_wrap: w.line_auto_wrap !== undefined ? w.line_auto_wrap : target.line_auto_wrap,
            };
          }
          return w;
        });
      }
      return updated;
    });
  };

  const toggleWordActive = (id: string) => {
    setWords(prev => prev.map(w => w.id === id ? { ...w, deactivated: !w.deactivated } : w));
  };

  const addWord = (targetId: string, position: "before" | "after") => {
    setWords(prev => {
      const idx = prev.findIndex(w => w.id === targetId);
      if (idx === -1) return prev;

      const targetWord = prev[idx];
      let newStart = targetWord.end;
      let newEnd = targetWord.end + 0.3;

      if (position === "before") {
        const prevWord = idx > 0 ? prev[idx - 1] : null;
        if (prevWord) {
          const gap = targetWord.start - prevWord.end;
          newStart = prevWord.end;
          newEnd = prevWord.end + (gap > 0 ? Math.min(0.3, gap) : 0.3);
        } else {
          newStart = Math.max(0, targetWord.start - 0.5);
          newEnd = targetWord.start;
        }
      } else {
        const nextWord = idx < prev.length - 1 ? prev[idx + 1] : null;
        if (nextWord) {
          const gap = nextWord.start - targetWord.end;
          newStart = targetWord.end;
          newEnd = targetWord.end + (gap > 0 ? Math.min(0.3, gap) : 0.3);
        } else {
          newStart = targetWord.end;
          newEnd = targetWord.end + 0.5;
        }
      }

      const newWord: WordItem = {
        word: DICT[lang].newWordPlaceholder,
        start: Number(newStart.toFixed(2)),
        end: Number(newEnd.toFixed(2)),
        id: `w-new-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        deactivated: false,
        is_newline: position === "before" ? targetWord.is_newline : false,
        line_auto_wrap: position === "before" ? targetWord.line_auto_wrap : undefined,
      };

      const updated = [...prev];
      if (position === "before") {
        if (targetWord.is_newline) {
          updated[idx] = {
            ...targetWord,
            is_newline: false,
            line_auto_wrap: undefined
          };
        }
        updated.splice(idx, 0, newWord);
      } else {
        updated.splice(idx + 1, 0, newWord);
      }
      return updated;
    });
  };

  const addLine = (targetId: string | null) => {
    setWords(prev => {
      let newStart = 0;
      let newEnd = 0.5;

      if (targetId) {
        const idx = prev.findIndex(w => w.id === targetId);
        if (idx !== -1) {
          const targetWord = prev[idx];
          newStart = targetWord.end;
          newEnd = targetWord.end + 0.5;
        }
      } else if (prev.length > 0) {
        const lastWord = prev[prev.length - 1];
        newStart = lastWord.end;
        newEnd = lastWord.end + 0.5;
      }

      const newWord: WordItem = {
        word: DICT[lang].newLinePlaceholder,
        start: Number(newStart.toFixed(2)),
        end: Number(newEnd.toFixed(2)),
        id: `w-newline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        deactivated: false,
        is_newline: true
      };

      if (!targetId) {
        return [...prev, newWord];
      }

      const idx = prev.findIndex(w => w.id === targetId);
      const updated = [...prev];
      updated.splice(idx + 1, 0, newWord);
      return updated;
    });
  };

  const addLineToStart = () => {
    setWords(prev => {
      let newStart = 0;
      let newEnd = 0.5;
      if (prev.length > 0) {
        newStart = Math.max(0, prev[0].start - 0.5);
        newEnd = prev[0].start;
      }
      const newWord: WordItem = {
        word: DICT[lang].newLinePlaceholder,
        start: Number(newStart.toFixed(2)),
        end: Number(newEnd.toFixed(2)),
        id: `w-newline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        deactivated: false,
        is_newline: true,
        line_auto_wrap: false,
      };
      if (prev.length > 0) {
        const updatedPrev = [...prev];
        updatedPrev[0] = { ...updatedPrev[0], is_newline: true };
        return [newWord, ...updatedPrev];
      }
      return [newWord];
    });
  };

  const toggleLineAutoWrap = (lineIdx: number) => {
    const lines = getGroupedLines();
    if (lineIdx < 0 || lineIdx >= lines.length) return;
    const firstWord = lines[lineIdx][0];
    const isCurrentlyAutoWrap = firstWord.line_auto_wrap !== false;

    setWords(prev => {
      const firstWordIdx = prev.findIndex(w => w.id === firstWord.id);
      if (firstWordIdx === -1) return prev;

      let updated = prev.map((w, idx) => {
        if (idx === firstWordIdx) {
          return { ...w, line_auto_wrap: !isCurrentlyAutoWrap };
        }
        return w;
      });

      // If we are disabling auto-wrap (turning it off), we want to preserve the boundary with the next line
      // by making the first word of the NEXT line start a new line explicitly (is_newline: true).
      if (isCurrentlyAutoWrap) { // turning OFF
        const nextLine = lines[lineIdx + 1];
        if (nextLine && nextLine.length > 0) {
          const nextLineFirstWord = nextLine[0];
          updated = updated.map(w => {
            if (w.id === nextLineFirstWord.id) {
              return { ...w, is_newline: true };
            }
            return w;
          });
        }
      }

      return updated;
    });
  };

  const moveFirstWordToPrevLine = (lineIdx: number) => {
    const lines = getGroupedLines();
    if (lineIdx <= 0) return;
    const prevLine = lines[lineIdx - 1];
    const currentLine = lines[lineIdx];
    if (currentLine.length === 0) return;

    const wordToMove = currentLine[0];
    const nextWord = currentLine.length > 1 ? currentLine[1] : null;
    const prevLineFirstWord = prevLine[0];

    setWords(prev => prev.map(w => {
      if (w.id === wordToMove.id) return { ...w, is_newline: false };
      if (nextWord && w.id === nextWord.id) return { ...w, is_newline: true };
      if (w.id === prevLineFirstWord.id) return { ...w, line_auto_wrap: false };
      return w;
    }));
  };

  const moveLastWordToNextLine = (lineIdx: number) => {
    const lines = getGroupedLines();
    if (lineIdx >= lines.length - 1) return;
    const currentLine = lines[lineIdx];
    if (currentLine.length === 0) return;

    const wordToMove = currentLine[currentLine.length - 1];
    const nextLineFirstWord = lines[lineIdx + 1][0];

    setWords(prev => prev.map(w => {
      if (w.id === wordToMove.id) return { ...w, is_newline: true, line_auto_wrap: false };
      if (w.id === nextLineFirstWord.id) return { ...w, is_newline: false };
      return w;
    }));
  };

  const mergeWithNext = (wordId: string) => {
    setWords(prev => {
      const idx = prev.findIndex(w => w.id === wordId);
      if (idx === -1 || idx === prev.length - 1) return prev;
      const current = prev[idx];
      const next = prev[idx + 1];
      const nextText = next.word.trim();
      const hasHyphen = nextText.startsWith('-');

      const currentParts = current.mergedFrom || [current];
      const nextParts = next.mergedFrom || [next];
      const mergedFrom = [...currentParts, ...nextParts];

      const mergedWord: WordItem = {
        ...current,
        word: current.word.trim() + (hasHyphen ? '' : ' ') + nextText,
        end: next.end,
        mergedFrom,
      };
      const updated = [...prev];
      updated.splice(idx, 2, mergedWord);
      return updated;
    });
  };

  const splitWord = (wordId: string) => {
    setWords(prev => {
      const idx = prev.findIndex(w => w.id === wordId);
      if (idx === -1) return prev;
      const current = prev[idx];
      if (!current.mergedFrom || current.mergedFrom.length === 0) return prev;

      const restored = current.mergedFrom.map((w, subIdx) => {
        return {
          ...w,
          deactivated: current.deactivated,
          is_newline: subIdx === 0 ? current.is_newline : false,
          ...(subIdx === 0 ? { line_auto_wrap: current.line_auto_wrap } : {})
        };
      });

      const updated = [...prev];
      updated.splice(idx, 1, ...restored);
      return updated;
    });
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

  const getActiveLine = (): WordItem[] | null => {
    const lines = getGroupedLines();
    for (const line of lines) {
      if (line.length === 0) continue;
      const activeWords = line.filter(w => !w.deactivated);
      if (activeWords.length === 0) continue;

      const lineStart = activeWords[0].start;
      const lineEnd = activeWords[activeWords.length - 1].end;

      if (currentTime >= lineStart && currentTime <= lineEnd) {
        return line;
      }
    }
    return null;
  };

  const renderCSSSubtitles = () => {
    const activeLine = getActiveLine();
    if (!activeLine) return null;

    const visibleWords = activeLine.filter(w => !w.deactivated);
    if (visibleWords.length === 0) return null;

    const shadows: string[] = [];
    if (outlineEnabled) {
      for (let t = 1; t <= outlineWidth; t++) {
        shadows.push(
          `-${t}px -${t}px 0 ${outlineColor}`,
          `${t}px -${t}px 0 ${outlineColor}`,
          `-${t}px ${t}px 0 ${outlineColor}`,
          `${t}px ${t}px 0 ${outlineColor}`,
          `0px -${t}px 0 ${outlineColor}`,
          `0px ${t}px 0 ${outlineColor}`,
          `-${t}px 0px 0 ${outlineColor}`,
          `${t}px 0px 0 ${outlineColor}`
        );
      }
    }
    if (shadowEnabled) {
      shadows.push(`3px 3px 6px ${shadowColor}`);
    }
    const textShadowStyle = shadows.length > 0 ? shadows.join(", ") : "none";

    const topPosition = `calc(50% + ${(verticalShift / 1080) * 100}%)`;

    return (
      <div
        style={{
          position: "absolute",
          top: topPosition,
          left: "50%",
          transform: "translate(-50%, -50%)",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "center",
          width: "90%",
          textAlign: "center",
          pointerEvents: "none",
          padding: "0.25rem 0.75rem",
          borderRadius: "0.5rem",
          backgroundColor: bgEnabled ? hexToRgba(bgColor, bgOpacity / 100) : "transparent",
          fontFamily: fontName || "sans-serif",
          fontSize: `calc(${fontSize} / 1080 * 100cqh)`,
          fontWeight: fontBold ? 800 : 400,
          lineHeight: 1.2,
          transition: "all 0.1s ease",
          zIndex: 20
        }}
      >
        {visibleWords.map((word) => {
          let isWordActive = false;
          if (styleMode === "active_word") {
            isWordActive = currentTime >= word.start && currentTime <= word.end;
          } else if (styleMode === "karaoke") {
            isWordActive = currentTime >= word.start;
          }

          const baseColor = isWordActive ? activeColor : inactiveColor;
          const displayColor = hexToRgba(baseColor, textOpacity / 100);

          return (
            <span
              key={word.id}
              style={{
                color: displayColor,
                textShadow: textShadowStyle,
                margin: "0 0.25em",
                whiteSpace: "nowrap",
                transition: "color 0.1s ease",
              }}
            >
              {word.word}
            </span>
          );
        })}
      </div>
    );
  };

  // Grouping logic for visualization on screen
  const getGroupedLines = () => {
    const lines: WordItem[][] = [];
    let currentLine: WordItem[] = [];
    let currentLineAutoWrap = true;

    words.forEach((word) => {
      if (currentLine.length === 0) {
        currentLine.push(word);
        currentLineAutoWrap = word.line_auto_wrap !== false;
        return;
      }

      const prevWord = currentLine[currentLine.length - 1];
      const gap = word.start - prevWord.end;

      if (word.is_newline) {
        lines.push(currentLine);
        currentLine = [word];
        currentLineAutoWrap = word.line_auto_wrap !== false;
        return;
      }

      if (currentLineAutoWrap) {
        if (currentLine.length >= maxWordsPerLine || gap > maxGapSeconds) {
          lines.push(currentLine);
          currentLine = [word];
          currentLineAutoWrap = word.line_auto_wrap !== false;
          return;
        }
      }

      currentLine.push(word);
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
      const response = await fetch(`${API_URL}/api/generate-ass`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          words: words.filter(w => !w.deactivated).map(({ word, start, end, is_newline }) => ({ word, start, end, is_newline })),
          font_name: fontName,
          font_size: fontSize,
          active_color: activeColor,
          inactive_color: inactiveColor,
          style_mode: styleMode,
          max_words_per_line: maxWordsPerLine,
          max_gap_seconds: maxGapSeconds,
          vertical_shift: verticalShift,
          bg_opacity: bgOpacity,
          text_opacity: textOpacity,
          font_bold: fontBold,
          outline_color: outlineColor,
          outline_width: outlineWidth,
          shadow_color: shadowColor,
          bg_color: bgColor,
          outline_enabled: outlineEnabled,
          shadow_enabled: shadowEnabled,
          bg_enabled: bgEnabled,
        }),
      });

      if (!response.ok) throw new Error(DICT[lang].errorAssGeneration);

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
      alert(`${DICT[lang].errorAssSave}\n${details || DICT[lang].errorUnknown}`);
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

        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
          <div style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
            {DICT[lang].appDesc}
          </div>

          <div className="theme-toggle-container" style={{ display: "flex", gap: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <img 
                src="/translate.svg" 
                width={20} 
                height={20} 
                alt="Translate" 
                style={{ marginRight: "0.4rem", opacity: 0.8 }} 
                title="Translate icon by Google Material Symbols"
              />
              <span className="theme-label" style={{ marginRight: "0.5rem" }}>Language:</span>
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value as LangType)}
                className="theme-select"
              >
                <option value="ru">Русский</option>
                <option value="en">English</option>
              </select>
            </div>
            <div>
              <span className="theme-label" style={{ marginRight: "0.5rem" }}>{DICT[lang].themeLabel}</span>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as any)}
                className="theme-select"
              >
                <option value="system">{DICT[lang].themeSystem}</option>
                <option value="light">{DICT[lang].themeLight}</option>
                <option value="dark">{DICT[lang].themeDark}</option>
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* Tauri Warning Banner */}
      {isTauri && showTauriWarning && (
        <div style={{
          background: "var(--bg-warning)",
          border: "1px solid var(--border-warning)",
          borderRadius: "0.75rem",
          padding: "1rem",
          marginBottom: "2rem",
          color: "var(--text-warning)",
          fontSize: "0.95rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "1rem"
        }}>
          <div dangerouslySetInnerHTML={{ __html: DICT[lang].tauriWarning }} />
          <button
            onClick={() => setShowTauriWarning(false)}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-warning)",
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
          background: "var(--bg-error-banner)",
          border: "1px solid var(--error)",
          borderRadius: "0.75rem",
          padding: "1rem",
          marginBottom: "2rem",
          color: "var(--text-error-banner)"
        }}>
          <span dangerouslySetInnerHTML={{ __html: DICT[lang].errorLabel }} /> {errorMsg}
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
              <h2 className="upload-title">{DICT[lang].uploadTitle}</h2>
              <p className="upload-subtitle">{DICT[lang].uploadSubtitle}</p>

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
                  <span dangerouslySetInnerHTML={{ __html: DICT[lang].fileSelected }} /> {file.name} {file.size > 0 && `(${(file.size / (1024 * 1024)).toFixed(2)} MB)`}
                  {localFilePath && (
                    <div style={{ marginTop: "0.5rem", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                      <strong>{DICT[lang].filePath}</strong> {localFilePath}
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
                  {DICT[lang].startTranscription}
                </button>
                {modelsList.find(m => m.name === selectedModel)?.cached === false && (
                  <p style={{ color: "var(--error)", fontSize: "0.85rem", marginTop: "0.5rem" }}>
                    {DICT[lang].modelNotDownloaded}
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
                {DICT[lang].modelTitle}
              </h3>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
                {DICT[lang].modelDesc}
              </p>
              <select
                className="form-control"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                style={{ fontWeight: 600 }}
              >
                <option value="tiny">{DICT[lang].modelTinyDesc}</option>
                <option value="base">{DICT[lang].modelBaseDesc}</option>
                <option value="small">{DICT[lang].modelSmallDesc}</option>
                <option value="medium">{DICT[lang].modelMediumDesc}</option>
                <option value="large-v3">{DICT[lang].modelLargeDesc}</option>
              </select>
            </div>

            <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "1rem" }}>
              <h4 style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "1rem", color: "var(--text-muted)" }}>
                {DICT[lang].modelManager}
              </h4>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {modelsList.map((m) => (
                  <div
                    key={m.name}
                    className="model-status-card"
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
                          {DICT[lang].downloaded}
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
                          {DICT[lang].downloading}
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
                          {DICT[lang].downloadBtn}
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
              {DICT[lang].loadingTitle}
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>
              {DICT[lang].loadingDesc} <strong>{selectedModel}</strong>{DICT[lang].loadingDesc2}
            </p>
          </div>
        </div>
      )}

      {/* STEP 3: WORKSPACE / EDITOR */}
      {step === "editor" && (
        <div className="step-container editor-layout">

          {/* Left Column: Styles and Preview */}
          <aside className="sidebar-panel">
            <h3 className="panel-title">{DICT[lang].assStylesTitle}</h3>

            {/* Font Selection */}
            <div className="form-group">
              <label className="form-label">{DICT[lang].fontFamilyLabel}</label>
              <select
                className="form-control"
                value={fontName}
                onChange={(e) => setFontName(e.target.value)}
              >
                <option value="Montserrat">Montserrat ({DICT[lang].fontInCatalog})</option>
                <option value="Inter">Inter ({DICT[lang].fontInCatalog})</option>
                <option value="Oswald">Oswald ({DICT[lang].fontInCatalog})</option>
                <option value="Roboto">Roboto ({DICT[lang].fontInCatalog})</option>
                <option value="Fira Mono">Fira Mono ({DICT[lang].fontInCatalog})</option>
                <option value="Noto Sans">Noto Sans ({DICT[lang].fontInCatalog})</option>
                <option value="Arial">Arial</option>
                <option value="Impact">Impact ({DICT[lang].fontClassic})</option>
              </select>
            </div>

            {/* Font Size */}
            <div className="form-group">
              <label className="form-label">{DICT[lang].fontSizeLabel} {fontSize}</label>
              <input
                type="range"
                min="14"
                max="150"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                style={{ width: "100%" }}
              />
            </div>

            {/* Font Bold */}
            <div className="form-group">
              <label className="checkbox-label" style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={fontBold}
                  onChange={(e) => setFontBold(e.target.checked)}
                  style={{ width: "16px", height: "16px", cursor: "pointer" }}
                />
                <span className="form-label" style={{ margin: 0, cursor: "pointer" }}>{DICT[lang].fontBoldLabel}</span>
              </label>
            </div>

            {/* Vertical Position Shift */}
            <div className="form-group">
              <label className="form-label">{DICT[lang].verticalShiftLabel} {verticalShift > 0 ? `+${verticalShift}` : verticalShift}</label>
              <input
                type="range"
                min="-500"
                max="500"
                value={verticalShift}
                onChange={(e) => setVerticalShift(Number(e.target.value))}
                style={{ width: "100%" }}
              />
            </div>

            {/* Text Opacity */}
            <div className="form-group">
              <label className="form-label">{DICT[lang].textOpacityLabel} {textOpacity}%</label>
              <input
                type="range"
                min="0"
                max="100"
                value={textOpacity}
                onChange={(e) => setTextOpacity(Number(e.target.value))}
                style={{ width: "100%" }}
              />
            </div>

            {/* Subtitle Style Type */}
            <div className="form-group">
              <label className="form-label">{DICT[lang].animationStyleLabel}</label>
              <select
                className="form-control"
                value={styleMode}
                onChange={(e) => setStyleMode(e.target.value as any)}
              >
                <option value="active_word">{DICT[lang].animationActiveWord}</option>
                <option value="karaoke">{DICT[lang].animationKaraoke}</option>
              </select>
            </div>

            {/* Inactive Word Color */}
            <div className="form-group">
              <label className="form-label">{DICT[lang].inactiveColorLabel}</label>
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
              <label className="form-label">{DICT[lang].activeColorLabel}</label>
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
            {/* Outline Controls */}
            <div className="form-group">
              <label className="checkbox-label" style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={outlineEnabled}
                  onChange={(e) => setOutlineEnabled(e.target.checked)}
                  style={{ width: "16px", height: "16px", cursor: "pointer" }}
                />
                <span className="form-label" style={{ margin: 0, cursor: "pointer" }}>{DICT[lang].outlineLabel}</span>
              </label>
              {outlineEnabled && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "0.5rem" }}>
                  <div className="color-picker-container">
                    <div className="color-picker-preview" style={{ backgroundColor: outlineColor }}>
                      <input
                        type="color"
                        className="color-picker-input"
                        value={outlineColor}
                        onChange={(e) => setOutlineColor(e.target.value)}
                      />
                    </div>
                    <span className="color-hex-text">{outlineColor.toUpperCase()}</span>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: "0.85rem", color: "var(--text-muted)", display: "block", marginBottom: "0.25rem" }}>
                      {DICT[lang].outlineWidthLabel} {outlineWidth}
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="20"
                      value={outlineWidth}
                      onChange={(e) => setOutlineWidth(Number(e.target.value))}
                      style={{ width: "100%" }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Shadow Controls */}
            <div className="form-group">
              <label className="checkbox-label" style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={shadowEnabled}
                  onChange={(e) => setShadowEnabled(e.target.checked)}
                  style={{ width: "16px", height: "16px", cursor: "pointer" }}
                />
                <span className="form-label" style={{ margin: 0, cursor: "pointer" }}>{DICT[lang].shadowLabel}</span>
              </label>
              {shadowEnabled && (
                <div className="color-picker-container">
                  <div className="color-picker-preview" style={{ backgroundColor: shadowColor }}>
                    <input
                      type="color"
                      className="color-picker-input"
                      value={shadowColor}
                      onChange={(e) => setShadowColor(e.target.value)}
                    />
                  </div>
                  <span className="color-hex-text">{shadowColor.toUpperCase()}</span>
                </div>
              )}
            </div>

            {/* Background Controls */}
            <div className="form-group">
              <label className="checkbox-label" style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={bgEnabled}
                  onChange={(e) => setBgEnabled(e.target.checked)}
                  style={{ width: "16px", height: "16px", cursor: "pointer" }}
                />
                <span className="form-label" style={{ margin: 0, cursor: "pointer" }}>{DICT[lang].bgLabel}</span>
              </label>
              {bgEnabled && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "0.5rem" }}>
                  <div className="color-picker-container">
                    <div className="color-picker-preview" style={{ backgroundColor: bgColor }}>
                      <input
                        type="color"
                        className="color-picker-input"
                        value={bgColor}
                        onChange={(e) => setBgColor(e.target.value)}
                      />
                    </div>
                    <span className="color-hex-text">{bgColor.toUpperCase()}</span>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: "0.85rem", color: "var(--text-muted)", display: "block", marginBottom: "0.25rem" }}>
                      {DICT[lang].bgOpacityLabel} {bgOpacity}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={bgOpacity}
                      onChange={(e) => setBgOpacity(Number(e.target.value))}
                      style={{ width: "100%" }}
                    />
                  </div>
                </div>
              )}
            </div>
            {/* Grouping parameters */}
            <div className="flex-inputs">
              <div className="form-group">
                <label className="form-label">{DICT[lang].wordsPerLineLabel} {maxWordsPerLine}</label>
                <input
                  type="number"
                  className="form-control"
                  min="1"
                  max="10"
                  value={maxWordsPerLine}
                  onChange={(e) => {
                    const val = Math.max(1, Number(e.target.value));
                    setMaxWordsPerLine(val);
                    setWords(prev => applyStaticSegmentation(prev, val, maxGapSeconds));
                  }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">{DICT[lang].gapLabel} {maxGapSeconds}</label>
                <input
                  type="number"
                  className="form-control"
                  step="0.1"
                  min="0.2"
                  max="3.0"
                  value={maxGapSeconds}
                  onChange={(e) => {
                    const val = Math.max(0.1, Number(e.target.value));
                    setMaxGapSeconds(val);
                    setWords(prev => applyStaticSegmentation(prev, maxWordsPerLine, val));
                  }}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginTop: "1rem" }}>
              <label className="form-label">{DICT[lang].minWordDurationLabel} {minWordDuration}</label>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <input
                  type="number"
                  className="form-control"
                  step="0.05"
                  min="0.01"
                  max="2.0"
                  value={minWordDuration}
                  onChange={(e) => setMinWordDuration(Math.max(0.01, parseFloat(e.target.value) || 0.01))}
                />
                <button
                  className="line-action-btn"
                  style={{ whiteSpace: "nowrap", padding: "0 1rem" }}
                  onClick={() => setWords(prev => adjustWordTimings(prev, minWordDuration))}
                  title="{DICT[lang].applyTitle}"
                >
                  Применить
                </button>
              </div>
            </div>

            {/* Media Preview Player */}
            {mediaUrl && (
              <div style={{ marginTop: "2rem" }}>
                <h4 className="form-label" style={{ marginBottom: "0.5rem" }}>{DICT[lang].previewTitle}</h4>
                <div
                  className="video-wrapper-container"
                  style={{
                    position: "relative",
                    width: "100%",
                    borderRadius: "0.75rem",
                    overflow: "hidden",
                    border: "1px solid var(--border-color)",
                    background: "#000",
                    containerType: "size",
                    aspectRatio: videoAspectRatio,
                  }}
                >
                  <video
                    ref={mediaRef}
                    src={mediaUrl}
                    controls
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={(e) => {
                      const video = e.currentTarget;
                      if (video.videoWidth && video.videoHeight) {
                        setVideoAspectRatio(`${video.videoWidth} / ${video.videoHeight}`);
                      }
                    }}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      display: "block"
                    }}
                  />

                  {/* CSS/DOM Overlay */}
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      pointerEvents: "none",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      alignItems: "center",
                      overflow: "hidden",
                      zIndex: 10
                    }}
                  >
                    {renderCSSSubtitles()}
                  </div>
                </div>
              </div>
            )}
          </aside>

          {/* Right Column: Editable Words Timeline */}
          <main className="timeline-panel">
            <div className="timeline-header">
              <h3 style={{ fontSize: "1.25rem", fontWeight: 700 }}>{DICT[lang].editorTitle}</h3>
              <button className="btn btn-primary" onClick={downloadAssFile} style={{ padding: "0.5rem 1.5rem", fontSize: "0.9rem" }}>
                💾 {DICT[lang].downloadBtn} .ass файл
              </button>
            </div>

            <div style={{ padding: "0 1.5rem 1rem", borderBottom: "1px solid var(--border-color)" }}>
              <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", background: "rgba(0,0,0,0.1)", padding: "1rem", borderRadius: "0.5rem", border: "1px solid var(--border-color)" }}>
                <p style={{ marginBottom: "0.5rem" }}>{DICT[lang].ffmpegHardsubInfo}</p>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", minWidth: 0 }}>
                  <code style={{ flex: 1, minWidth: 0, display: "block", background: "rgba(0,0,0,0.2)", padding: "0.5rem", borderRadius: "0.25rem", overflowX: "auto", whiteSpace: "nowrap", userSelect: "all", color: "var(--primary)", fontFamily: "monospace" }}>
                    {getFfmpegCommand()}
                  </code>
                  <button
                    onClick={handleCopyCommand}
                    title="Копировать / Copy"
                    style={{
                      background: copied ? "var(--success)" : "rgba(255, 255, 255, 0.1)",
                      border: "1px solid var(--border-color)",
                      color: copied ? "#fff" : "var(--text-main)",
                      padding: "0.4rem 0.5rem",
                      borderRadius: "0.25rem",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.2s"
                    }}
                  >
                    {copied ? (
                      <span style={{ fontSize: "0.8rem", fontWeight: 600, padding: "0 0.2rem" }}>OK</span>
                    ) : (
                      <img src="/content_copy.svg" width={18} height={18} alt="Copy" style={{ opacity: 0.8 }} />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="timeline-scroll">
              <div style={{ display: "flex", justifyContent: "center", padding: "1.5rem" }}>
                <button
                  onClick={addLineToStart}
                  style={{
                    background: "var(--primary)",
                    color: "white",
                    border: "none",
                    padding: "0.75rem 1.5rem",
                    borderRadius: "0.5rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontSize: "1rem"
                  }}
                >
                  {DICT[lang].addLineStartBtn}
                </button>
              </div>
              {getGroupedLines().map((line, lineIdx) => {
                // Check if the current player playback position falls within this entire line
                const isLineActive = line.some(w => !w.deactivated && currentTime >= w.start && currentTime <= w.end);

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
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "0.75rem", color: "var(--primary)", fontWeight: 600 }}>
                          {DICT[lang].lineLabel} {lineIdx + 1} ({line[0].start.toFixed(2)}s)
                        </span>
                        <button
                          className="line-action-btn"
                          title="{DICT[lang].addStartTitle}"
                          onClick={() => addWord(line[0].id, 'before')}
                        >
                          {DICT[lang].addStartBtn}
                        </button>
                        <button
                          className="line-action-btn"
                          title="{DICT[lang].addLineBelowTitle}"
                          onClick={() => addLine(line[line.length - 1].id)}
                        >
                          {DICT[lang].addLineBelowBtn}
                        </button>
                        <label style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.75rem", cursor: "pointer", marginLeft: "0.5rem" }}>
                          <input 
                            type="checkbox" 
                            checked={line[0].line_auto_wrap !== false} 
                            onChange={() => toggleLineAutoWrap(lineIdx)} 
                          />
                          {DICT[lang].autoWrapLabel}
                        </label>
                        {lineIdx > 0 && (
                          <button
                            className="line-action-btn"
                            title={DICT[lang].moveFirstWordPrev}
                            onClick={() => moveFirstWordToPrevLine(lineIdx)}
                          >
                            {DICT[lang].moveFirstWordPrev}
                          </button>
                        )}
                        {lineIdx < getGroupedLines().length - 1 && (
                          <button
                            className="line-action-btn"
                            title={DICT[lang].moveLastWordNext}
                            onClick={() => moveLastWordToNextLine(lineIdx)}
                          >
                            {DICT[lang].moveLastWordNext}
                          </button>
                        )}
                      </div>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginLeft: "1rem" }}>
                        {line.filter(w => !w.deactivated).map(w => w.word.trim()).join(" ")}
                      </span>
                    </div>

                    <div className="word-cards-container">
                      {line.map((word) => {
                        const isWordActive = !word.deactivated && currentTime >= word.start && currentTime <= word.end;

                        return (
                          <div
                            key={word.id}
                            className={`word-card ${isWordActive ? "active" : ""} ${word.deactivated ? "deactivated" : ""}`}
                          >
                            <div className="word-card-toolbar">
                              <button className="word-action-btn" title={DICT[lang].listenTitle} onClick={() => playWordSegment(word)}>🔊</button>
                              {word.id !== words[words.length - 1]?.id && (
                                <button
                                  className="word-action-btn"
                                  title={DICT[lang].mergeNextTitle}
                                  onClick={() => mergeWithNext(word.id)}
                                >
                                  🔗
                                </button>
                              )}
                              {word.mergedFrom && word.mergedFrom.length > 0 && (
                                <button
                                  className="word-action-btn"
                                  title={DICT[lang].splitWordTitle}
                                  onClick={() => splitWord(word.id)}
                                >
                                  ✂️
                                </button>
                              )}
                              <button
                                className={`word-action-btn ${word.is_newline ? "active-toggle" : ""}`}
                                style={{ color: word.is_newline ? "var(--primary)" : "inherit" }}
                                title="{DICT[lang].startNewLineTitle}"
                                onClick={() => setWords(prev => prev.map(w => w.id === word.id ? { ...w, is_newline: !w.is_newline } : w))}
                              >
                                ↵
                              </button>
                              <button className="word-action-btn" title="{DICT[lang].addAfterTitle}" onClick={() => addWord(word.id, "after")}>➕</button>
                              <button
                                className={`word-action-btn ${word.deactivated ? "deactivated-toggle" : ""}`}
                                title={word.deactivated ? DICT[lang].activateTitle : DICT[lang].deactivateTitle}
                                onClick={() => toggleWordActive(word.id)}
                              >
                                {word.deactivated ? "🚫" : "👁️"}
                              </button>
                              <button className="word-action-btn word-delete-btn" title={DICT[lang].deleteTitle} onClick={() => deleteWord(word.id)}>🗑️</button>
                            </div>

                            <input
                              type="text"
                              className="word-input"
                              value={word.word}
                              onChange={(e) => updateWordText(word.id, e.target.value)}
                            />

                            <div className="time-inputs">
                              <div>
                                <span>{DICT[lang].startLabel}</span>
                                <input
                                  type="number"
                                  className="time-input"
                                  step="0.05"
                                  value={parseFloat(word.start.toFixed(2))}
                                  onChange={(e) => updateWordTime(word.id, "start", parseFloat(e.target.value))}
                                />
                              </div>
                              <div>
                                <span>{DICT[lang].endLabel}</span>
                                <input
                                  type="number"
                                  className="time-input"
                                  step="0.05"
                                  value={parseFloat(word.end.toFixed(2))}
                                  onChange={(e) => updateWordTime(word.id, "end", parseFloat(e.target.value))}
                                />
                              </div>
                            </div>

                            <button className="play-word-btn" style={{ display: "none" }} onClick={() => playWordSegment(word)}>
                              🔊 {DICT[lang].listenTitle}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              <div style={{ display: "flex", justifyContent: "center", padding: "1.5rem" }}>
                <button
                  onClick={() => addLine(null)}
                  style={{
                    background: "var(--primary)",
                    color: "white",
                    border: "none",
                    padding: "0.75rem 1.5rem",
                    borderRadius: "0.5rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontSize: "1rem"
                  }}
                >
                  {DICT[lang].addLineEndBtn}
                </button>
              </div>
            </div>
          </main>

        </div>
      )}

      {/* FOOTER */}
      <footer style={{
        marginTop: "3rem",
        padding: "1.5rem 0",
        borderTop: "1px solid var(--border-color)",
        textAlign: "center",
        color: "var(--text-muted)",
        fontSize: "0.85rem",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.5rem"
      }}>
        <div>
          Licensed under <a href="https://www.gnu.org/licenses/gpl-3.0.html" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", textDecoration: "none" }}>GNU GPL v3</a>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span>🄯 2026</span>
          <a href="https://github.com/Antony-hash512/catcut" target="_blank" rel="noopener noreferrer" style={{ color: "var(--text-main)", textDecoration: "none", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.25rem" }}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            Antony-hash512
          </a>
        </div>
      </footer>

    </div>
  );
}
