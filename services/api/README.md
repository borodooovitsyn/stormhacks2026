# GPU Share API Integration Guide

The API owns job chunking, usage metering, provider earnings, wallet authentication,
and device pairing. The web, desktop, worker, and payments clients should integrate only
through HTTP.

## Local Startup

```bash
make setup
make db
make api
```

The API runs at `http://127.0.0.1:8000`, Swagger is available at
`http://127.0.0.1:8000/docs`, and local TimescaleDB is exposed on port `5433`.

Relevant environment variables:

```dotenv
DATABASE_PORT=5433
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/gpushare
JWT_SECRET=dev-only-change-me-please-use-32-bytes
JWT_TTL_SECONDS=3600
NONCE_TTL_SECONDS=300
AUTH_ALLOW_DEV_SIGNATURES=true
```

Never commit `.env`, wallets, keypairs, or production secrets. Solana integration is devnet only.

## Frozen Contract

| Method | Path | Consumer | Purpose |
| --- | --- | --- | --- |
| `GET` | `/health` | all | API readiness |
| `POST` | `/auth/nonce` | web | create a short-lived wallet nonce |
| `POST` | `/auth/verify` | web | verify the signed nonce and mint a JWT |
| `POST` | `/devices/pair` | desktop | create a pending pairing session |
| `POST` | `/workers/{worker_id}/claim` | worker | claim the next pending chunk |
| `POST` | `/metrics` | worker | record usage and cost |
| `POST` | `/chunks/{chunk_id}/complete` | worker | complete a claimed chunk |
| `GET` | `/earnings/{worker_id}` | web, desktop, payments | read provider earnings |

Additive integration endpoints:

- `POST /jobs` queues a job and splits it into chunks.
- `GET /jobs/{job_id}` returns job, chunk, worker, and result status for the live job view.
- `GET /downloads/desktop` serves the current desktop app bundle as a zip for demo downloads.
- `GET /devices/pair/{code}` polls a pairing session.
- `POST /devices/pair/{code}/approve` approves a pairing session from the web client.

## Job And Metering Flow

Queue a three-chunk job:

```bash
curl -X POST http://127.0.0.1:8000/jobs \
  -H 'Content-Type: application/json' \
  -d '{"job_type":"blender","image":"gpu-share/blender:cuda","input_url":"mock://demo/scene.blend","total_units":50,"requested_chunks":5}'
```

Workers receive the same `image` field from `/workers/{worker_id}/claim`. The worker contract is:
mount inputs at `/input`, write outputs to `/output`, and run the container sandboxed.

Claim work using a stable provider identifier, not a job identifier:

```bash
curl -X POST http://127.0.0.1:8000/workers/demo-worker/claim
```

Use the returned `job_id` when reporting metrics and the returned `chunk_id` when completing work:

```bash
curl -X POST http://127.0.0.1:8000/metrics \
  -H 'Content-Type: application/json' \
  -d '{"worker_id":"demo-worker","job_id":"JOB_ID","gpu_util_pct":75,"vram_used_mb":4096,"cost_usd":0.015,"ts":null}'

curl -X POST http://127.0.0.1:8000/chunks/CHUNK_ID/complete
curl http://127.0.0.1:8000/earnings/demo-worker
```

`worker_id` must match across claim, metrics, and earnings. Jobs are claimed FIFO, so a worker
may receive an older pending job before a newly queued one.

## Wallet Authentication

Request a nonce:

```bash
curl -X POST http://127.0.0.1:8000/auth/nonce \
  -H 'Content-Type: application/json' \
  -d '{"wallet":"SOLANA_WALLET_ADDRESS"}'
```

The production-style client signs the complete returned nonce as UTF-8 bytes with the Solana
wallet and sends the base58, base64, or hex signature:

```bash
curl -X POST http://127.0.0.1:8000/auth/verify \
  -H 'Content-Type: application/json' \
  -d '{"wallet":"SOLANA_WALLET_ADDRESS","signature":"SIGNATURE"}'
```

For local testing only, when `AUTH_ALLOW_DEV_SIGNATURES=true`, the signature can be `dev:`
immediately followed by the entire nonce. A nonce is short-lived and can be used only once.

## Device Pairing

1. Desktop calls `POST /devices/pair` and displays the returned `code`.
2. Desktop polls `GET /devices/pair/{code}` while status is `pending`.
3. Web calls `POST /devices/pair/{code}/approve` with `{"wallet":"SOLANA_WALLET_ADDRESS"}`.
4. Desktop polling receives status `approved` and persists the returned `device_token` securely.

Pairing codes expire after ten minutes. Unknown codes return `404`; expired approvals return `410`.

## Validation

```bash
make test
make lint
```

Run the opt-in database smoke test with TimescaleDB available:

```bash
make db
RUN_DB_TESTS=1 .venv/bin/pytest -q tests/test_database_integration.py
```
