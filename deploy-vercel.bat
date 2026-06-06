@echo off
REM ============================================================
REM  SuperKupon — One-click Vercel Deploy
REM  Run from project root: D:\Users\user27\coupon-aggregator
REM ============================================================

setlocal enabledelayedexpansion

echo.
echo [1/4] Cek Vercel CLI...
where vercel >nul 2>&1
if errorlevel 1 (
    echo [!] Vercel CLI belum ke-install. Installing globally...
    call npm install -g vercel
    if errorlevel 1 (
        echo [X] Gagal install Vercel CLI. Coba manual: npm install -g vercel
        exit /b 1
    )
)
vercel --version

echo.
echo [2/4] Pindah ke folder web/...
cd /d "%~dp0web"
if errorlevel 1 (
    echo [X] Folder web/ tidak ditemukan.
    exit /b 1
)
echo Working dir: %CD%

echo.
echo [3/4] Cek login Vercel...
vercel whoami >nul 2>&1
if errorlevel 1 (
    echo.
    echo ============================================================
    echo [!] Belum login ke Vercel.
    echo     Browser akan kebuka, login pakai akun Vercel kamu.
    echo     Setelah login muncul "Success!", balik ke sini.
    echo ============================================================
    echo.
    pause
    call vercel login
    if errorlevel 1 (
        echo [X] Login gagal.
        exit /b 1
    )
)

echo.
echo [4/4] Deploy ke production...
echo.
echo ============================================================
echo  Pertanyaan setup pertama kali (jawab dengan default ENTER):
echo    Set up and deploy? .................... y
echo    Which scope? .......................... (akun kamu)
echo    Link to existing project? ............. n
echo    Project name? ......................... superkupon (atau enter)
echo    In which directory? ................... ./
echo    Want to override settings? ............ n
echo ============================================================
echo.
call vercel --prod

echo.
echo ============================================================
echo  DONE! Salin URL "Production:" di atas dan share.
echo ============================================================
echo.
pause
