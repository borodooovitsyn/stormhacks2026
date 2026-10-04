#!/usr/bin/env bash
# Bundle the worker into a standalone binary (macOS/Linux). Run from repo root or anywhere.
set -euo pipefail
cd "$(dirname "$0")/.."
PY="${PY:-.venv/bin/python}"
"$PY" -m PyInstaller --onefile --name corewhore-worker --paths . \
  --hidden-import=httpx \
  --distpath apps/desktop/bin --workpath build/pyi --specpath build/pyi \
  worker_entry.py
echo "built -> apps/desktop/bin/corewhore-worker"
