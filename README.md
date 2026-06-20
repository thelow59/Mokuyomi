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

```
git clone https://github.com/thelow59/Mokuyomi.git
cd Mokuyomi
mkdir -p manga/<series>/<volume>
# Place your Mokuro .mokuro file and images there
python3 server.py
```

Open `http://localhost:8080` in your browser.

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

## Tech

- Python 3 stdlib (`http.server.ThreadingHTTPServer`)
- Vanilla JS (no framework, no bundler)
- Yomitan integration via DOM text overlays
- JSON file persistence (`progress.json`, `immersion.json`)
