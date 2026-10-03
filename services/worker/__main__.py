"""Live worker: `python -m services.worker` against a running API."""

from __future__ import annotations

import os
import time

import httpx

from services.worker.client import BackendClient
from services.worker.gpu import has_nvidia_gpu
from services.worker.loop import run_one
from services.worker.runner import fake_run, gpu_run


def main() -> None:
    base = os.environ.get("API_URL", "http://localhost:8000")
    worker_id = os.environ.get("WORKER_ID", "worker-local")
    rate = float(os.environ.get("RATE_USD_PER_HOUR", "0.50"))
    duration, interval = 20.0, 2.0

    real = has_nvidia_gpu()
    mode = "real GPU (nvidia-smi)" if real else "fake (no NVIDIA GPU)"
    print(f"worker {worker_id} -> {base} @ ${rate}/hr | mode: {mode} (Ctrl-C to stop)")

    with httpx.Client(base_url=base, timeout=10) as http:
        client = BackendClient(http)
        while True:
            samples = (
                gpu_run(duration, interval, rate)
                if real
                else fake_run(duration, interval, rate)
            )
            summary = run_one(client, worker_id, samples, interval_seconds=interval, sleep=time.sleep)
            print(summary)


if __name__ == "__main__":
    main()
