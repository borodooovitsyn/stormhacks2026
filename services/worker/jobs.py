"""Job-type -> Docker image registry. Add a workload = add a line here."""

from __future__ import annotations

JOB_IMAGES = {
    "whisper": "gpu-share/whisper:latest",
}


def image_for(job_type: str) -> str:
    try:
        return JOB_IMAGES[job_type]
    except KeyError:
        raise ValueError(f"unknown job_type: {job_type!r}")
