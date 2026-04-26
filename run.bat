@echo off
setlocal

echo --------------------------------------------------
echo   Reversa Local Server
echo --------------------------------------------------
echo.

:: Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python not found.
    pause
    exit /b
)

echo Starting servers...
echo [1/2] Starting Smart Audio Server (port 8081)...
start "Reversa Smart Audio Server" cmd /k "python server.py"

echo [2/2] Starting Frontend Server (port 8000)...
start http://localhost:8000/index.html

:: Start Python's built-in HTTP server
python -m http.server 8000
