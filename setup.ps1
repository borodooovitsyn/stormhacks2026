# GPU Share — one-command Windows provider setup.
# Run in an ADMIN PowerShell from the repo folder:
#   powershell -ExecutionPolicy Bypass -File .\setup.ps1
#Requires -RunAsAdministrator

$ErrorActionPreference = "Stop"
Write-Host "=== GPU Share provider setup ===" -ForegroundColor Cyan

function Test-Wsl2Ready {
    try { wsl --status *> $null; return ($LASTEXITCODE -eq 0) } catch { return $false }
}

# 1. WSL2 + Ubuntu (needs a reboot the first time on a fresh machine)
if (-not (Test-Wsl2Ready)) {
    Write-Host "Enabling WSL2 + installing Ubuntu..." -ForegroundColor Yellow
    wsl --install -d Ubuntu
    Write-Host "`n>> If Windows asks you to REBOOT, reboot and re-run this script. <<`n" -ForegroundColor Yellow
    exit 0
}

if (((wsl --list --quiet) -join "`n") -notmatch "Ubuntu") {
    Write-Host "Installing Ubuntu distro..." -ForegroundColor Yellow
    wsl --install -d Ubuntu
    Write-Host "Ubuntu installed. Re-run this script once it has finished first-time setup." -ForegroundColor Yellow
    exit 0
}

wsl --set-default-version 2 *> $null

# 2. Run the Linux-side setup inside WSL (as root, non-interactive)
$repoWin = $PSScriptRoot
$repoWsl = (wsl wslpath -a "$repoWin").Trim()
Write-Host "Running Linux setup inside WSL ($repoWsl)..." -ForegroundColor Cyan
wsl -d Ubuntu -u root -- bash -lc "cd '$repoWsl' && bash scripts/setup-wsl.sh"

Write-Host "`n=== Setup complete. To start sharing your GPU: ===" -ForegroundColor Green
Write-Host "   wsl -d Ubuntu -- bash -lc 'cd $repoWsl && make api'     # terminal 1"
Write-Host "   wsl -d Ubuntu -- bash -lc 'cd $repoWsl && make worker'  # terminal 2"
Write-Host "   (or just open the GPU Share desktop app)"
