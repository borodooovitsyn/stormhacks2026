import pytest

from services.worker.jobs import image_for, resolve_image


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


def test_resolve_prefers_renter_supplied_image():
    # Any container the renter names wins — this is the "submit any job" path.
    assert resolve_image({"image": "someone/blender:latest"}, gpu=True) == "someone/blender:latest"


def test_resolve_falls_back_to_registry_preset():
    assert resolve_image({"job_type": "whisper"}) == "gpu-share/whisper:cpu"
    assert resolve_image({"job_type": "whisper"}, gpu=True) == "gpu-share/whisper:cuda"


def test_resolve_uses_default_for_unknown_or_missing_job_type():
    # Keeps the demo working against a backend that doesn't send image/known job_type yet.
    assert resolve_image({"job_type": "segmentation"}) == "gpu-share/whisper:cpu"
    assert resolve_image({}) == "gpu-share/whisper:cpu"
