"""Hardened Docker sandbox: no network, read-only root, fixed mounts."""

from __future__ import annotations

import os
import shutil
import subprocess
import sys
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path


@dataclass
class SandboxResult:
    ok: bool
    stdout: str
    stderr: str


def docker_executable() -> str:
    configured = os.environ.get("DOCKER_BIN")
    if configured:
        return configured

    discovered = shutil.which("docker")
    if discovered:
        return discovered

    if sys.platform == "win32":
        candidates = [
            Path(os.environ.get("LOCALAPPDATA", ""))
            / "Programs" / "DockerDesktop" / "resources" / "bin" / "docker.exe",
            Path(os.environ.get("ProgramFiles", "C:\\Program Files"))
            / "Docker" / "Docker" / "resources" / "bin" / "docker.exe",
        ]
        for candidate in candidates:
            if candidate.is_file():
                return str(candidate)

    return "docker"


def build_docker_command(
    image: str,
    input_dir: str,
    output_dir: str,
    *,
    gpus: bool = True,
    gpu_pct: int | None = None,
    vram_cap_mb: int | None = None,
    mps: bool | None = None,
) -> list[str]:
    cmd = [
        docker_executable(), "run", "--rm",
        "--network", "none",
        "--read-only",
        "--tmpfs", "/tmp",
        "-v", f"{input_dir}:/input:ro",
        "-v", f"{output_dir}:/output",
    ]
    if gpus:
        cmd += ["--gpus", "all"]
        # Docker Desktop exposes CUDA on Windows, but NVIDIA MPS is Linux-host only.
        use_mps = sys.platform.startswith("linux") if mps is None else mps
        if use_mps and (gpu_pct is not None or vram_cap_mb is not None):
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
    mps: bool | None = None,
    run: Callable = subprocess.run,
) -> SandboxResult:
    cmd = build_docker_command(
        image,
        input_dir,
        output_dir,
        gpus=gpus,
        gpu_pct=gpu_pct,
        vram_cap_mb=vram_cap_mb,
        mps=mps,
    )
    proc = run(cmd, capture_output=True, text=True)
    return SandboxResult(ok=proc.returncode == 0, stdout=proc.stdout, stderr=proc.stderr)
