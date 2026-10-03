from services.worker.sandbox import build_docker_command, run_in_sandbox


def test_disables_network():
    cmd = build_docker_command("img", "/in", "/out")
    assert cmd[cmd.index("--network") + 1] == "none"


def test_root_filesystem_is_read_only():
    assert "--read-only" in build_docker_command("img", "/in", "/out")


def test_mounts_input_readonly_and_output_writable():
    joined = " ".join(build_docker_command("img", "/in", "/out"))
    assert "/in:/input:ro" in joined
    assert "/out:/output" in joined
    assert "/out:/output:ro" not in joined


def test_requests_gpu_by_default_and_can_opt_out():
    assert "--gpus" in build_docker_command("img", "/in", "/out")
    assert "--gpus" not in build_docker_command("img", "/in", "/out", gpus=False)


def test_image_is_last():
    assert build_docker_command("myimage:latest", "/in", "/out")[-1] == "myimage:latest"


class _FakeProc:
    def __init__(self, returncode, stdout="", stderr=""):
        self.returncode = returncode
        self.stdout = stdout
        self.stderr = stderr


def test_run_reports_success_and_uses_hardened_command():
    captured = {}

    def fake_run(cmd, **_kw):
        captured["cmd"] = cmd
        return _FakeProc(0, stdout="done")

    res = run_in_sandbox("img", "/in", "/out", run=fake_run)
    assert res.ok is True
    assert res.stdout == "done"
    assert "--network" in captured["cmd"] and captured["cmd"][-1] == "img"


def test_run_reports_failure():
    res = run_in_sandbox("img", "/in", "/out", run=lambda cmd, **_kw: _FakeProc(1, stderr="boom"))
    assert res.ok is False
    assert res.stderr == "boom"
