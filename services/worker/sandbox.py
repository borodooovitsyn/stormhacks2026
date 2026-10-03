"""Hardened Docker sandbox: no network, read-only root, fixed mounts."""

from __future__ import annotations


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
