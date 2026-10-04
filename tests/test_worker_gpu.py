from services.worker.gpu import has_nvidia_gpu, parse_nvidia_smi, sample_gpu


def test_parses_util_and_vram():
    # `nvidia-smi --query-gpu=utilization.gpu,memory.used --format=csv,noheader,nounits`
    assert parse_nvidia_smi("85, 4096") == (85.0, 4096)


def test_takes_first_gpu_when_several():
    assert parse_nvidia_smi("85, 4096\n30, 2048") == (85.0, 4096)


def test_strips_surrounding_whitespace():
    assert parse_nvidia_smi("  72 ,  1500 \n") == (72.0, 1500)


def test_detects_gpu_when_nvidia_smi_present():
    assert has_nvidia_gpu(which=lambda _name: "/usr/bin/nvidia-smi") is True


def test_no_gpu_when_nvidia_smi_absent():
    assert has_nvidia_gpu(which=lambda _name: None) is False


def test_sample_gpu_runs_and_parses():
    assert sample_gpu(run=lambda: "77, 3000") == (77.0, 3000)
