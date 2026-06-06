# ============================================================
#  SuperKupon — One-click Vercel Deploy (PowerShell)
#  Run: .\deploy-vercel.ps1
# ============================================================

$ErrorActionPreference = "Stop"
$projectRoot = $PSScriptRoot
$webDir = Join-Path $projectRoot "web"

Write-Host ""
Write-Host "[1/4] Cek Vercel CLI..." -ForegroundColor Cyan
$vercelCmd = Get-Command vercel -ErrorAction SilentlyContinue
if (-not $vercelCmd) {
    Write-Host "[!] Vercel CLI belum ke-install. Installing globally..." -ForegroundColor Yellow
    npm install -g vercel
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[X] Gagal install Vercel CLI." -ForegroundColor Red
        exit 1
    }
}
& vercel --version

Write-Host ""
Write-Host "[2/4] Pindah ke folder web/..." -ForegroundColor Cyan
if (-not (Test-Path $webDir)) {
    Write-Host "[X] Folder web/ tidak ditemukan." -ForegroundColor Red
    exit 1
}
Set-Location $webDir
Write-Host "Working dir: $(Get-Location)"

Write-Host ""
Write-Host "[3/4] Cek login Vercel..." -ForegroundColor Cyan
& vercel whoami 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Yellow
    Write-Host "[!] Belum login ke Vercel."
    Write-Host "    Browser akan kebuka, login pakai akun Vercel kamu."
    Write-Host "    Setelah login muncul 'Success!', balik ke sini."
    Write-Host "============================================================" -ForegroundColor Yellow
    Read-Host "Tekan Enter untuk lanjut"
    & vercel login
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[X] Login gagal." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "[4/4] Deploy ke production..." -ForegroundColor Cyan
Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host " Pertanyaan setup pertama kali (jawab dengan default ENTER):"
Write-Host "   Set up and deploy? .................... y"
Write-Host "   Which scope? .......................... (akun kamu)"
Write-Host "   Link to existing project? ............. n"
Write-Host "   Project name? ......................... superkupon (atau enter)"
Write-Host "   In which directory? ................... ./"
Write-Host "   Want to override settings? ............ n"
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
& vercel --prod

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host " DONE! Salin URL 'Production:' di atas dan share."
Write-Host "============================================================" -ForegroundColor Green
