#!/usr/bin/env python3
import sys
import os
import webbrowser
import threading
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import server


def main():
    port = int(os.environ.get("PORT", 8090))
    host = os.environ.get("HOST", "0.0.0.0")

    server.HOST = host
    server.PORT = port

    t = threading.Thread(target=server.run, daemon=True)
    t.start()

    time.sleep(1)
    webbrowser.open(f"http://localhost:{port}")
    print(f"\n  Mokuyomi running at http://localhost:{port}")
    print("  Close this window to stop the server.\n")

    try:
        while True:
            time.sleep(3600)
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
