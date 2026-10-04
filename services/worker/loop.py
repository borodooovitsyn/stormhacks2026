"""Worker loop: claim a chunk, run it, meter it, then complete or fail it."""

from __future__ import annotations

import time
from collections.abc import Callable

from services.worker.metering import interval_cost
from services.worker.runner import Sample


def _is_idle(chunk: dict) -> bool:
    return chunk.get("job_type") == "idle" or not chunk.get("chunk_id")


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
    error = None
    try:
        ok = run_job(chunk)
    except Exception as exc:  # noqa: BLE001 - every workload failure must reach the API
        ok = False
        error = str(exc) or exc.__class__.__name__
    elapsed = clock() - started
    util, vram = sample()
    # Providers reserve the GPU for the whole successful workload. A sample taken
    # after Docker exits is useful telemetry, but often reads 0% and must not erase
    # the billable execution time.
    cost = interval_cost(elapsed, rate_usd_per_hour) if ok else 0.0
    client.report_metric(worker_id, chunk["job_id"], Sample(util, vram, cost))
    if ok:
        client.complete(chunk["chunk_id"])
    else:
        client.fail(chunk["chunk_id"], error or "workload failed")
    return {
        "chunk_id": chunk["chunk_id"],
        "ok": ok,
        "error": error,
        "cost_usd": cost,
        "seconds": elapsed,
    }
