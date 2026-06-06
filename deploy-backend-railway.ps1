# ============================================================
#  SuperKupon Backend → Railway Deploy (PowerShell)
#  Run: .\deploy-backend-railway.ps1
# ============================================================

$ErrorActionPreference = "Stop"
$projectRoot = $PSScriptRoot
$backendDir = Join-Path $projectRoot "backend"

Write-Host ""
Write-Host "[1/5] Cek Railway CLI..." -ForegroundColor Cyan
$rwCmd = Get-Command railway -ErrorAction SilentlyContinue
if (-not $rwCmd) {
    Write-Host "[!] Railway CLI belum ke-install. Installing via npm..." -ForegroundColor Yellow
    npm install -g "@railway/cli"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[X] Gagal install Railway CLI." -ForegroundColor Red
        exit 1
    }
}
& railway --version

Write-Host ""
Write-Host "[2/5] Pindah ke folder backend/..." -ForegroundColor Cyan
if (-not (Test-Path $backendDir)) {
    Write-Host "[X] Folder backend/ tidak ditemukan." -ForegroundColor Red
    exit 1
}
Set-Location $backendDir
Write-Host "Working dir: $(Get-Location)"

Write-Host ""
Write-Host "[3/5] Cek login Railway..." -ForegroundColor Cyan
& railway whoami 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Yellow
    Write-Host "[!] Belum login. Browser akan kebuka."
    Write-Host "    Login pakai akun Railway, balik ke sini setelah 'Logged in'."
    Write-Host "============================================================" -ForegroundColor Yellow
    Read-Host "Tekan Enter untuk lanjut"
    & railway login
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[X] Login gagal." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "[4/5] Link/create project + Postgres..." -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Green
Write-Host " Pertanyaan setup pertama kali:"
Write-Host "   Create new project? .......... y"
Write-Host "   Project name? ................ superkupon-backend"
Write-Host "   Environment? ................. production"
Write-Host ""
Write-Host " Setelah project dibuat, TAMBAH Postgres dari dashboard:"
Write-Host "   https://railway.com/dashboard"
Write-Host "   Project > New > Database > Add PostgreSQL"
Write-Host "   (DATABASE_URL otomatis ter-inject ke service)"
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
& railway link
if ($LASTEXITCODE -ne 0) {
    Write-Host "[!] Skip link — assume project sudah linked." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[5/5] Deploy via railway up..." -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Green
Write-Host " Build pake Dockerfile, deploy ke region default."
Write-Host " Tunggu sampe 'Deployment successful' - URL akan tampil."
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
& railway up --detach

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host " DONE."
Write-Host ""
Write-Host " Next steps di Railway dashboard:"
Write-Host " 1. Project > Settings > Networking > Generate Domain"
Write-Host " 2. Copy URL: https://superkupon-backend-XXX.up.railway.app"
Write-Host " 3. Set di Vercel project env var:"
Write-Host "    NEXT_PUBLIC_API_BASE = https://YOUR-railway-url"
Write-Host " 4. Re-deploy frontend: cd web; vercel --prod"
Write-Host "============================================================" -ForegroundColor Green
