"""GPU detection and sampling via nvidia-smi."""

from __future__ import annotations

import shutil
import subprocess
from collections.abc import Callable

_SMI_CMD = [
    "nvidia-smi",
    "--query-gpu=utilization.gpu,memory.used",
    "--format=csv,noheader,nounits",
]


def parse_nvidia_smi(output: str) -> tuple[float, int]:
    first = output.strip().splitlines()[0]
    util, vram = first.split(",")
    return float(util.strip()), int(vram.strip())


def has_nvidia_gpu(which: Callable[[str], str | None] = shutil.which) -> bool:
    return which("nvidia-smi") is not None


def _run_smi() -> str:
    return subprocess.run(_SMI_CMD, capture_output=True, text=True, check=True).stdout


def sample_gpu(run: Callable[[], str] = _run_smi) -> tuple[float, int]:
    return parse_nvidia_smi(run())
