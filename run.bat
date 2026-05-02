@echo off
setlocal

:: ==================================================
:: Reversa Startup Script
:: 
:: [Usage]
:: Just double-click this file to:
:: 1. Check Python environment
:: 2. Start Smart Audio Server (Port 8081)
:: 3. Start Frontend Server (Port 8000)
:: 4. Open app in your browser automatically
:: ==================================================

echo --------------------------------------------------
echo   Reversa Local Development Server
echo --------------------------------------------------
echo.

:: Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python not found.
    echo Please install Python and add it to your PATH.
    pause
    exit /b
)

echo Starting servers...
echo.

:: [1/2] Start Backend Audio Server (New Window)
echo [1/2] Starting Audio Analysis Server (Port 8081)...
start "Reversa Audio Server" cmd /k "chcp 65001 > nul && python server.py"

:: [2/2] Start Frontend Server and Open Browser
echo [2/2] Starting App Server (Port 8000)...
echo.
echo Opening app: http://localhost:8000/index.html
echo.
start http://localhost:8000/index.html

:: Start Python's built-in HTTP server (Block this window)
python -m http.server 8000
