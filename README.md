
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](LICENSE.GPLv3)

/ [English](#english) / [Русский](#русский) /

# english

## 🐱 catcut — A cute automatic subtitle generator via local AI models from your videos

catcut is a tool for automatic speech recognition with word-level timing alignment and generation of beautiful, stylized `.ass` subtitles (with karaoke highlighting or word-by-word selection).

---

## 🛠️ Project Setup

The project is organized as a monorepo. The backend and frontend run in separate terminals.
### 0. Install system dependencies and download the repository

Before starting, install all necessary packages to build and run the backend and frontend. Use your operating system's package manager. Example for **Arch Linux** (using the `--needed` flag):

```fish
sudo pacman -S --needed git nodejs npm python uv ffmpeg
```

*(Optional)* For running both the frontend and backend simultaneously in one terminal window, install `tmux`:
```fish
sudo pacman -S --needed tmux
```

Additionally, for building the desktop version (Tauri v2):

```fish
sudo pacman -S --needed base-devel curl wget file openssl webkit2gtk-4.1 appmenu-gtk-module libappindicator-gtk3 librsvg rustup 
```

> [!NOTE]
> After installing `rustup`, initialize the stable version of Rust:
> ```fish
> rustup default stable
> ```
> (rustup is only required for building the desktop tauri application; it is not necessary for running the frontend in a browser)

Then clone the repository:

```fish
mkdir -p ~/git
cd ~/git
git clone https://github.com/Antony-hash512/catcut.git
```

### 1. Running the backend (Python + FastAPI)

Make sure you are in the `catcut-backend` directory:

```fish
cd ~/git/catcut/catcut-backend
```
Activate the virtual environment:

| Command Line Shell | Activation Command |
| :--- | :--- |
| **Bash or Zsh** | `source .venv/bin/activate` |
| **Fish** | `source .venv/bin/activate.fish` |
| **Nushell** | `overlay use .venv/bin/nu-activate.nu` |
| **PowerShell** | `.venv/bin/Activate.ps1` |
| **cmd.exe (Windows)** | `.venv\Scripts\activate.bat` |

Install Python packages:
```fish
uv sync
```

Run the server part (backend):
```fish
uv run python main.py
```
*   The server will start at **`http://localhost:8000`**.
*   Interactive API documentation (Swagger) will be available at **`http://localhost:8000/docs`**.

If this port is busy, the backend will automatically find another available port.

---

### 2. Running the frontend (Next.js + TypeScript)

Make sure you are in the `catcut-frontend` directory:

```fish
cd ~/git/catcut/catcut-frontend
```

Start the development server:
```fish
npm run dev
```
*   The frontend will start at **`http://localhost:3000`**.
*   Open `http://localhost:3000` in your browser to interact with the web interface.

If this port is busy, the frontend will automatically find another available port.

---

### 3. Running both backend and frontend simultaneously (via tmux)

If you have `tmux` installed, you can use the provided script to start both the backend and frontend in a single terminal window split horizontally (backend on the left, frontend on the right after 5 seconds):

```fish
./start_tmux.sh
```

To exit the session, you can stop both processes (using `Ctrl+C` in each pane) or simply close the terminal window. To detach from the session without stopping the servers, press `Ctrl+B`, then `D`.

---

### 4. Running the desktop version (Tauri v2)

In addition to the web version, the project supports running as a desktop application using **Tauri v2**. 

In desktop mode, selecting or drag-and-dropping a media file works **instantly** without copying it to a web sandbox or sending it over the network — the application reads the absolute path to the file on disk and passes it to the local backend API. Video file playback is implemented via the secure `convertFileSrc` protocol.

#### System dependencies (Arch Linux)
Before building, make sure all system dependencies are installed (if you haven't installed them in step 0):
```fish
sudo pacman -S --needed base-devel curl wget file openssl webkit2gtk-4.1 appmenu-gtk-module libappindicator-gtk3 librsvg rustup
```

#### Running in development mode
Make sure you are in the `catcut-frontend` directory:
```fish
cd ~/git/catcut/catcut-frontend
```

Ensure the backend is running, then execute:
```fish
npm run tauri dev
```
Tauri will automatically compile the Rust part and launch the desktop application window.

#### Building a release
To compile an optimized standalone application, execute:
```fish
npm run tauri build
```
The compiled binary package (`.deb`, `.AppImage`, or executable file) will be located in the `catcut-frontend/src-tauri/target/release/bundle/` directory.

---

## 📂 Project Structure

```
catcut/ (Git repository root)
├── LICENSE                  # GPL v3 License
├── README.md                # This help file
├── .gitignore               # Unified gitignore file
│
├── catcut-backend/          # Backend (Python + uv)
│   ├── app/                 # FastAPI source code
│   │   ├── core.py          # AI core (stable-ts + Whisper on GPU)
│   │   ├── ass_builder.py   # ASS styles generator (pysubs2)
│   │   └── main.py          # API endpoints
│   ├── fonts/               # Local fonts (Inter, Montserrat, Noto, Oswald, Fira)
│   ├── temp/                # Temporary storage for video/audio
│   ├── main.py              # uvicorn launcher script
│   ├── pyproject.toml       # Python dependencies
│   └── uv.lock              # Locked package versions
│
└── catcut-frontend/         # Frontend (Next.js + TypeScript)
    ├── app/
    │   ├── page.tsx         # Main page (upload interface and editor)
    │   ├── globals.css      # Styling (Vanilla CSS)
    │   └── layout.tsx       # Application layout
```

---

## 🎨 Styling Features

In the web interface, you can configure the parameters for the final subtitle file:
1.  **Font Family:** Montserrat, Inter, Roboto, Oswald, Fira Mono, Noto Sans (all fonts are provided locally from the backend folder `catcut-backend/fonts/`).
2.  **Font Size.**
3.  **Animation:**
    *   `Active Word` (the currently spoken word is highlighted with the selected color and scaled up; other words in the phrase remain standard).
    *   `Karaoke` (the line remains on the screen, and words are filled with the active color sequentially by syllables/words).
4.  **Colors:** individual color selection for active and background text.
5.  **Maximum number of words per line** and **pause combining sensitivity** (in seconds).

---

## 🧠 Using Local (Offline) AI Models

You can start downloading local AI models directly from the frontend web interface. The `faster-whisper` engine automatically downloads the selected model (e.g., `small`) from the Hugging Face repository (`Systran/faster-whisper-small`) and the backend caches it in the user's local directory:
`~/.cache/huggingface/hub/models--Systran--faster-whisper-small/`
Five models to choose from:
- tiny
- base
- small
- medium
- large-v3

They differ in VRAM or RAM requirements and processing speed. The larger the model, the more accurately it recognizes speech, but the slower it runs.

If the backend needs to operate entirely without internet access and you want to download the models in advance, you can perform the following steps (though it's not required):

### 1. Downloading the model manually

You can clone the required model directly from Hugging Face using `git-lfs` (the set of models from Systran is optimized for CTranslate2/faster-whisper):

```fish
# Install Git LFS (if not installed)
sudo pacman -S git-lfs
git lfs install

# Clone the model repository to a convenient location
git clone https://huggingface.co/Systran/faster-whisper-small
```
*Available model sizes: `faster-whisper-tiny`, `faster-whisper-base`, `faster-whisper-small`, `faster-whisper-medium`, `faster-whisper-large-v3`.*

### 2. Running the backend specifying the path to a local model

In the `catcut-backend/app/core.py` file or during model initialization, you can pass the absolute path to the cloned folder instead of the model name:

```python
# Instead of "small", pass the absolute path to the folder on the disk
model = stable_whisper.load_faster_whisper("/absolute/path/to/faster-whisper-small", device="cuda")
```
With this setup, the backend will run 100% locally and will not attempt to access the network.

---

*(The icons used in the language selector, copy button, etc., are from [Google Material Symbols](https://fonts.google.com/icons), licensed under the Apache License 2.0, which is compatible with GPL v3, the license used by this project.)*

# русский

## 🐱 catcut — Генератор красивых автоматических субтитров с помощью локальных ИИ-моделей для ваших видео


catcut — это инструмент для автоматического распознавания речи с пословным выравниванием таймингов и генерацией красивых, стилизованных `.ass` субтитров (с караоке-подсветкой или пословным выделением).

---

## 🛠️ Запуск проекта

Проект организован как монорепозиторий. Бэкенд и фронтенд запускаются в раздельных терминалах.
### 0. Установите системные зависимости и скачайте репозиторий

Перед началом работы установите все необходимые пакеты для сборки и запуска бэкенда, фронтенда. Используйте пакетный менеджер вашей операционной системы. Пример для **Arch Linux** (с использованием флага `--needed`):

```fish
sudo pacman -S --needed git nodejs npm python uv ffmpeg
```

*(Опционально)* Для одновременного запуска фронтенда и бэкенда в одном окне терминала установите `tmux`:
```fish
sudo pacman -S --needed tmux
```

Дополнительно для сборки десктопной версии (Tauri v2):

```fish
sudo pacman -S --needed base-devel curl wget file openssl webkit2gtk-4.1 appmenu-gtk-module libappindicator-gtk3 librsvg rustup 
```

> [!NOTE]
> После установки `rustup` инициализируйте стабильную версию Rust:
> ```fish
> rustup default stable
> ```
> (rustup требуется только для сборки дестопного tauri-приложения, для работы фронтенда через браузер он не обязателен)

Затем клонируйте репозиторий:

```fish
mkdir -p ~/git
cd ~/git
git clone https://github.com/Antony-hash512/catcut.git
```

### 1. Запуск бэкенда (Python + FastAPI)

Убедитесь, что вы находитесь в директории `catcut-backend`:

```fish
cd ~/git/catcut/catcut-backend
```
Активируйте виртуальное окружение:

| Оболочка командной строки | Команда активации |
| :--- | :--- |
| **Bash или Zsh** | `source .venv/bin/activate` |
| **Fish** | `source .venv/bin/activate.fish` |
| **Nushell** | `overlay use .venv/bin/nu-activate.nu` |
| **PowerShell** | `.venv/bin/Activate.ps1` |
| **cmd.exe (Windows)** | `.venv\Scripts\activate.bat` |

Установаите пакеты Python:
```fish
uv sync
```

Запустите серверную часть (бэкенд):
```fish
uv run python main.py
```
*   Сервер запустится на **`http://localhost:8000`**.
*   Интерактивная документация API (Swagger) будет доступна по адресу **`http://localhost:8000/docs`**.

Если данный порт занят, то бэкенд автоматически подберёт себе другой свободный порт.

---

### 2. Запуск фронтенда (Next.js + TypeScript)

Убедитесь, что вы находитесь в директории `catcut-frontend`:

```fish
cd ~/git/catcut/catcut-frontend
```

Запустите сервер разработки:
```fish
npm run dev
```
*   Фронтенд запустится на **`http://localhost:3000`**.
*   Перейдите в браузере на `http://localhost:3000` для работы с веб-интерфейсом.

Если данный порт занят, то фронтенд автоматически подберёт себе другой свободный порт.

---

### 3. Одновременный запуск бэкенда и фронтенда (с помощью tmux)

Если у вас установлен `tmux`, вы можете использовать готовый скрипт для запуска бэкенда и фронтенда в одном окне терминала, разделенном по горизонтали (бэкенд в левой части, фронтенд в правой спустя 5 секунд):

```fish
./start_tmux.sh
```

Чтобы завершить работу, вы можете остановить оба процесса (нажав `Ctrl+C` в каждой панели) или просто закрыть окно терминала. Чтобы отключиться от сессии, не останавливая серверы, нажмите `Ctrl+B`, затем `D`.

---

### 4. Запуск десктопной версии (Tauri v2)

Помимо веб-версии, проект поддерживает запуск в виде десктопного приложения с помощью **Tauri v2**. 

В десктопном режиме выбор или Drag-and-Drop медиафайла работает **мгновенно** без копирования в веб-песочницу или отправки по сети — приложение считывает абсолютный путь к файлу на диске и передаёт его локальному API бэкенда. Воспроизведение видеофайла реализовано через защищённый протокол `convertFileSrc`.

#### Системные зависимости (Arch Linux)
Перед сборкой убедитесь, что установлены все системные зависимости (если вы не установили их на шаге 0):
```fish
sudo pacman -S --needed base-devel curl wget file openssl webkit2gtk-4.1 appmenu-gtk-module libappindicator-gtk3 librsvg rustup
```

#### Запуск в режиме разработки
Убедитесь, что вы находитесь в директории `catcut-frontend`:
```fish
cd ~/git/catcut/catcut-frontend
```

Убедитесь, что бэкенд запущен и затем выполните:
```fish
npm run tauri dev
```
Tauri автоматически скомпилирует Rust-часть и запустит десктопное окно приложения.

#### Сборка готового релиза
Для компиляции оптимизированного автономного приложения выполните:
```fish
npm run tauri build
```
Собранный бинарный пакет (`.deb`, `.AppImage` или исполняемый файл) будет находиться в директории `catcut-frontend/src-tauri/target/release/bundle/`.

---

## 📂 Структура проекта

```
catcut/ (Корень Git-репозитория)
├── LICENSE                  # Лицензия GPL v3
├── README.md                # Этот файл справки
├── .gitignore               # Объединённый игнор-файл для Git
│
├── catcut-backend/          # Бэкенд (Python + uv)
│   ├── app/                 # Исходный код FastAPI
│   │   ├── core.py          # ИИ-ядро (stable-ts + Whisper на GPU)
│   │   ├── ass_builder.py   # Генератор стилей ASS (pysubs2)
│   │   └── main.py          # API эндпоинты
│   ├── fonts/               # Локальные шрифты (Inter, Montserrat, Noto, Oswald, Fira)
│   ├── temp/                # Временное хранилище для видео/аудио
│   ├── main.py              # Скрипт-лаунчер uvicorn
│   ├── pyproject.toml       # Зависимости Python
│   └── uv.lock              # Зафиксированные версии пакетов
│
└── catcut-frontend/         # Фронтенд (Next.js + TypeScript)
    ├── app/
    │   ├── page.tsx         # Главная страница (интерфейс загрузки и редактор)
    │   ├── globals.css      # Стилизация (Vanilla CSS)
    │   └── layout.tsx       # Макет приложения
```

---

## 🎨 Возможности стилизации

В веб-интерфейсе вы можете настроить параметры для готового файла субтитров:
1.  **Семейство шрифтов:** Montserrat, Inter, Roboto, Oswald, Fira Mono, Noto Sans (все шрифты поставляются локально из папки бэкенда `catcut-backend/fonts/`).
2.  **Размер шрифта.**
3.  **Анимация:**
    *   `Active Word` (текущее произносимое слово подсвечивается выбранным цветом и увеличивается, остальные слова в фразе остаются стандартными).
    *   `Karaoke` (строка остается на экране, а слова заливаются активным цветом последовательно по слогам/словам).
4.  **Цвета:** индивидуальный выбор цвета для активного и фонового текста.
5.  **Максимальное число слов в одной строке** и **чувствительность склейки пауз** (в секундах).

---

## 🧠 Использование локальных (оффлайн) моделей ИИ

Запустить скачивание локальных ИИ-моделей можно из прямо из веб-интерфейса фронтенда. Движок `faster-whisper` автоматически скачивает выбранную модель (например, `small`) с репозитория Hugging Face (`Systran/faster-whisper-small`) бэкенд кэширует её в локальный каталог пользователя:
`~/.cache/huggingface/hub/models--Systran--faster-whisper-small/`
Пять моделей на выбор:
- tiny
- base
- small
- medium
- large-v3


Они отличаются требованием к VRAM или ОЗУ и скоростью работы. Чем больше модель тем точнее она распознает речь, но тем медленнее она работает.

Если бэкенд должен работать полностью без доступа к интернету и вы хотите скачать модели заранее, можете выполнить следующие шаги (но это не обязательно):

### 1. Скачивание модели вручную

Вы можете склонировать нужную модель напрямую с Hugging Face с помощью `git-lfs` (набор моделей от Systran оптимизирован для работы в CTranslate2/faster-whisper):

```fish
# Установите Git LFS (если не установлен)
sudo pacman -S git-lfs
git lfs install

# Склонируйте репозиторий модели в удобное место
git clone https://huggingface.co/Systran/faster-whisper-small
```
*Доступные размеры моделей: `faster-whisper-tiny`, `faster-whisper-base`, `faster-whisper-small`, `faster-whisper-medium`, `faster-whisper-large-v3`.*

### 2. Запуск бэкенда с указанием пути к локальной модели

В файле `catcut-backend/app/core.py` или при инициализации модели вы можете передать абсолютный путь к склонированной папке вместо названия модели:

```python
# Вместо "small" передайте абсолютный путь к папке на диске
model = stable_whisper.load_faster_whisper("/absolute/path/to/faster-whisper-small", device="cuda")
```
При таком запуске бэкенд будет работать на 100% локально и не попытается обратиться к сети.

---

*(Иконки, используемые в селекторе языков, кнопке "копировать" и т.д., взяты из [Google Material Symbols](https://fonts.google.com/icons) и распространяются по лицензии Apache License 2.0, совместимой с GPL v3, под которой лицензируется данный проект.)*
