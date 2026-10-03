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

import secrets
import time
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from services.api.app.jobs import InMemoryJobQueue

app = FastAPI(title="GPU Share API", version="0.1.0")

# Dev-only: let the web client and desktop app call us from anywhere.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

job_queue = InMemoryJobQueue()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


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
    # Auth lands in the next P1 layer; nonce endpoint shape stays stable.
    return {"wallet": req.wallet, "nonce": secrets.token_hex(16)}


@app.post("/auth/verify")
def auth_verify(req: VerifyRequest) -> dict:
    # Auth lands in the next P1 layer; token response shape stays stable.
    return {"token": "mock-jwt-" + secrets.token_hex(8), "wallet": req.wallet}


# --- desktop pairing ------------------------------------------------------

@app.post("/devices/pair")
def devices_pair() -> dict:
    # Pairing state lands in the next P1 layer; response shape stays stable.
    return {
        "code": secrets.token_hex(3).upper(),
        "device_token": "mock-device-" + secrets.token_hex(8),
        "status": "approved",
    }


# --- worker loop ----------------------------------------------------------

class JobCreateRequest(BaseModel):
    job_type: str = "segmentation"
    input_url: str = "mock://flood-watch/tile-batch.tif"
    total_units: int = Field(default=6, ge=1)
    requested_chunks: int = Field(default=6, ge=1)


class MetricSample(BaseModel):
    worker_id: str
    job_id: str
    gpu_util_pct: float
    vram_used_mb: int
    cost_usd: float
    ts: str | None = None


@app.post("/jobs")
def create_job(req: JobCreateRequest) -> dict:
    job = job_queue.create_job(
        job_type=req.job_type,
        input_url=req.input_url,
        total_units=req.total_units,
        requested_chunks=req.requested_chunks,
    )
    return {
        "job_id": job.job_id,
        "job_type": job.job_type,
        "status": "queued",
        "chunk_count": len(job.chunk_ids),
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
            "input_url": "",
        }

    return {
        "worker_id": worker_id,
        "chunk_id": chunk.chunk_id,
        "job_id": chunk.job_id,
        "job_type": chunk.job_type,
        "input_url": chunk.input_url,
    }


@app.post("/metrics")
def post_metrics(sample: MetricSample) -> dict:
    # Tiger Data persistence lands in the next P1 layer.
    return {"accepted": True, "ts": sample.ts or _now()}


@app.post("/chunks/{chunk_id}/complete")
def complete_chunk(chunk_id: str) -> dict:
    chunk = job_queue.complete(chunk_id)
    if chunk is None:
        raise HTTPException(status_code=404, detail="chunk not found")
    return {"chunk_id": chunk_id, "status": "complete"}


# --- earnings (read by both web and desktop) ------------------------------

@app.get("/earnings/{worker_id}")
def earnings(worker_id: str) -> dict:
    # Tiger Data aggregate read lands in the next P1 layer.
    now = int(time.time())
    series = [
        {"bucket": now - 60 * i, "cost_usd": round(0.02 * (10 - i), 4)}
        for i in range(10, 0, -1)
    ]
    return {
        "worker_id": worker_id,
        "payout_wallet": "MockWa11etAddr1111111111111111111111111111",
        "earnings_today_usd": round(sum(p["cost_usd"] for p in series), 4),
        "earnings_total_usd": 1.2345,
        "series": series,
    }
