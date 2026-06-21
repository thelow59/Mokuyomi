#!/usr/bin/env bash
DIR="$(cd "$(dirname "$0")" && pwd)"
PORT="${PORT:-8090}"

server_pid() {
  ss -tlnp 2>/dev/null | grep ":${PORT} " | grep -oP 'pid=\K\d+'
}

case "${1:-start}" in
  stop)
    pid=$(server_pid)
    if [ -n "$pid" ]; then
      kill "$pid" 2>/dev/null
      sleep 1
      echo "Mokuyomi stopped."
    else
      echo "Not running."
    fi
    ;;
  restart)
    "$0" stop
    sleep 1
    "$0" start
    ;;
  start|*)
    if [ -n "$(server_pid)" ]; then
      echo "Already running."
      exit 0
    fi
    nohup env PORT="$PORT" python3 -u "$DIR/server.py" > /tmp/mokuyomi.log 2>&1 &
    echo "Mokuyomi started (PID $!) — http://localhost:${PORT}"
    ;;
esac
