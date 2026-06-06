@echo off
REM ============================================================
REM  SuperKupon Backend → Railway Deploy (one-click)
REM  Run dari project root: D:\Users\user27\coupon-aggregator
REM ============================================================

setlocal enabledelayedexpansion

echo.
echo [1/5] Cek Railway CLI...
where railway >nul 2>&1
if errorlevel 1 (
    echo [!] Railway CLI belum ke-install. Installing via npm...
    call npm install -g @railway/cli
    if errorlevel 1 (
        echo [X] Gagal install. Coba manual: npm install -g @railway/cli
        exit /b 1
    )
)
railway --version

echo.
echo [2/5] Pindah ke folder backend/...
cd /d "%~dp0backend"
if errorlevel 1 (
    echo [X] Folder backend/ tidak ditemukan.
    exit /b 1
)
echo Working dir: %CD%

echo.
echo [3/5] Cek login Railway...
railway whoami >nul 2>&1
if errorlevel 1 (
    echo.
    echo ============================================================
    echo [!] Belum login. Browser akan kebuka.
    echo     Login pakai akun Railway, balik ke sini setelah "Logged in".
    echo ============================================================
    echo.
    pause
    call railway login
    if errorlevel 1 (
        echo [X] Login gagal.
        exit /b 1
    )
)

echo.
echo [4/5] Link/create project + Postgres...
echo ============================================================
echo  Pertanyaan setup pertama kali:
echo    Create new project? .......... y
echo    Project name? ................ superkupon-backend
echo    Environment? ................. production
echo.
echo  Setelah project dibuat, TAMBAH Postgres dari dashboard:
echo    https://railway.com/dashboard
echo    Project ^> New ^> Database ^> Add PostgreSQL
echo    (DATABASE_URL otomatis ter-inject ke service)
echo ============================================================
echo.
call railway link
if errorlevel 1 (
    echo [!] Skip link — assume project sudah linked.
)

echo.
echo [5/5] Deploy via railway up...
echo ============================================================
echo  Build pake Dockerfile, deploy ke region default.
echo  Tunggu sampe "Deployment successful" — URL akan tampil.
echo ============================================================
echo.
call railway up --detach

echo.
echo ============================================================
echo  DONE.
echo.
echo  Next steps di Railway dashboard:
echo  1. Project ^> Settings ^> Networking ^> Generate Domain
echo  2. Copy URL: https://superkupon-backend-XXX.up.railway.app
echo  3. Set di Vercel project env var:
echo     NEXT_PUBLIC_API_BASE = https://YOUR-railway-url
echo  4. Re-deploy frontend: cd web ^&^& vercel --prod
echo ============================================================
echo.
pause
