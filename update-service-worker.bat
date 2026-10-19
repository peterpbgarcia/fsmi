
@echo off
setlocal
title FSMI Congregation App - Service Worker Updater

echo ==========================================
echo   FSMI - SERVICE WORKER UPDATE
echo ==========================================
echo.

cd /d "%~dp0"

if not exist "service-worker.js" (
    echo ERROR: service-worker.js not found!
    pause
    exit /b 1
)

if not exist "update-service-worker.ps1" (
    echo ERROR: update-service-worker.ps1 not found!
    pause
    exit /b 1
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0update-service-worker.ps1"

echo.
pause
