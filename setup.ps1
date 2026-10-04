# First-run provider setup (Windows): WSL2 + Docker Desktop (silent), then wait.
# Launched elevated by the app. GPU works via Docker Desktop's WSL2 backend + NVIDIA driver.
$ErrorActionPreference = "Continue"

function DockerReady { docker info *> $null; return ($LASTEXITCODE -eq 0) }

if (DockerReady) { Write-Host "Docker is already running."; exit 0 }

Write-Host "Enabling WSL2 (may need a reboot the first time)..."
wsl --install --no-distribution 2>$null

$dockerExe = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
if (-not (Test-Path $dockerExe)) {
  $inst = "$env:TEMP\DockerDesktopInstaller.exe"
  Write-Host "Downloading Docker Desktop..."
  Invoke-WebRequest "https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe" -OutFile $inst
  Write-Host "Installing Docker Desktop (silent)..."
  Start-Process $inst -Wait -ArgumentList 'install','--quiet','--accept-license','--backend=wsl-2','--always-run-service'
}

if (Test-Path $dockerExe) {
  Write-Host "Starting Docker Desktop..."
  Start-Process $dockerExe
}

Write-Host "Waiting for Docker (up to ~3 min)..."
for ($i = 0; $i -lt 60; $i++) {
  if (DockerReady) { Write-Host "Docker is ready."; exit 0 }
  Start-Sleep 3
}
Write-Host "Docker installed. A reboot may be needed for WSL2 — reboot, relaunch CoreShare, then click Re-check."
