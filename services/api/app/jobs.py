"""In-memory job queue for the hackathon backend.

The queue is deliberately simple and process-local. It gives the worker and web
teams a real state machine while the persistent scheduler can still land later.
"""

from __future__ import annotations

import secrets
from dataclasses import dataclass, field
from datetime import UTC, datetime
from threading import Lock
from urllib.parse import quote


def utc_now() -> datetime:
    return datetime.now(UTC)


def chunk_ranges(total_units: int, requested_chunks: int) -> list[tuple[int, int]]:
    """Split total work units into balanced, non-empty half-open ranges."""
    if total_units <= 0:
        raise ValueError("total_units must be positive")
    if requested_chunks <= 0:
        raise ValueError("requested_chunks must be positive")

    chunk_count = min(total_units, requested_chunks)
    base_size, remainder = divmod(total_units, chunk_count)
    ranges: list[tuple[int, int]] = []
    start = 0

    for index in range(chunk_count):
        size = base_size + (1 if index < remainder else 0)
        end = start + size
        ranges.append((start, end))
        start = end

    return ranges


def chunk_input_url(input_url: str, start: int, end: int, index: int, total: int) -> str:
    encoded = quote(input_url, safe=":/?&=%")
    return f"{encoded}#start={start}&end={end}&chunk={index + 1}/{total}"


@dataclass
class Chunk:
    chunk_id: str
    job_id: str
    job_type: str
    input_url: str
    start_unit: int
    end_unit: int
    status: str = "pending"
    worker_id: str | None = None
    claimed_at: datetime | None = None
    completed_at: datetime | None = None


@dataclass
class Job:
    job_id: str
    job_type: str
    input_url: str
    total_units: int
    requested_chunks: int
    chunk_ids: list[str] = field(default_factory=list)
    created_at: datetime = field(default_factory=utc_now)


class InMemoryJobQueue:
    def __init__(self) -> None:
        self._lock = Lock()
        self._jobs: dict[str, Job] = {}
        self._chunks: dict[str, Chunk] = {}

    def create_job(
        self,
        *,
        job_type: str,
        input_url: str,
        total_units: int,
        requested_chunks: int,
        job_id: str | None = None,
    ) -> Job:
        ranges = chunk_ranges(total_units, requested_chunks)
        job_id = job_id or f"job-{secrets.token_hex(4)}"
        job = Job(
            job_id=job_id,
            job_type=job_type,
            input_url=input_url,
            total_units=total_units,
            requested_chunks=requested_chunks,
        )

        with self._lock:
            if job_id in self._jobs:
                raise ValueError(f"job already exists: {job_id}")

            for index, (start, end) in enumerate(ranges):
                chunk_id = f"{job_id}-chunk-{index + 1}"
                chunk = Chunk(
                    chunk_id=chunk_id,
                    job_id=job_id,
                    job_type=job_type,
                    input_url=chunk_input_url(input_url, start, end, index, len(ranges)),
                    start_unit=start,
                    end_unit=end,
                )
                self._chunks[chunk_id] = chunk
                job.chunk_ids.append(chunk_id)

            self._jobs[job_id] = job
            return job

    def claim_next(self, worker_id: str) -> Chunk | None:
        with self._lock:
            for chunk in self._chunks.values():
                if chunk.status == "pending":
                    chunk.status = "claimed"
                    chunk.worker_id = worker_id
                    chunk.claimed_at = utc_now()
                    return chunk
        return None

    def complete(self, chunk_id: str) -> Chunk | None:
        with self._lock:
            chunk = self._chunks.get(chunk_id)
            if chunk is None:
                return None
            chunk.status = "complete"
            chunk.completed_at = utc_now()
            return chunk

    def has_open_work(self) -> bool:
        with self._lock:
            return any(chunk.status in {"pending", "claimed"} for chunk in self._chunks.values())

    def ensure_demo_job(self) -> None:
        if self.has_open_work():
            return
        self.create_job(
            job_id=f"job-demo-{secrets.token_hex(2)}",
            job_type="segmentation",
            input_url="mock://flood-watch/tile-batch.tif",
            total_units=6,
            requested_chunks=6,
        )
