#!/usr/bin/env bash
# Launch N workers against one backend to show a job sharded across GPUs.
# Usage: bash scripts/run-workers.sh [N]   (needs `make api` running)
set -euo pipefail

N="${1:-3}"
API="${API_URL:-http://localhost:8000}"
echo "launching $N workers -> $API  (Ctrl-C stops all)"

pids=()
cleanup() { kill "${pids[@]}" 2>/dev/null || true; }
trap cleanup INT TERM EXIT

for i in $(seq 1 "$N"); do
  WORKER_ID="worker-$i" API_URL="$API" WORKER_DURATION=4 WORKER_INTERVAL=1 \
    .venv/bin/python -m services.worker 2>&1 | sed "s/^/[worker-$i] /" &
  pids+=($!)
done
wait
