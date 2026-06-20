#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
OUTPUT="$SCRIPT_DIR/Mokuyomi-Installer.run"

echo "============================================"
echo "    Mokuyomi - Linux Build Script"
echo "============================================"
echo ""

if ! command -v makeself &>/dev/null; then
    echo "[..] Installing makeself..."
    if command -v apt-get &>/dev/null; then
        sudo apt-get install -y makeself
    elif command -v dnf &>/dev/null; then
        sudo dnf install -y makeself
    elif command -v pacman &>/dev/null; then
        sudo pacman -S --noconfirm makeself
    else
        echo "[FAIL] Please install makeself manually:"
        echo "       https://github.com/megastep/makeself"
        exit 1
    fi
fi

echo "[OK] makeself found."
echo ""

# Prepare payload directory
PAYLOAD="$SCRIPT_DIR/build_payload"
mkdir -p "$PAYLOAD/files"

echo "[..] Copying files..."
cp "$SCRIPT_DIR/server.py"     "$PAYLOAD/files/"
cp "$SCRIPT_DIR/mokuyomi.py"   "$PAYLOAD/files/"
cp "$SCRIPT_DIR/index.html"    "$PAYLOAD/files/"
cp "$SCRIPT_DIR/style.css"     "$PAYLOAD/files/"
cp "$SCRIPT_DIR/app.js"        "$PAYLOAD/files/"
cp "$SCRIPT_DIR/.gitignore"    "$PAYLOAD/files/"
cp "$SCRIPT_DIR/install.py"    "$PAYLOAD/files/"
cp "$SCRIPT_DIR/LICENSE.txt"   "$PAYLOAD/files/"

# Create setup script
cat > "$PAYLOAD/setup.sh" << 'SETUPEOF'
#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
INSTALL_DIR="$HOME/.local/share/mokuyomi"
APPLICATIONS_DIR="$HOME/.local/share/applications"

echo ""
echo "============================================"
echo "     Mokuyomi - Linux Installer"
echo "============================================"
echo ""

echo "[..] Installing to $INSTALL_DIR"
mkdir -p "$INSTALL_DIR"
cp -r "$SCRIPT_DIR/files/"* "$INSTALL_DIR/"
chmod +x "$INSTALL_DIR/mokuyomi.py"

echo "[OK] Files installed."

# Create desktop entry
mkdir -p "$APPLICATIONS_DIR"
cat > "$APPLICATIONS_DIR/mokuyomi.desktop" << EOF
[Desktop Entry]
Type=Application
Name=Mokuyomi
Comment=Mokuro manga reader with Yomitan support
Exec=$INSTALL_DIR/mokuyomi.py
Icon=$INSTALL_DIR/icon.png
Terminal=true
Categories=Graphics;Viewer;
StartupNotify=false
EOF

echo "[OK] Desktop shortcut created."

# Ask about autostart
echo ""
read -rp "Start Mokuyomi automatically when you log in? (y/N): " autostart
case "$autostart" in
    [Yy]*)
        mkdir -p "$HOME/.config/autostart"
        cp "$APPLICATIONS_DIR/mokuyomi.desktop" "$HOME/.config/autostart/"
        echo "[OK] Autostart enabled."
        ;;
    *)
        echo "[..] Skipped autostart."
        ;;
esac

echo ""
echo "============================================"
echo "  Done! You can now:"
echo "  - Run:  $INSTALL_DIR/mokuyomi.py"
echo "  - Or launch Mokuyomi from your app menu"
echo "============================================"
echo ""
read -rp "Press Enter to close..."
SETUPEOF

chmod +x "$PAYLOAD/setup.sh"

echo "[..] Building Mokuyomi-Installer.run..."
makeself "$PAYLOAD" "$OUTPUT" "Mokuyomi Installer" ./setup.sh
echo "[OK] Built: $OUTPUT"

# Cleanup
rm -rf "$PAYLOAD"

echo ""
echo "============================================"
echo "  Done! Share Mokuyomi-Installer.run"
echo "============================================"
echo ""
