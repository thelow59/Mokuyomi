#!/usr/bin/env python3
import subprocess
import sys
import webbrowser
import os
import time

def main():
    server_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(server_dir)
    port = os.environ.get("PORT", "8080")
    host = os.environ.get("HOST", "0.0.0.0")

    proc = subprocess.Popen(
        [sys.executable, "-u", "server.py"],
        env={**os.environ, "PORT": port, "HOST": host},
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
    )

    time.sleep(1)
    webbrowser.open(f"http://localhost:{port}")
    print(f"\n  Mokuyomi running at http://localhost:{port}")
    print("  Close this window to stop the server.\n")

    try:
        for line in proc.stdout:
            sys.stdout.write(line.decode())
    except (BrokenPipeError, KeyboardInterrupt):
        pass
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()

if __name__ == "__main__":
    main()
