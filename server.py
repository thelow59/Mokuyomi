import http.server
import json
import os
import mimetypes
import urllib.parse
import posixpath
import sys

if getattr(sys, 'frozen', False):
    BASE_DIR = sys._MEIPASS
    DATA_DIR = os.path.dirname(sys.executable)
else:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    DATA_DIR = BASE_DIR

MANGA_DIR = "manga"
IMMERSION_PATH = os.path.join(DATA_DIR, "immersion.json")
PROGRESS_PATH = os.path.join(DATA_DIR, "progress.json")
PORT = int(os.environ.get("PORT", 8081))
HOST = os.environ.get("HOST", "0.0.0.0")


def load_immersion():
    try:
        with open(IMMERSION_PATH, encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def save_immersion(data):
    with open(IMMERSION_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False)


def load_progress():
    try:
        with open(PROGRESS_PATH, encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def save_progress(data):
    with open(PROGRESS_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False)


def scan_manga():
    volumes = []
    manga_path = os.path.join(DATA_DIR, MANGA_DIR)
    if not os.path.isdir(manga_path):
        return volumes
    for series_dir in sorted(os.listdir(manga_path)):
        series_path = os.path.join(manga_path, series_dir)
        if not os.path.isdir(series_path):
            continue
        for fname in sorted(os.listdir(series_path)):
            if not fname.endswith(".mokuro"):
                continue
            mokuro_path = os.path.join(series_path, fname)
            try:
                with open(mokuro_path, encoding="utf-8") as f:
                    data = json.load(f)
            except (json.JSONDecodeError, KeyError):
                continue
            volume_dir = fname[: -len(".mokuro")]
            cover = ""
            pages = data.get("pages", [])
            if pages:
                first_img = pages[0].get("img_path", "")
                if first_img:
                    cover = f"/{MANGA_DIR}/{series_dir}/{volume_dir}/{first_img}"
            volumes.append({
                "series": data.get("title", series_dir),
                "series_dir": series_dir,
                "volume": data.get("volume", volume_dir),
                "volume_dir": volume_dir,
                "volume_uuid": data.get("volume_uuid", ""),
                "title_uuid": data.get("title_uuid", ""),
                "page_count": len(pages),
                "chars": data.get("chars", 0),
                "cover": cover,
                "mokuro_path": f"{MANGA_DIR}/{series_dir}/{fname}",
            })
    return volumes


class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == "/api/volumes":
            self.send_json(scan_manga())
            return

        if path == "/api/immersion":
            self.send_json(load_immersion())
            return

        if path == "/api/progress":
            self.send_json(load_progress())
            return

        if path.startswith("/api/mokuro/"):
            rel_path = urllib.parse.unquote(path[len("/api/mokuro/"):])
            full_path = os.path.join(DATA_DIR, rel_path)
            if os.path.isfile(full_path):
                self.send_json_file(full_path)
            else:
                self.send_error(404)
            return

        if path == "/" or not self.has_file(path):
            self.serve_file("index.html")
            return

        super().do_GET()

    def do_POST(self):
        path = urllib.parse.urlparse(self.path).path
        if path == "/api/immersion":
            length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(length)
            try:
                data = json.loads(body)
                save_immersion(data)
                self.send_json({"ok": True})
            except (json.JSONDecodeError, ValueError):
                self.send_error(400, "Invalid JSON")
            return
        if path == "/api/progress":
            length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(length)
            try:
                data = json.loads(body)
                save_progress(data)
                self.send_json({"ok": True})
            except (json.JSONDecodeError, ValueError):
                self.send_error(400, "Invalid JSON")
            return
        self.send_error(404)

    def has_file(self, path):
        translated = self.translate_path(path)
        return os.path.isfile(translated)

    def serve_file(self, filename):
        path = os.path.join(BASE_DIR, filename)
        if not os.path.isfile(path):
            self.send_error(404)
            return
        content_type, _ = mimetypes.guess_type(filename)
        if content_type is None:
            content_type = "application/octet-stream"
        with open(path, "rb") as f:
            data = f.read()
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        self.wfile.write(data)

    def send_json(self, data):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def send_json_file(self, filepath):
        with open(filepath, encoding="utf-8") as f:
            data = json.load(f)
        self.send_json(data)

    def translate_path(self, path):
        path = path.split("?", 1)[0]
        path = path.split("#", 1)[0]
        path = urllib.parse.unquote(path)
        abspath = DATA_DIR
        path = posixpath.normpath(path).lstrip("/")
        for word in path.split("/"):
            if word in (os.curdir, os.pardir, ""):
                continue
            abspath = os.path.join(abspath, word)
        return abspath


def run():
    server = http.server.ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"Mokuro Reader running on http://{HOST}:{PORT}")
    print(f"Place mokuro-processed manga in ./{MANGA_DIR}/")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down.")
        server.server_close()


if __name__ == "__main__":
    run()
