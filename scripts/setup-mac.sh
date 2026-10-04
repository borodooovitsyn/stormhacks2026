#!/usr/bin/env bash
# First-run provider setup for macOS. Macs have no NVIDIA GPU -> CPU/fake sharing.
set -euo pipefail
echo "== CoreWhore provider setup (macOS) =="
if command -v docker >/dev/null 2>&1; then
  echo "Docker found."
elif command -v brew >/dev/null 2>&1; then
  echo "Installing Docker Desktop via Homebrew..."
  brew install --cask docker || echo "Install Docker Desktop manually: https://www.docker.com/products/docker-desktop/"
else
  echo "Install Docker Desktop: https://www.docker.com/products/docker-desktop/"
fi
echo "Note: macOS has no NVIDIA GPU — this machine shares in CPU/fake mode."
echo "Real GPU jobs need an NVIDIA box (Windows/Linux)."
echo "== setup done =="
