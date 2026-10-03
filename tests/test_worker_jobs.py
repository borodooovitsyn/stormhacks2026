import pytest

from services.worker.jobs import image_for


def test_whisper_cpu_image_by_default():
    assert image_for("whisper") == "gpu-share/whisper:cpu"


def test_whisper_gpu_image_when_requested():
    assert image_for("whisper", gpu=True) == "gpu-share/whisper:cuda"


def test_cpu_only_job_falls_back_to_cpu_when_gpu_requested():
    assert image_for("ocr") == "gpu-share/ocr:cpu"
    assert image_for("ocr", gpu=True) == "gpu-share/ocr:cpu"


def test_unknown_job_type_is_rejected():
    with pytest.raises(ValueError):
        image_for("definitely-not-a-job")
