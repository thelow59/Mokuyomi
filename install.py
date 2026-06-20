#!/usr/bin/env python3
import os
import sys
import shutil
import subprocess
import platform

def get_mokuyomi_path():
    return os.path.join(os.path.dirname(os.path.abspath(__file__)), "mokuyomi.py")

def install_linux():
    autostart_dir = os.path.expanduser("~/.config/autostart")
    os.makedirs(autostart_dir, exist_ok=True)
    desktop = os.path.join(autostart_dir, "mokuyomi.desktop")
    content = f"""[Desktop Entry]
Type=Application
Name=Mokuyomi
Exec={sys.executable} {get_mokuyomi_path()}
Terminal=true
StartupNotify=false
X-GNOME-Autostart-enabled=true
"""
    with open(desktop, "w") as f:
        f.write(content)
    os.chmod(desktop, 0o755)
    print(f" Autostart created: {desktop}")

def install_windows():
    startup = os.path.join(
        os.environ.get("APPDATA", ""),
        r"Microsoft\Windows\Start Menu\Programs\Startup",
    )
    if not os.path.isdir(startup):
        print("Could not find Startup folder.")
        return
    vbs = os.path.join(startup, "Mokuyomi.vbs")
    content = f"""Set WshShell = CreateObject("WScript.Shell")
WshShell.Run chr(34) & "{sys.executable}" & chr(34) & " {get_mokuyomi_path()}", 0, False
"""
    with open(vbs, "w") as f:
        f.write(content)
    print(f" Autostart created: {vbs}")

def install():
    system = platform.system()
    if system == "Linux":
        install_linux()
    elif system == "Windows":
        install_windows()
    else:
        print(f"Unsupported platform: {system}")
        sys.exit(1)
    print(" Mokuyomi will start automatically on boot.")

if __name__ == "__main__":
    install()
