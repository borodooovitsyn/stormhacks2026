"""GPU Share backend API (FastAPI).

Contract (do not break these paths/shapes without telling the team):
  GET  /health
  POST /auth/nonce            -> web wallet login: get a nonce to sign
  POST /auth/verify           -> web wallet login: verify signature, get JWT
  POST /devices/pair          -> desktop pairing: get a code, poll for token
  POST /workers/{id}/claim    -> worker: claim the next chunk of work
  POST /metrics               -> worker: report GPU utilization samples
  POST /chunks/{id}/complete  -> worker: mark a chunk done
  GET  /earnings/{worker_id}  -> web + desktop: earnings for a provider
"""

from __future__ import annotations

import io
import zipfile
from datetime import UTC, datetime
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from services.api.app.auth import AuthError, AuthService
from services.api.app.database import MetricsRepository
from services.api.app.jobs import InMemoryJobQueue
from services.api.app.pairing import PairingStore

app = FastAPI(title="GPU Share API", version="0.1.0")

# Dev-only: let the web client and desktop app call us from anywhere.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

job_queue = InMemoryJobQueue()
metrics_repo = MetricsRepository()
auth_service = AuthService()
pairing_store = PairingStore()


def _now() -> str:
    return datetime.now(UTC).isoformat()


# --- health ---------------------------------------------------------------

@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "gpu-share-api", "ts": _now()}


# --- web wallet login -----------------------------------------------------

class NonceRequest(BaseModel):
    wallet: str


class VerifyRequest(BaseModel):
    wallet: str
    signature: str


@app.post("/auth/nonce")
def auth_nonce(req: NonceRequest) -> dict:
    return {"wallet": req.wallet, "nonce": auth_service.create_nonce(req.wallet)}


@app.post("/auth/verify")
def auth_verify(req: VerifyRequest) -> dict:
    try:
        token = auth_service.verify_and_mint(req.wallet, req.signature)
    except AuthError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    return {"token": token, "wallet": req.wallet}


# --- desktop pairing ------------------------------------------------------

class PairApproveRequest(BaseModel):
    wallet: str


@app.post("/devices/pair")
def devices_pair() -> dict:
    return pairing_store.create().as_response()


@app.get("/devices/pair/{code}")
def devices_pair_status(code: str) -> dict:
    session = pairing_store.get(code)
    if session is None:
        raise HTTPException(status_code=404, detail="pairing code not found")
    return session.as_response()


@app.post("/devices/pair/{code}/approve")
def devices_pair_approve(code: str, req: PairApproveRequest) -> dict:
    session = pairing_store.approve(code, req.wallet)
    if session is None:
        raise HTTPException(status_code=404, detail="pairing code not found")
    if session.status == "expired":
        raise HTTPException(status_code=410, detail="pairing code expired")
    return session.as_response()


# --- worker loop ----------------------------------------------------------

class JobCreateRequest(BaseModel):
    job_type: str = "segmentation"
    image: str = "gpu-share/imageproc:cpu"
    input_url: str = "mock://flood-watch/tile-batch.tif"
    total_units: int = Field(default=6, ge=1)
    requested_chunks: int = Field(default=6, ge=1)


class MetricSample(BaseModel):
    worker_id: str
    job_id: str
    gpu_util_pct: float = Field(ge=0, le=100)
    vram_used_mb: int = Field(ge=0)
    cost_usd: float = Field(ge=0)
    ts: datetime | None = None


@app.post("/jobs")
def create_job(req: JobCreateRequest) -> dict:
    job = job_queue.create_job(
        job_type=req.job_type,
        image=req.image,
        input_url=req.input_url,
        total_units=req.total_units,
        requested_chunks=req.requested_chunks,
    )
    return {
        "job_id": job.job_id,
        "job_type": job.job_type,
        "image": job.image,
        "status": "queued",
        "chunk_count": len(job.chunk_ids),
    }


@app.get("/jobs/{job_id}")
def get_job(job_id: str) -> dict:
    job = job_queue.get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="job not found")

    chunks = job_queue.chunks_for_job(job_id)
    complete = sum(1 for chunk in chunks if chunk.status == "complete")
    claimed = sum(1 for chunk in chunks if chunk.status == "claimed")
    status = "complete" if complete == len(chunks) else "running" if claimed else "queued"

    return {
        "job_id": job.job_id,
        "job_type": job.job_type,
        "image": job.image,
        "input_url": job.input_url,
        "status": status,
        "total_units": job.total_units,
        "chunk_count": len(chunks),
        "chunks_complete": complete,
        "chunks": [
            {
                "chunk_id": chunk.chunk_id,
                "job_id": chunk.job_id,
                "job_type": chunk.job_type,
                "image": chunk.image,
                "input_url": chunk.input_url,
                "worker_id": chunk.worker_id,
                "status": chunk.status,
                "start_unit": chunk.start_unit,
                "end_unit": chunk.end_unit,
                "result_url": f"mock://results/{chunk.chunk_id}.zip" if chunk.status == "complete" else None,
            }
            for chunk in chunks
        ],
    }


@app.post("/workers/{worker_id}/claim")
def claim_chunk(worker_id: str) -> dict:
    job_queue.ensure_demo_job()
    chunk = job_queue.claim_next(worker_id)
    if chunk is None:
        return {
            "worker_id": worker_id,
            "chunk_id": "",
            "job_id": "",
            "job_type": "idle",
            "image": "",
            "input_url": "",
        }

    return {
        "worker_id": worker_id,
        "chunk_id": chunk.chunk_id,
        "job_id": chunk.job_id,
        "job_type": chunk.job_type,
        "image": chunk.image,
        "input_url": chunk.input_url,
    }


@app.post("/metrics")
def post_metrics(sample: MetricSample) -> dict:
    ts = metrics_repo.record_metric(
        worker_id=sample.worker_id,
        job_id=sample.job_id,
        gpu_util_pct=sample.gpu_util_pct,
        vram_used_mb=sample.vram_used_mb,
        cost_usd=sample.cost_usd,
        ts=sample.ts,
    )
    return {"accepted": True, "ts": ts.isoformat()}


@app.post("/chunks/{chunk_id}/complete")
def complete_chunk(chunk_id: str) -> dict:
    chunk = job_queue.complete(chunk_id)
    if chunk is None:
        raise HTTPException(status_code=404, detail="chunk not found")
    return {"chunk_id": chunk_id, "status": "complete"}


# --- earnings (read by both web and desktop) ------------------------------

@app.get("/earnings/{worker_id}")
def earnings(worker_id: str) -> dict:
    return metrics_repo.earnings(worker_id)


@app.get("/downloads/desktop")
def download_desktop() -> StreamingResponse:
    desktop_dir = Path(__file__).resolve().parents[3] / "apps" / "desktop"
    if not desktop_dir.exists():
        raise HTTPException(status_code=404, detail="desktop app not found")

    buffer = io.BytesIO()
    excluded_dirs = {"node_modules", ".git", "dist", "build"}
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        for path in desktop_dir.rglob("*"):
            relative = path.relative_to(desktop_dir)
            if path.is_dir() or excluded_dirs.intersection(relative.parts):
                continue
            archive.write(path, Path("gpu-share-desktop") / relative)

    buffer.seek(0)
    headers = {"Content-Disposition": 'attachment; filename="gpu-share-desktop.zip"'}
    return StreamingResponse(buffer, media_type="application/zip", headers=headers)
