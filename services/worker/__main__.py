"""Live worker: `python -m services.worker` against a running API.

Default: fake streaming metrics (any laptop).
Set INPUT_DIR (+ optional JOB_TYPE) to run real jobs in the hardened sandbox.
"""

from __future__ import annotations

import os
import tempfile
import time

import httpx

from services.worker.client import BackendClient
from services.worker.gpu import has_nvidia_gpu, sample_gpu
from services.worker.jobs import resolve_image
from services.worker.loop import run_job_once, run_one
from services.worker.runner import fake_run, gpu_run
from services.worker.sandbox import run_in_sandbox


def _fake_sample() -> tuple[float, int]:
    return 0.0, 0


def main() -> None:
    base = os.environ.get("API_URL", "http://localhost:8000")
    worker_id = os.environ.get("WORKER_ID", "worker-local")
    rate = float(os.environ.get("RATE_USD_PER_HOUR", "0.50"))
    input_dir = os.environ.get("INPUT_DIR") or os.environ.get("AUDIO_DIR")
    job_type = os.environ.get("JOB_TYPE", "whisper")  # until backend serves real job_types
    duration = float(os.environ.get("WORKER_DURATION", "20"))
    interval = float(os.environ.get("WORKER_INTERVAL", "2"))
    gpu_pct = int(os.environ["GPU_SHARE_PCT"]) if os.environ.get("GPU_SHARE_PCT") else None
    vram_cap_mb = int(os.environ["VRAM_CAP_MB"]) if os.environ.get("VRAM_CAP_MB") else None

    real = has_nvidia_gpu()
    sampler = sample_gpu if real else _fake_sample

    if input_dir:
        mode = f"real {job_type} jobs from {input_dir}" + (" (GPU)" if real else " (CPU)")
    else:
        mode = "fake streaming (real GPU)" if real else "fake streaming"
    cap = ""
    if gpu_pct or vram_cap_mb:
        parts = [f"{gpu_pct}% GPU" if gpu_pct else "", f"{vram_cap_mb}MB VRAM" if vram_cap_mb else ""]
        cap = " | share cap: " + ", ".join(p for p in parts if p)
    print(f"worker {worker_id} -> {base} @ ${rate}/hr | mode: {mode}{cap} (Ctrl-C to stop)")

    with httpx.Client(base_url=base, timeout=120) as http:
        client = BackendClient(http)
        while True:
            if input_dir:
                out = tempfile.mkdtemp()

                def run_job(chunk: dict) -> bool:
                    image = resolve_image(chunk, gpu=real, default_job_type=job_type)
                    res = run_in_sandbox(image, input_dir, out, gpus=real,
                                         gpu_pct=gpu_pct, vram_cap_mb=vram_cap_mb)
                    print(res.stdout.strip() or res.stderr.strip()[-300:])
                    return res.ok

                result = run_job_once(client, worker_id, rate_usd_per_hour=rate, run_job=run_job, sample=sampler)
            else:
                samples = gpu_run(duration, interval, rate) if real else fake_run(duration, interval, rate)
                result = run_one(client, worker_id, samples, interval_seconds=interval, sleep=time.sleep)

            if result.get("idle"):
                print("no work available, waiting…")
                time.sleep(3)
            else:
                print(result)
                if input_dir:
                    time.sleep(2)


if __name__ == "__main__":
    main()
