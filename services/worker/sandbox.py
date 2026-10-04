"""Hardened Docker sandbox: no network, read-only root, fixed mounts."""

from __future__ import annotations

import subprocess
from collections.abc import Callable
from dataclasses import dataclass


@dataclass
class SandboxResult:
    ok: bool
    stdout: str
    stderr: str


def build_docker_command(
    image: str,
    input_dir: str,
    output_dir: str,
    *,
    gpus: bool = True,
    gpu_pct: int | None = None,
    vram_cap_mb: int | None = None,
) -> list[str]:
    cmd = [
        "docker", "run", "--rm",
        "--network", "none",
        "--read-only",
        "--tmpfs", "/tmp",
        "-v", f"{input_dir}:/input:ro",
        "-v", f"{output_dir}:/output",
    ]
    if gpus:
        cmd += ["--gpus", "all"]
        # MPS caps: let a rented job use only part of the GPU, concurrently with the owner.
        if gpu_pct is not None or vram_cap_mb is not None:
            cmd += [
                "-v", "/tmp/nvidia-mps:/tmp/nvidia-mps",
                "-e", "CUDA_MPS_PIPE_DIRECTORY=/tmp/nvidia-mps",
            ]
            if gpu_pct is not None:
                cmd += ["-e", f"CUDA_MPS_ACTIVE_THREAD_PERCENTAGE={gpu_pct}"]
            if vram_cap_mb is not None:
                cmd += ["-e", f"CUDA_MPS_PINNED_DEVICE_MEM_LIMIT=0={vram_cap_mb}M"]
    cmd.append(image)
    return cmd


def run_in_sandbox(
    image: str,
    input_dir: str,
    output_dir: str,
    *,
    gpus: bool = True,
    gpu_pct: int | None = None,
    vram_cap_mb: int | None = None,
    run: Callable = subprocess.run,
) -> SandboxResult:
    cmd = build_docker_command(
        image, input_dir, output_dir, gpus=gpus, gpu_pct=gpu_pct, vram_cap_mb=vram_cap_mb
    )
    proc = run(cmd, capture_output=True, text=True)
    return SandboxResult(ok=proc.returncode == 0, stdout=proc.stdout, stderr=proc.stderr)
