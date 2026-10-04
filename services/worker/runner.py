"""Worker usage sample shared by metering and the backend client."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass
class Sample:
    gpu_util_pct: float
    vram_used_mb: int
    cost_usd: float
