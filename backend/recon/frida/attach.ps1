# =============================================================================
# Frida attach launcher
# =============================================================================
# Usage:
#   .\attach.ps1 -App "id.dana"
#   .\attach.ps1 -App "id.ovo" -Spawn
#   .\attach.ps1 -App "com.tix.id" -ExtraScript ".\dana_signature_decoder.js"
#
param(
    [Parameter(Mandatory = $true)]
    [string]$App,

    [switch]$Spawn,                 # spawn fresh instead of attach (helpful kalau pinning di-init di startup)

    [string]$ExtraScript,           # optional additional Frida script

    [string]$Device                 # specific device serial, default = USB device pertama
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $PSCommandPath
$bypass = Join-Path $scriptDir "ssl_pinning_bypass.js"

$fridaArgs = @("-U")

if ($Device) {
    $fridaArgs = @("-D", $Device)
}

if ($Spawn) {
    $fridaArgs += @("-f", $App, "--no-pause")
} else {
    $fridaArgs += @($App)
}

$fridaArgs += @("-l", $bypass)

if ($ExtraScript -and (Test-Path $ExtraScript)) {
    $fridaArgs += @("-l", $ExtraScript)
}

Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "  Coupon Recon — Frida attach" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "  Target app   : $App"
Write-Host "  Mode         : $(if ($Spawn) {'Spawn'} else {'Attach'})"
Write-Host "  Bypass script: $bypass"
if ($ExtraScript) {
    Write-Host "  Extra script : $ExtraScript"
}
Write-Host ""
Write-Host "  Pastikan:" -ForegroundColor Yellow
Write-Host "    1. Emulator/device ready & frida-server jalan"
Write-Host "    2. mitmproxy sudah listening (.\..\\mitmproxy\\start.ps1)"
Write-Host "    3. Proxy emulator pointing ke mitmproxy"
Write-Host ""
Write-Host "Command: frida $($fridaArgs -join ' ')" -ForegroundColor Gray
Write-Host ""

& frida @fridaArgs
