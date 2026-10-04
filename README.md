<div align="center">

# CoreShare

### The Uber for GPUs - rent idle compute, pay by the minute in Solana.

*Submit a job. We shard it across idle GPUs around the world, meter every second of usage, and stream SOL to each provider automatically. No cloud account. No credit card. Just a wallet.*

**Built at StormHacks 2026**

`Solana` · `Tiger Data` · `FastAPI` · `Next.js` · `Electron` · `Docker`

</div>

---

## Why

A gaming GPU is idle ~90% of the time. Meanwhile a student training a model pays cloud prices or waits in a queue. The compute is *right there* — it's just not connected to the people who need it.

**CoreShare is the missing marketplace.** GPU owners flip a switch and earn from spare cycles. Renters get cheap, borderless compute. Money moves the instant work happens — settled on Solana, not invoiced in 30 days.

## How it works

```
  🌐 Web client                                   🖥️  Desktop app (provider)
  rent · wallet login                             GPU share slider · live earnings
  live job view · earnings                        runs the Docker worker
        │                                                     │
        └──────────────────►  ⚙️  FastAPI backend  ◄──────────┘
                              auth · device pairing
                              job queue + chunking
                              metering ingest
                                 │              │
                     📊 Tiger Data          ◎ Solana devnet
                     gpu_metrics hypertable  escrow credits +
                     usage_per_minute CAGG   per-minute payouts
```

1. **Submit** — a renter uploads a batch job (transcribe 50 audio files, segment satellite tiles, run any container). We split it into chunks.
2. **Shard** — idle providers claim chunks in parallel. More GPUs online → the job finishes faster. One job, many machines.
3. **Sandbox** — every chunk runs in a locked-down Docker container: **no network, read-only filesystem, VRAM + compute caps** via NVIDIA MPS. Providers never touch renter code they haven't vetted.
4. **Meter** — the worker streams `nvidia-smi` utilization into a **Tiger Data** hypertable every few seconds. A continuous aggregate rolls it up per minute — this feeds both the live dashboards *and* the payout engine.
5. **Pay** — settlement reads the per-minute aggregate and sends **SOL on devnet** to each provider. Batched, idempotent, crash-safe. Earnings tick up in the web dashboard and the desktop app in real time.

## What makes it different

- **Instant, borderless payments.** Providers in any country get paid per minute in SOL — no bank, no card, no 30-day net terms.
- **Honest metering.** You're billed on *measured* GPU usage from `nvidia-smi`, not on claims. The ledger is a time-series database, not a spreadsheet.
- **Real isolation.** Fixed, pre-vetted job images in a hardened sandbox — the security model is the product, not an afterthought.
- **Share, don't surrender.** A slider lets owners rent out *part* of their GPU (e.g. 50%) and keep the rest for themselves, enforced by NVIDIA MPS.


## Tech stack

- **Backend** FastAPI · PostgreSQL / TimescaleDB (Tiger Data).
- **Worker** Python · Docker · NVIDIA MPS · faster-whisper
- **Payments** Solana (solders / solana-py) · devnet escrow + batched settlement
- **Web** Next.js · Tailwind · wallet-based auth
- **Desktop** Electron · bundled Python worker · one-click installer

## Quick start

```bash
make setup && source .venv/bin/activate
make db          # TimescaleDB (Tiger Data compatible)
make api         # backend  → http://localhost:8000/docs
make worker      # provider worker

# front doors
cd apps/web && npm install && npm run dev        # renter + wallet  → http://localhost:3000
cd apps/desktop && npm install && npm start      # provider desktop app
```

Run the money loop (devnet):

```bash
make wallets     # generate + fund demo wallets
PAYOUT_KEYPAIR_PATH=~/treasury.json SETTLEMENT_WALLETS=<provider-wallet> make settle
```

## Repo layout

```
apps/web/          Next.js — rent, wallet, live job view, earnings
apps/desktop/      Electron — GPU share slider, worker control, earnings
services/api/      FastAPI — auth, pairing, jobs, metering ingest
services/worker/   Python GPU worker + hardened Docker job images
payments/          Solana devnet escrow & per-minute settlement
db/                TimescaleDB schema (hypertable + continuous aggregate)
```

## Honest limits

Devnet only — no real funds. Consumer GPUs use **soft limits** (VRAM cap + time-slice), not hard partitioning (NVIDIA MIG is datacenter-only). Pooling isn't one virtual GPU — it's **data parallelism**: split the job, run the pieces, merge the results.

---

<div align="center">

**Idle silicon, put to work. Paid in seconds, not invoices.**

</div>
