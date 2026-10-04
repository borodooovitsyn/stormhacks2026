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


def build_docker_command(image: str, input_dir: str, output_dir: str, *, gpus: bool = True) -> list[str]:
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
    cmd.append(image)
    return cmd


def run_in_sandbox(
    image: str,
    input_dir: str,
    output_dir: str,
    *,
    gpus: bool = True,
    run: Callable = subprocess.run,
) -> SandboxResult:
    cmd = build_docker_command(image, input_dir, output_dir, gpus=gpus)
    proc = run(cmd, capture_output=True, text=True)
    return SandboxResult(ok=proc.returncode == 0, stdout=proc.stdout, stderr=proc.stderr)
