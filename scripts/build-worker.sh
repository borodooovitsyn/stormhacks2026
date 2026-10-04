#!/usr/bin/env bash
# Bundle the worker into a standalone binary (macOS/Linux). Run from repo root or anywhere.
set -euo pipefail
cd "$(dirname "$0")/.."
PY="${PY:-.venv/bin/python}"
rm -f apps/desktop/bin/corewhore-worker apps/desktop/bin/coreshare-worker
rm -rf build/pyi/corewhore-worker build/pyi/coreshare-worker
rm -f build/pyi/corewhore-worker.spec build/pyi/coreshare-worker.spec
"$PY" -m PyInstaller --onefile --name coreshare-worker --paths . \
  --hidden-import=httpx \
  --distpath apps/desktop/bin --workpath build/pyi --specpath build/pyi \
  worker_entry.py
echo "built -> apps/desktop/bin/coreshare-worker"
