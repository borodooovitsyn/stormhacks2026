"""Thin HTTP client for the worker's three backend calls."""

from __future__ import annotations

from services.worker.runner import Sample


class BackendClient:
    def __init__(self, http):
        self._http = http

    def claim(self, worker_id: str) -> dict:
        r = self._http.post(f"/workers/{worker_id}/claim")
        r.raise_for_status()
        return r.json()

    def report_metric(self, worker_id: str, job_id: str, sample: Sample) -> dict:
        payload = {
            "worker_id": worker_id,
            "job_id": job_id,
            "gpu_util_pct": sample.gpu_util_pct,
            "vram_used_mb": sample.vram_used_mb,
            "cost_usd": sample.cost_usd,
        }
        r = self._http.post("/metrics", json=payload)
        r.raise_for_status()
        return r.json()

    def complete(self, chunk_id: str) -> dict:
        r = self._http.post(f"/chunks/{chunk_id}/complete")
        r.raise_for_status()
        return r.json()
