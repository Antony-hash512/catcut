import re
import sys

with open("/home/fireice/src/yt/cupcut-style/catcut/catcut-frontend/app/page.tsx", "r") as f:
    content = f.read()

# 1. Add Dictionary right after API_URL
dict_code = """
type LangType = "ru" | "en";

const DICT = {
  ru: {
    appDesc: "Генерация пословных субтитров",
    themeSystem: "💻 Системная",
    themeLight: "☀️ Светлая",
    themeDark: "🌙 Тёмная",
    themeLabel: "Тема оформления:",
    langLabel: "Язык:",
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
    newWordPlaceholder: "слово",
    newLinePlaceholder: "новая строка",
    errorModelDownload: "Не удалось запустить скачивание модели.",
    errorServerConn: "Ошибка при связи с сервером.",
    errorTranscription: "Ошибка при распознавании видео.",
    errorAssGeneration: "Не удалось сгенерировать файл субтитров.",
    errorUnknown: "Неизвестная ошибка",
    errorAssSave: "Ошибка при генерации/сохранении .ass файла:",
    errorFastApi: "Не удалось связаться с сервером бэкенда. Убедитесь, что FastAPI сервер запущен на порту 8000.",
  },
  en: {
    appDesc: "Word-by-word subtitle generation",
    themeSystem: "💻 System",
    themeLight: "☀️ Light",
    themeDark: "🌙 Dark",
    themeLabel: "Theme:",
    langLabel: "Language:",
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
    newWordPlaceholder: "word",
    newLinePlaceholder: "new line",
    errorModelDownload: "Failed to start model download.",
    errorServerConn: "Error connecting to the server.",
    errorTranscription: "Error transcribing video.",
    errorAssGeneration: "Failed to generate subtitle file.",
    errorUnknown: "Unknown error",
    errorAssSave: "Error generating/saving .ass file:",
    errorFastApi: "Could not connect to backend server. Make sure the FastAPI server is running on port 8000.",
  }
};
"""

content = content.replace(
    'const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";',
    'const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";\n\n' + dict_code
)

# 2. Add Lang state
content = content.replace(
    'const [theme, setTheme] = useState<"light" | "dark" | "system">("system");',
    'const [theme, setTheme] = useState<"light" | "dark" | "system">("system");\n  const [lang, setLang] = useState<LangType>("ru");'
)

# 3. Add Lang to localStorage
content = content.replace(
    """    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | "system" | null;
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);""",
    """    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | "system" | null;
    if (savedTheme) {
      setTheme(savedTheme);
    }
    const savedLang = localStorage.getItem("lang") as LangType | null;
    if (savedLang) {
      setLang(savedLang);
    }
  }, []);"""
)

content = content.replace(
    """  // Apply theme and setup media listeners
  useEffect(() => {
    localStorage.setItem("theme", theme);""",
    """  useEffect(() => {
    localStorage.setItem("lang", lang);
  }, [lang]);

  // Apply theme and setup media listeners
  useEffect(() => {
    localStorage.setItem("theme", theme);"""
)

