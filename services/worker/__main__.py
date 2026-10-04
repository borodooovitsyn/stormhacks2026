"""Real worker: download input, run a sandboxed container, upload its output."""

from __future__ import annotations

import os
import shutil
import time
from collections.abc import Callable
from pathlib import Path
from uuid import uuid4

import httpx

from services.worker.client import BackendClient
from services.worker.gpu import has_nvidia_gpu, sample_gpu
from services.worker.jobs import resolve_image
from services.worker.loop import run_job_once
from services.worker.sandbox import SandboxResult, run_in_sandbox


def _empty_sample() -> tuple[float, int]:
    return 0.0, 0


def worker_storage_dir() -> Path:
    configured = os.environ.get("WORKER_STORAGE_DIR")
    if configured:
        return Path(configured).expanduser()
    if os.name == "nt":
        return Path.home() / "Documents" / "CoreShare" / "worker-jobs"
    return Path.home() / ".coreshare" / "worker-jobs"


def execute_chunk(
    client: BackendClient,
    chunk: dict,
    *,
    has_gpu: bool,
    gpu_pct: int | None = None,
    vram_cap_mb: int | None = None,
    sandbox_runner: Callable[..., SandboxResult] = run_in_sandbox,
) -> bool:
    storage_dir = worker_storage_dir()
    storage_dir.mkdir(parents=True, exist_ok=True)
    root = storage_dir / f"job-{uuid4().hex}"
    root.mkdir()
    try:
        input_dir = root / "input"
        output_dir = root / "output"
        input_dir.mkdir()
        output_dir.mkdir()

        downloaded = client.download_input(chunk["input_url"], input_dir)
        image = resolve_image(
            chunk,
            gpu=has_gpu,
            default_job_type=chunk["job_type"],
        )
        print(f"running {chunk['chunk_id']} with {image} ({downloaded.name})")
        execution = sandbox_runner(
            image,
            str(input_dir),
            str(output_dir),
            gpus=has_gpu,
            gpu_pct=gpu_pct,
            vram_cap_mb=vram_cap_mb,
        )
        output = execution.stdout.strip() or execution.stderr.strip()
        if output:
            print(output[-2000:])
        if not execution.ok:
            raise RuntimeError(output[-1000:] or "Docker workload failed")
        if not any(path.is_file() for path in output_dir.rglob("*")):
            raise RuntimeError("workload produced no files in /output")

        archive = shutil.make_archive(str(root / "result"), "zip", output_dir)
        client.upload_result(chunk["chunk_id"], archive)
        return True
    finally:
        shutil.rmtree(root, ignore_errors=True)


def main() -> None:
    base = os.environ.get("API_URL", "http://localhost:8000")
    worker_id = os.environ.get("WORKER_ID", "worker-local")
    rate = float(os.environ.get("RATE_USD_PER_HOUR", "0.50"))
    gpu_pct = int(os.environ["GPU_SHARE_PCT"]) if os.environ.get("GPU_SHARE_PCT") else None
    vram_cap_mb = int(os.environ["VRAM_CAP_MB"]) if os.environ.get("VRAM_CAP_MB") else None

    has_gpu = has_nvidia_gpu()
    sampler = sample_gpu if has_gpu else _empty_sample
    mode = "real Docker GPU jobs" if has_gpu else "real Docker CPU jobs"
    print(f"worker {worker_id} -> {base} @ ${rate}/hr | mode: {mode} (Ctrl-C to stop)")

    with httpx.Client(base_url=base, timeout=600) as http:
        client = BackendClient(http)
        while True:
            def run_job(chunk: dict) -> bool:
                return execute_chunk(
                    client,
                    chunk,
                    has_gpu=has_gpu,
                    gpu_pct=gpu_pct,
                    vram_cap_mb=vram_cap_mb,
                )

            try:
                result = run_job_once(
                    client,
                    worker_id,
                    rate_usd_per_hour=rate,
                    run_job=run_job,
                    sample=sampler,
                )
            except (httpx.HTTPError, OSError) as exc:
                print(f"worker communication error: {exc}")
                time.sleep(3)
                continue

            if result.get("idle"):
                time.sleep(3)
            else:
                print(result)
                time.sleep(1)


if __name__ == "__main__":
    main()
