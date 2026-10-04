#!/usr/bin/env bash
# Linux-side (WSL2 Ubuntu) provider setup. Called by setup.ps1 as root.
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

echo "== system packages =="
apt-get update -y
apt-get install -y python3 python3-venv python3-pip git make curl ca-certificates gnupg espeak-ng

start_docker() {
  service docker start 2>/dev/null || systemctl start docker 2>/dev/null || (dockerd >/tmp/dockerd.log 2>&1 &)
  sleep 3
}

echo "== Docker engine =="
if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sh
fi
start_docker

echo "== NVIDIA Container Toolkit (GPU in Docker) =="
if ! command -v nvidia-ctk >/dev/null; then
  curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey \
    | gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
  curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list \
    | sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' \
    > /etc/apt/sources.list.d/nvidia-container-toolkit.list
  apt-get update -y
  apt-get install -y nvidia-container-toolkit
fi
nvidia-ctk runtime configure --runtime=docker || true
start_docker

echo "== verify GPU is visible to Docker =="
if docker run --rm --gpus all nvidia/cuda:12.4.1-base-ubuntu22.04 nvidia-smi; then
  GPU_OK=1
else
  GPU_OK=0
  echo "WARNING: GPU not visible in Docker. Check the NVIDIA driver on Windows (needs a recent Game Ready / Studio driver)."
fi

echo "== python env + worker image =="
make setup PYTHON=python3
if [ "$GPU_OK" = "1" ]; then make whisper-cuda; else make whisper-cpu; fi

echo ""
echo "== DONE =="
echo "Start the worker:  make api   (one terminal)   then   make worker   (another)"
