@echo off
if not "%CI%"=="" setlocal enabledelayedexpansion

if "%CI%"=="" (
    title Mokuyomi Build Tool
    chcp 65001 >nul
)

echo ============================================
echo     Mokuyomi - Windows Build Script
echo ============================================
echo.

REM --- Check Python ---
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [FAIL] Python not found.
    echo        Download from: https://python.org/downloads
    if "%CI%"=="" pause
    exit /b 1
)

REM --- Check PyInstaller ---
python -c "import PyInstaller" 2>nul
if %errorlevel% neq 0 (
    echo [..] Installing PyInstaller...
    pip install pyinstaller
    if %errorlevel% neq 0 (
        echo [FAIL] Failed to install PyInstaller.
        if "%CI%"=="" pause
        exit /b 1
    )
)

REM --- Check NSIS ---
set NSIS_PATH=%ProgramFiles(x86)%\NSIS\makensis.exe
if not exist "%NSIS_PATH%" (
    set NSIS_PATH=%ProgramFiles%\NSIS\makensis.exe
)
if not exist "%NSIS_PATH%" (
    where makensis >nul 2>nul
    if %errorlevel% equ 0 (
        set NSIS_PATH=makensis
    ) else (
        echo [FAIL] NSIS not found.
        echo        Download from: https://nsis.sourceforge.io/Download
        if "%CI%"=="" pause
        exit /b 1
    )
)

echo [OK] All tools found.
echo.
echo [..] Building Mokuyomi.exe with PyInstaller...
echo.

pyinstaller --onefile --console --name Mokuyomi --add-data "index.html;." --add-data "style.css;." --add-data "app.js;." --add-data "icon.svg;." --distpath dist_pyinstaller --workpath build_pyinstaller --specpath . mokuyomi.py

if %errorlevel% neq 0 (
    echo [FAIL] PyInstaller build failed.
    if "%CI%"=="" pause
    exit /b 1
)

echo.
echo [OK] Mokuyomi.exe built.
echo.
echo [..] Building Mokuyomi-Setup.exe with NSIS...
echo.

if not exist dist mkdir dist
"%NSIS_PATH%" installer.nsi
if %errorlevel% neq 0 (
    echo [FAIL] NSIS build failed.
    if "%CI%"=="" pause
    exit /b 1
)

echo.
echo ============================================
echo  Done!
echo  Installer: dist\Mokuyomi-Setup.exe
echo ============================================
echo.
if "%CI%"=="" pause
