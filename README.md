# Mokuyomi

Self-hosted web reader for manga processed with [Mokuro](https://github.com/kha-white/mokuro), featuring Yomitan integration, cross-device sync, and immersion tracking.

## Features

- **Mokuro overlay** — OCR text rendered as real DOM text, tappable for Yomitan popup dictionary lookup
- **Mobile-friendly** — responsive layout, touch navigation, pinch-to-zoom, swipe-to-pan
- **Cross-device sync** — reading progress and immersion time synced via the server (no account needed)
- **Immersion timer** — tracks time spent reading per volume, synced across devices
- **Library management** — series grouped, per-volume progress bars, series-level and per-volume immersion stats
- **Zoom & pan** — mouse wheel zoom, click-drag pan, double-click to reset
- **Zero dependencies** — pure Python stdlib `http.server`, no pip install required

## Quick Start

### From source

```
git clone https://github.com/thelow59/Mokuyomi.git
cd Mokuyomi
mkdir -p manga/<series>/<volume>
# Place your Mokuro .mokuro file and images there
python3 mokuyomi.py         # starts server + opens browser
```

### From installer (recommended for non-technical users)

Download the latest installer from the [Releases](https://github.com/thelow59/Mokuyomi/releases) page:

| Platform | File | What to do |
|---|---|---|
| **Windows** | `Mokuyomi-Setup.exe` | Double-click → follow the wizard → Start Menu shortcut |
| **Linux** | `Mokuyomi-Installer.run` | `chmod +x Mokuyomi-Installer.run && ./Mokuyomi-Installer.run` or right-click → Properties → "Allow executing" → double-click |

Both installers can optionally enable **autostart on boot** during installation.

The server runs at `http://localhost:8080` by default. Close the window to stop.

## Launcher (source only)

Double-click **`mokuyomi.py`** (or **`start.bat`** on Windows) to start the server and open your browser automatically. Close the window to stop.

## Auto-start on boot (source only)

Double-click **`install.bat`** (Windows) or **`install.sh`** (Linux) to make Mokuyomi launch automatically when you log in. A terminal window will walk you through it.

## Structure

```
manga/
├── <series_dir>/
│   ├── <volume_dir>/
│   │   ├── 001.jpg
│   │   └── ...
│   └── <volume_dir>.mokuro
└── ...
```

Each series directory contains one `.mokuro` file per volume at the series root, and an image directory per volume. This matches the standard Mokuro output structure.

## Configuration

| Env var | Default | Description |
|---|---|---|
| `PORT` | `8080` | Server port |
| `HOST` | `0.0.0.0` | Bind address |

## Routes

| Path | Description |
|---|---|
| `#/` | Library — series grid |
| `#/series/<dir>` | Volume list for a series |
| `#/reader/<series>/<volume>` | Reader |

## Building installers

Run the build script on the target platform. All dependencies are auto-installed.

### Windows installer (`Mokuyomi-Setup.exe`)

```
build_windows.bat
```

Requires: Python + [NSIS](https://nsis.sourceforge.io/Download) (auto-installs PyInstaller via pip).

### Linux installer (`Mokuyomi-Installer.run`)

```
./build_linux.sh
```

Requires: `makeself` (auto-installed via apt/dnf/pacman if missing).

## Tech

- Python 3 stdlib (`http.server.ThreadingHTTPServer`)
- Vanilla JS (no framework, no bundler)
- Yomitan integration via DOM text overlays
- JSON file persistence (`progress.json`, `immersion.json`)
