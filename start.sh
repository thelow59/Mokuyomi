#!/usr/bin/env bash
DIR="$(cd "$(dirname "$0")" && pwd)"
nohup python3 "$DIR/mokuyomi.py" > /dev/null 2>&1 &
echo "Mokuyomi started in background (PID $!)"
