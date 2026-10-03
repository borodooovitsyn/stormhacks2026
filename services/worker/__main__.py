"""Live worker: `python -m services.worker` against a running API."""

from __future__ import annotations

import os
import time

import httpx

from services.worker.client import BackendClient
from services.worker.loop import run_one


def main() -> None:
    base = os.environ.get("API_URL", "http://localhost:8000")
    worker_id = os.environ.get("WORKER_ID", "worker-local")
    rate = float(os.environ.get("RATE_USD_PER_HOUR", "0.50"))
    print(f"worker {worker_id} -> {base} @ ${rate}/hr (Ctrl-C to stop)")
    with httpx.Client(base_url=base, timeout=10) as http:
        client = BackendClient(http)
        while True:
            summary = run_one(
                client, worker_id,
                rate_usd_per_hour=rate,
                duration_seconds=20, interval_seconds=2,
                sleep=time.sleep,
            )
            print(summary)


if __name__ == "__main__":
    main()
