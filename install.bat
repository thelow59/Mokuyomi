@echo off
title Mokuyomi Installer
chcp 65001 >nul

echo ============================================
echo       Mokuyomi - One-click Install
echo ============================================
echo.

where python >nul 2>nul
if %errorlevel% neq 0 (
    echo Python is not installed!
    echo.
    echo You need Python to run Mokuyomi.
    echo Download it from: https://python.org/downloads
    echo Make sure to check "Add Python to PATH" during installation.
    echo.
    start https://python.org/downloads
    pause
    exit /b 1
)

echo Python found! Setting up autostart...
echo.
python install.py
if %errorlevel% neq 0 (
    echo.
    echo Something went wrong. Try running "python install.py" manually.
    pause
    exit /b 1
)

echo.
echo ============================================
echo  Done! Mokuyomi will start automatically
echo  next time you log in.
echo ============================================
echo.
pause
