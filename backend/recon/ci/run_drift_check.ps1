# =============================================================================
# Endpoint Drift Check — scheduled task entry point
# =============================================================================
# Schedule via Task Scheduler (Windows):
#   1. taskschd.msc → Create Basic Task
#   2. Trigger: Weekly (mis. setiap Senin 02:00 WIB)
#   3. Action: Start a program
#      - Program: powershell.exe
#      - Arguments: -NoProfile -ExecutionPolicy Bypass -File "D:\Users\user27\coupon-aggregator\backend\recon\ci\run_drift_check.ps1"
#
# Atau cron-like via schtasks:
#   schtasks /Create /SC WEEKLY /D MON /ST 02:00 /TN "CouponReconDrift" `
#     /TR "powershell -NoProfile -ExecutionPolicy Bypass -File D:\Users\user27\coupon-aggregator\backend\recon\ci\run_drift_check.ps1"
# =============================================================================
param(
    [string[]]$Merchants = @("dana", "ovo", "tixid"),
    [switch]$Notify
)

$ErrorActionPreference = "Continue"

$root = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $PSCommandPath))
$venvPython = Join-Path $root ".venv\Scripts\python.exe"
$systemPython = "python"
$python = if (Test-Path $venvPython) { $venvPython } else { $systemPython }

Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "  Coupon Recon — Endpoint Drift Check" -ForegroundColor Cyan
Write-Host "  $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan

$anyDrift = $false

foreach ($merchant in $Merchants) {
    Write-Host ""
    Write-Host "  ▶ Checking: $merchant" -ForegroundColor Yellow

    $args = @("-m", "recon.ci.drift_notifier", "--merchant", $merchant)
    if ($Notify) {
        $args += "--notify"
    }

    & $python @args
    $exit = $LASTEXITCODE

    switch ($exit) {
        0 { Write-Host "    ✓ No drift ($merchant)" -ForegroundColor Green }
        2 { Write-Host "    ⚠ DRIFT DETECTED ($merchant)" -ForegroundColor Red; $anyDrift = $true }
        default { Write-Host "    ✗ Error exit=$exit ($merchant)" -ForegroundColor DarkRed }
    }
}

Write-Host ""
Write-Host "==============================================" -ForegroundColor Cyan
if ($anyDrift) {
    Write-Host "  Result: DRIFT DETECTED — re-recon recommended" -ForegroundColor Red
    exit 2
} else {
    Write-Host "  Result: All schemas stable" -ForegroundColor Green
    exit 0
}
