"""Worker loop: claim a chunk, run it, report metrics per sample, complete."""

from __future__ import annotations

from typing import Callable

from services.worker.client import BackendClient
from services.worker.runner import fake_run


def run_one(
    client: BackendClient,
    worker_id: str,
    *,
    rate_usd_per_hour: float,
    duration_seconds: float,
    interval_seconds: float,
    seed: int | None = None,
    sleep: Callable[[float], None] = lambda _s: None,
) -> dict:
    chunk = client.claim(worker_id)
    reported = 0
    total_cost = 0.0
    for sample in fake_run(duration_seconds, interval_seconds, rate_usd_per_hour, seed):
        client.report_metric(worker_id, chunk["job_id"], sample)
        reported += 1
        total_cost += sample.cost_usd
        sleep(interval_seconds)
    client.complete(chunk["chunk_id"])
    return {
        "chunk_id": chunk["chunk_id"],
        "samples_reported": reported,
        "total_cost_usd": total_cost,
        "completed": True,
    }
