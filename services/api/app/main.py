"""GPU Share backend API (FastAPI).

First-commit skeleton: every endpoint is the agreed contract, returning MOCK data
so the web client, desktop app, worker, and payments module can all build in
parallel against a real HTTP wire format. Swap the mock bodies for real logic
(Tiger Data, Solana, job queue) behind these unchanged signatures.

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

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="GPU Share API", version="0.1.0")

# Dev-only: let the web client and desktop app call us from anywhere.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


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
    # MOCK: real version stores the nonce against the wallet with a short TTL.
    return {"wallet": req.wallet, "nonce": secrets.token_hex(16)}


@app.post("/auth/verify")
def auth_verify(req: VerifyRequest) -> dict:
    # MOCK: real version verifies the signed nonce and mints a JWT.
    return {"token": "mock-jwt-" + secrets.token_hex(8), "wallet": req.wallet}


# --- desktop pairing ------------------------------------------------------

@app.post("/devices/pair")
def devices_pair() -> dict:
    # MOCK: real version issues a code, user approves on web with their wallet,
    # app polls this (or a /devices/pair/{code}) until it receives a device token.
    return {
        "code": secrets.token_hex(3).upper(),
        "device_token": "mock-device-" + secrets.token_hex(8),
        "status": "approved",  # real flow starts as "pending"
    }


# --- worker loop ----------------------------------------------------------

class MetricSample(BaseModel):
    worker_id: str
    job_id: str
    gpu_util_pct: float
    vram_used_mb: int
    cost_usd: float
    ts: str | None = None


@app.post("/workers/{worker_id}/claim")
def claim_chunk(worker_id: str) -> dict:
    # MOCK: real version pops the next pending chunk from the job queue.
    return {
        "worker_id": worker_id,
        "chunk_id": "chunk-" + secrets.token_hex(4),
        "job_id": "job-demo",
        "job_type": "segmentation",
        "input_url": "mock://tile-0.tif",
    }


@app.post("/metrics")
def post_metrics(sample: MetricSample) -> dict:
    # MOCK: real version inserts into the Tiger Data gpu_metrics hypertable.
    return {"accepted": True, "ts": sample.ts or _now()}


@app.post("/chunks/{chunk_id}/complete")
def complete_chunk(chunk_id: str) -> dict:
    # MOCK: real version marks the chunk done and stores the result pointer.
    return {"chunk_id": chunk_id, "status": "complete"}


# --- earnings (read by both web and desktop) ------------------------------

@app.get("/earnings/{worker_id}")
def earnings(worker_id: str) -> dict:
    # MOCK: real version reads the usage_per_minute continuous aggregate.
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
