#!/usr/bin/env bash
DIR="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="/tmp/mokuyomi.pid"

case "${1:-start}" in
  stop)
    if [ -f "$PID_FILE" ]; then
      kill "$(cat "$PID_FILE")" 2>/dev/null
      rm -f "$PID_FILE"
      echo "Mokuyomi stopped."
    else
      pkill -f "python.*server\.py" 2>/dev/null && echo "Mokuyomi stopped." || echo "Not running."
    fi
    ;;
  restart)
    "$0" stop
    sleep 1
    "$0" start
    ;;
  start|*)
    if pgrep -f "python.*server\.py" >/dev/null; then
      echo "Already running."
      exit 0
    fi
    nohup python3 "$DIR/server.py" > /tmp/mokuyomi.log 2>&1 &
    echo $! > "$PID_FILE"
    echo "Mokuyomi started (PID $!) — http://localhost:8090"
    ;;
esac
