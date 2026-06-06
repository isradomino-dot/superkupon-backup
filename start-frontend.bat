@echo off
REM SuperKupon — Frontend launcher
REM Double-click ini buat start Next.js dev di port 3010
REM .env.local di web/ udah pointing ke backend port 8001

title SuperKupon Frontend - port 3010

echo Starting SuperKupon Next.js dev server on port 3010...
echo.

cd /d "%~dp0web"

REM Cek node_modules ada
if not exist "node_modules" (
  echo ERROR: node_modules belum ada di web\node_modules
  echo Setup: cd web ^&^& npm install
  pause
  exit /b 1
)

REM Cek .env.local
if not exist ".env.local" (
  echo WARNING: web\.env.local gak ada — frontend bakal default ke port 8000 yang salah
  echo Bikin file .env.local berisi: NEXT_PUBLIC_API_BASE=http://localhost:8001
  pause
  exit /b 1
)

REM Cek port 3010 belum dipake
netstat -ano | findstr ":3010" | findstr "LISTENING" >nul
if not errorlevel 1 (
  echo WARNING: Port 3010 udah dipake. Mungkin frontend udah jalan?
  pause
  exit /b 1
)

REM Run Next.js dev
call npm run dev

echo.
echo Frontend exited. Press any key to close...
pause >nul
