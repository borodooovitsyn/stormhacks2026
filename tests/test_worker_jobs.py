import pytest

from services.worker.jobs import image_for


def test_whisper_maps_to_its_image():
    assert image_for("whisper") == "gpu-share/whisper:latest"


def test_unknown_job_type_is_rejected():
    with pytest.raises(ValueError):
        image_for("definitely-not-a-job")
