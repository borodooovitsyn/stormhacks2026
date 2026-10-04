"""Thin HTTP client for the worker's three backend calls."""

from __future__ import annotations

from pathlib import Path
from urllib.parse import urldefrag

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

    def fail(self, chunk_id: str, error: str) -> dict:
        r = self._http.post(f"/chunks/{chunk_id}/fail", json={"error": error[:1000]})
        r.raise_for_status()
        return r.json()

    def download_input(self, input_url: str, destination_dir: str | Path) -> Path:
        url, _fragment = urldefrag(input_url)
        r = self._http.get(url)
        r.raise_for_status()
        filename = r.headers.get("X-Artifact-Filename", "input.bin")
        filename = filename.replace("\\", "/").rsplit("/", 1)[-1]
        if not filename or filename in {".", ".."}:
            filename = "input.bin"
        destination = Path(destination_dir) / filename
        with destination.open("wb") as handle:
            for chunk in r.iter_bytes():
                handle.write(chunk)
        return destination

    def upload_result(self, chunk_id: str, archive_path: str | Path) -> dict:
        archive = Path(archive_path)
        with archive.open("rb") as handle:
            r = self._http.post(
                f"/chunks/{chunk_id}/result",
                params={"filename": archive.name},
                content=handle,
                headers={"Content-Type": "application/zip"},
            )
        r.raise_for_status()
        return r.json()