# 4. Do string replacements iteratively
replacements = [
    ('alert("Не удалось запустить скачивание модели.");', 'alert(DICT[lang].errorModelDownload);'),
    ('alert("Ошибка при связи с сервером.");', 'alert(DICT[lang].errorServerConn);'),
    ('const errorText = await response.json().catch(() => ({ detail: "Неизвестная ошибка" }));', 'const errorText = await response.json().catch(() => ({ detail: DICT[lang].errorUnknown }));'),
    ('throw new Error(errorText.detail || "Ошибка при распознавании видео.");', 'throw new Error(errorText.detail || DICT[lang].errorTranscription);'),
    ('setErrorMsg(err.message || "Не удалось связаться с сервером бэкенда. Убедитесь, что FastAPI сервер запущен на порту 8000.");', 'setErrorMsg(err.message || DICT[lang].errorFastApi);'),
    ('word: "слово",', 'word: DICT[lang].newWordPlaceholder,'),
    ('word: "новая строка",', 'word: DICT[lang].newLinePlaceholder,'),
    ('throw new Error("Не удалось сгенерировать файл субтитров.");', 'throw new Error(DICT[lang].errorAssGeneration);'),
    ('alert(`Ошибка при генерации/сохранении .ass файла:\\n${details || "Неизвестная ошибка"}`);', 'alert(`${DICT[lang].errorAssSave}\\n${details || DICT[lang].errorUnknown}`);'),
    
    ('Генерация пословных субтитров', '{DICT[lang].appDesc}'),
    
    (
        '''          <div className="theme-toggle-container">
            <span className="theme-label">Тема оформления:</span>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value as any)}
              className="theme-select"
              title="Выберите тему оформления"
            >
              <option value="system">💻 Системная</option>
              <option value="light">☀️ Светлая</option>
              <option value="dark">🌙 Тёмная</option>
            </select>
          </div>''',
        '''          <div className="theme-toggle-container" style={{ display: "flex", gap: "1rem" }}>
            <div>
              <span className="theme-label" style={{ marginRight: "0.5rem" }}>{DICT[lang].langLabel}</span>
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value as LangType)}
                className="theme-select"
              >
                <option value="ru">🇷🇺 Русский</option>
                <option value="en">🇬🇧 English</option>
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
          </div>'''
    ),
    
    ('<div>\n            ⚠️ <strong>Внимание:</strong> Вы используете десктопную версию (Tauri). Из-за особенностей движка WebKit2GTK воспроизведение видео в предпросмотре может работать нестабильно (лаги, артефакты). Мы рекомендуем пока использовать веб-версию для более плавной работы.\n          </div>', '<div dangerouslySetInnerHTML={{ __html: DICT[lang].tauriWarning }} />'),
    ('⚠️ <strong>Ошибка:</strong> {errorMsg}', '<span dangerouslySetInnerHTML={{ __html: DICT[lang].errorLabel }} /> {errorMsg}'),
    ('<h2 className="upload-title">Перетащите видео или аудио файл</h2>', '<h2 className="upload-title">{DICT[lang].uploadTitle}</h2>'),
    ('<p className="upload-subtitle">Поддерживаются форматы MP4, MKV, MOV, MP3, WAV и др.</p>', '<p className="upload-subtitle">{DICT[lang].uploadSubtitle}</p>'),
    ('📄 <strong>Выбран файл:</strong>', '<span dangerouslySetInnerHTML={{ __html: DICT[lang].fileSelected }} />'),
    ('<strong>Путь на диске:</strong>', '<strong>{DICT[lang].filePath}</strong>'),
    ('🚀 Начать распознавание речи', '{DICT[lang].startTranscription}'),
    ('Выбранная модель не скачана. Скачайте её справа перед продолжением.', '{DICT[lang].modelNotDownloaded}'),
    ('🧠 Модель Whisper ИИ', '{DICT[lang].modelTitle}'),
    ('Выберите размер модели. Большие модели точнее, но работают медленнее и требуют больше VRAM/ОЗУ.', '{DICT[lang].modelDesc}'),
    ('Tiny (~75 MB) - Сверхбыстрая', '{DICT[lang].modelTinyDesc}'),
    ('Base (~140 MB) - Быстрая', '{DICT[lang].modelBaseDesc}'),
    ('Small (~460 MB) - Оптимально', '{DICT[lang].modelSmallDesc}'),
    ('Medium (~1.5 GB) - Высокая точность', '{DICT[lang].modelMediumDesc}'),
    ('Large-v3 (~3 GB) - Максимальная точность', '{DICT[lang].modelLargeDesc}'),
    ('Менеджер моделей на диске', '{DICT[lang].modelManager}'),
    ('Скачана', '{DICT[lang].downloaded}'),
    ('Загрузка...', '{DICT[lang].downloading}'),
    ('Скачать', '{DICT[lang].downloadBtn}'),
    ('Распознаем речь...', '{DICT[lang].loadingTitle}'),
    ('Это может занять некоторое время. Наша нейросеть запускает модель <strong>{selectedModel}</strong>, извлекает дорожку и выравнивает таймкоды каждого слова с помощью GPU ускорения.', '{DICT[lang].loadingDesc} <strong>{selectedModel}</strong>{DICT[lang].loadingDesc2}'),
    ('🎨 Настройки стиля ASS', '{DICT[lang].assStylesTitle}'),
    ('<label className="form-label">Шрифт субтитров</label>', '<label className="form-label">{DICT[lang].fontFamilyLabel}</label>'),
    ('(Уже в каталоге)', '({DICT[lang].fontInCatalog})'),
    ('(Классика мемов)', '({DICT[lang].fontClassic})'),
    ('Размер шрифта:', '{DICT[lang].fontSizeLabel}'),
    ('Жирное начертание (Bold)', '{DICT[lang].fontBoldLabel}'),
    ('Смещение по вертикали:', '{DICT[lang].verticalShiftLabel}'),
    ('Прозрачность текста:', '{DICT[lang].textOpacityLabel}'),
    ('<label className="form-label">Стиль анимации</label>', '<label className="form-label">{DICT[lang].animationStyleLabel}</label>'),
    ('Active Word (Highlight текущего слова)', '{DICT[lang].animationActiveWord}'),
    ('Karaoke (Заполнение цветом в строке)', '{DICT[lang].animationKaraoke}'),
    ('Цвет обычного текста', '{DICT[lang].inactiveColorLabel}'),
    ('Цвет активного слова', '{DICT[lang].activeColorLabel}'),
    ('Обводка текста', '{DICT[lang].outlineLabel}'),
    ('Толщина обводки:', '{DICT[lang].outlineWidthLabel}'),
    ('Тень текста', '{DICT[lang].shadowLabel}'),
    ('Задний фон (плашка)', '{DICT[lang].bgLabel}'),
    ('Прозрачность фона:', '{DICT[lang].bgOpacityLabel}'),
    ('Слов в строке:', '{DICT[lang].wordsPerLineLabel}'),
    ('Пауза-стык (сек):', '{DICT[lang].gapLabel}'),
    ('Минимальная длительность слова (сек):', '{DICT[lang].minWordDurationLabel}'),
    ('Применить минимальную длительность и скорректировать наложения для всех слов', '{DICT[lang].applyTitle}'),
    ('>\\n                  Применить\\n                </button>', '>\\n                  {DICT[lang].applyBtn}\\n                </button>'),
    ('Предпросмотр аудио/видео', '{DICT[lang].previewTitle}'),
    ('✏️ Пословный редактор', '{DICT[lang].editorTitle}'),
    ('💾 Скачать .ass файл', '{DICT[lang].downloadAssBtn}'),
    ('Строка {lineIdx + 1}', '{DICT[lang].lineLabel} {lineIdx + 1}'),
    ('Добавить слово в начало строки', '{DICT[lang].addStartTitle}'),
    ('+ в начало', '{DICT[lang].addStartBtn}'),
    ('Добавить новую строку ниже', '{DICT[lang].addLineBelowTitle}'),
    ('+ строку ниже', '{DICT[lang].addLineBelowBtn}'),
    ('title="Прослушать"', 'title={DICT[lang].listenTitle}'),
    ('Начинать новую строку с этого слова', '{DICT[lang].startNewLineTitle}'),
    ('Добавить слово после', '{DICT[lang].addAfterTitle}'),
    ('title={word.deactivated ? "Активировать" : "Деактивировать"}', 'title={word.deactivated ? DICT[lang].activateTitle : DICT[lang].deactivateTitle}'),
    ('title="Удалить"', 'title={DICT[lang].deleteTitle}'),
    ('<span>старт:</span>', '<span>{DICT[lang].startLabel}</span>'),
    ('<span>конец:</span>', '<span>{DICT[lang].endLabel}</span>'),
    ('🔊 Прослушать', '🔊 {DICT[lang].listenTitle}'),
    ('➕ Добавить строку в конец', '{DICT[lang].addLineEndBtn}')
]

for src, tgt in replacements:
    content = content.replace(src, tgt)
    # also try to replace without leading/trailing exact spacing just in case it differs slightly
    
with open("/home/fireice/src/yt/cupcut-style/catcut/catcut-frontend/app/page.tsx", "w") as f:
    f.write(content)

print("Replacement complete")
