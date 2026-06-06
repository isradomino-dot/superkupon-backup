@echo off
REM ============================================================
REM   SuperKupon — Auto Start Script
REM   Double-click file ini untuk nyalain backend + web sekaligus
REM ============================================================

echo.
echo ============================================================
echo   SuperKupon Auto-Start
echo ============================================================
echo.

cd /d "%~dp0"

echo [1/3] Starting BACKEND on port 8000...
start "SuperKupon Backend" cmd /k "cd /d %~dp0backend && .\.venv\Scripts\activate.bat && uvicorn app.main:app --port 8000"

timeout /t 5 /nobreak >nul

echo [2/3] Starting WEB on port 3010...
start "SuperKupon Web" cmd /k "cd /d %~dp0web && npm run dev"

timeout /t 8 /nobreak >nul

echo [3/3] Opening browser...
start "" "http://localhost:3010"

echo.
echo ============================================================
echo   Server jalan di 2 jendela cmd terpisah.
echo   Untuk stop: tutup kedua jendela cmd tsb.
echo ============================================================
echo.
pause
