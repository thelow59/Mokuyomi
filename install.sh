#!/usr/bin/env bash
echo "============================================"
echo "      Mokuyomi - One-click Install"
echo "============================================"
echo ""

if ! command -v python3 &>/dev/null; then
    echo "Python 3 is not installed!"
    echo ""
    echo "Install it with your package manager:"
    echo "  Ubuntu/Debian: sudo apt install python3"
    echo "  Fedora:        sudo dnf install python3"
    echo "  Arch:          sudo pacman -S python"
    echo ""
    read -rp "Press Enter to close..."
    exit 1
fi

python3 install.py
if [ $? -ne 0 ]; then
    echo ""
    echo "Something went wrong. Try running: python3 install.py"
    read -rp "Press Enter to close..."
    exit 1
fi

echo ""
echo "============================================"
echo "  Done! Mokuyomi will start automatically"
echo "  next time you log in."
echo "============================================"
echo ""
read -rp "Press Enter to close..."
