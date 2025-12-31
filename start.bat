@echo off
title Co-Fleeter System

cd /d "%~dp0"

if not exist node_modules (
    echo [INFO] First time setup detected. Installing Root dependencies...
    call npm install
)

if not exist "backend\node_modules" (
    echo [INFO] Installing Backend dependencies...
    cd backend
    call npm install
    cd ..
)

echo Starting Co-Fleeter...
echo.

echo Starting browser...
start /b cmd /c "timeout /t 3 >nul & start "" "http://localhost:8000""

call npm start

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] The program terminated with an error (Code: %errorlevel%).
    echo [CHECK] 1. Is Node.js installed?
    echo [CHECK] 2. Are ports 3000 or 8000 already in use?
    echo.
    echo Press any key to close...
    pause
)
