@echo off
REM SuperKupon — Backend launcher
REM Double-click this file kapan aja butuh start FastAPI
REM Port 8001 (bukan 8000 karena bentrok sama project tetangga)

title SuperKupon Backend - port 8001

echo Starting SuperKupon FastAPI backend on port 8001...
echo.

cd /d "%~dp0backend"

REM Cek venv ada
if not exist ".venv\Scripts\uvicorn.exe" (
  echo ERROR: venv belum ada di backend\.venv
  echo Setup: cd backend ^&^& python -m venv .venv ^&^& .venv\Scripts\pip install -r requirements.txt
  pause
  exit /b 1
)

REM Cek port 8001 belum dipake
netstat -ano | findstr ":8001" | findstr "LISTENING" >nul
if not errorlevel 1 (
  echo WARNING: Port 8001 udah dipake. Mungkin backend udah jalan?
  echo Kalau mau force restart, kill dulu process di port 8001.
  pause
  exit /b 1
)

REM Run uvicorn
.venv\Scripts\uvicorn.exe app.main:app --host 127.0.0.1 --port 8001 --log-level info

REM Kalau exit, pause biar user bisa baca error
echo.
echo Backend exited. Press any key to close...
pause >nul
