# =============================================================================
# Start mitmproxy dengan custom addon untuk recon coupon
# =============================================================================
param(
    [int]$Port = 8080,
    [int]$WebPort = 8081,
    [string]$Mode = "web"  # web | terminal
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
$addon = Join-Path $root "mitmproxy\addon_capture.py"
$confDir = Join-Path $root "mitmproxy\.mitmproxy"

if (-not (Test-Path $confDir)) {
    New-Item -ItemType Directory -Path $confDir -Force | Out-Null
}

Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "  Coupon Recon — mitmproxy launcher" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "  Addon       : $addon"
Write-Host "  Listen port : $Port"
Write-Host "  Web UI      : http://127.0.0.1:$WebPort"
Write-Host "  Conf dir    : $confDir"
Write-Host ""
Write-Host "  Setup proxy di emulator:"
Write-Host "    Settings > WiFi > Modify > Advanced > Proxy: Manual"
Write-Host "    Hostname: 10.0.2.2  (Android Studio emulator)"
Write-Host "    Hostname: <host-IP> (untuk Genymotion / device fisik)"
Write-Host "    Port: $Port"
Write-Host ""
Write-Host "  Ctrl+C untuk stop. HAR + audit log auto-saved." -ForegroundColor Yellow
Write-Host ""

if ($Mode -eq "web") {
    mitmweb --listen-host 0.0.0.0 --listen-port $Port `
            --web-host 127.0.0.1 --web-port $WebPort `
            -s $addon `
            --set confdir=$confDir
} else {
    mitmproxy --listen-host 0.0.0.0 --listen-port $Port `
              -s $addon `
              --set confdir=$confDir
}
