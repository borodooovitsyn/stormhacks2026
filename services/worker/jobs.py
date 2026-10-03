"""Job-type -> Docker image registry. Add a workload = add a line here."""

from __future__ import annotations

JOB_IMAGES = {
    "whisper": {"cpu": "gpu-share/whisper:cpu", "gpu": "gpu-share/whisper:cuda"},
    "ocr": {"cpu": "gpu-share/ocr:cpu"},  # tesseract is CPU-only
}


def image_for(job_type: str, *, gpu: bool = False) -> str:
    try:
        variants = JOB_IMAGES[job_type]
    except KeyError:
        raise ValueError(f"unknown job_type: {job_type!r}")
    return variants.get("gpu") if gpu and "gpu" in variants else variants["cpu"]
