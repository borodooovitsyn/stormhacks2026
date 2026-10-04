#!/usr/bin/env bash
# First-run provider setup (macOS): install + start Docker Desktop, then wait for it.
set -uo pipefail

if docker info >/dev/null 2>&1; then
  echo "Docker is already running."
  exit 0
fi

if [ ! -d "/Applications/Docker.app" ]; then
  arch="$(uname -m)"
  url="https://desktop.docker.com/mac/main/arm64/Docker.dmg"
  [ "$arch" = "x86_64" ] && url="https://desktop.docker.com/mac/main/amd64/Docker.dmg"
  tmp="$(mktemp -d)"
  echo "Downloading Docker Desktop…"
  curl -fL "$url" -o "$tmp/Docker.dmg" || { echo "Download failed. Install Docker Desktop manually: https://www.docker.com/products/docker-desktop/"; exit 1; }
  echo "Installing Docker Desktop — approve the macOS prompt…"
  hdiutil attach "$tmp/Docker.dmg" -nobrowse -quiet
  osascript -e 'do shell script "cp -R /Volumes/Docker/Docker.app /Applications/" with administrator privileges'
  hdiutil detach "/Volumes/Docker" -quiet || true
  rm -rf "$tmp"
fi

echo "Starting Docker…"
open -a Docker || true
echo "Waiting for Docker to start (up to ~2 min)…"
for _ in $(seq 1 60); do
  if docker info >/dev/null 2>&1; then echo "Docker is ready."; exit 0; fi
  sleep 2
done
echo "Docker installed. If it's not ready, open Docker Desktop, accept the license, then click Re-check."
