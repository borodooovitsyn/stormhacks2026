"""Worker loop: claim a chunk, report each sample, complete."""

from __future__ import annotations

import time
from collections.abc import Callable, Iterable

from services.worker.client import BackendClient
from services.worker.metering import interval_cost
from services.worker.runner import Sample


def _is_idle(chunk: dict) -> bool:
    return chunk.get("job_type") == "idle" or not chunk.get("chunk_id")


def run_one(
    client: BackendClient,
    worker_id: str,
    samples: Iterable[Sample],
    *,
    interval_seconds: float,
    sleep: Callable[[float], None] = lambda _s: None,
) -> dict:
    chunk = client.claim(worker_id)
    if _is_idle(chunk):
        return {"idle": True}
    reported = 0
    total_cost = 0.0
    for sample in samples:
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


def run_job_once(
    client,
    worker_id: str,
    *,
    rate_usd_per_hour: float,
    run_job: Callable[[dict], bool],
    sample: Callable[[], tuple[float, int]],
    clock: Callable[[], float] = time.monotonic,
) -> dict:
    chunk = client.claim(worker_id)
    if _is_idle(chunk):
        return {"idle": True}
    started = clock()
    ok = run_job(chunk)
    elapsed = clock() - started
    util, vram = sample()
    cost = interval_cost(elapsed, rate_usd_per_hour, util)
    client.report_metric(worker_id, chunk["job_id"], Sample(util, vram, cost))
    client.complete(chunk["chunk_id"])
    return {"chunk_id": chunk["chunk_id"], "ok": ok, "cost_usd": cost, "seconds": elapsed}
