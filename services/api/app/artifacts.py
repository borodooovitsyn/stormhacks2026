"""Filesystem storage for job inputs and worker results."""

from __future__ import annotations

import os
import re
import secrets
from collections.abc import AsyncIterable
from dataclasses import dataclass
from pathlib import Path

DEFAULT_STORAGE_ROOT = Path.home() / ".gpu-share" / "jobs"
DEFAULT_MAX_UPLOAD_BYTES = 500 * 1024 * 1024
_SAFE_ID = re.compile(r"^[A-Za-z0-9._-]+$")


class ArtifactTooLarge(ValueError):
    pass


@dataclass(frozen=True)
class Artifact:
    artifact_id: str
    filename: str
    path: Path
    size: int


def safe_filename(filename: str) -> str:
    name = filename.replace("\\", "/").rsplit("/", 1)[-1].strip()
    if not name or name in {".", ".."}:
        raise ValueError("invalid filename")
    return name


class ArtifactStore:
    def __init__(self, root: Path | None = None, max_upload_bytes: int | None = None) -> None:
        configured_root = os.getenv("JOB_STORAGE_DIR")
        self.root = Path(root or configured_root or DEFAULT_STORAGE_ROOT).expanduser().resolve()
        self.max_upload_bytes = max_upload_bytes or int(
            os.getenv("MAX_JOB_UPLOAD_BYTES", str(DEFAULT_MAX_UPLOAD_BYTES))
        )

    async def save_input(self, filename: str, chunks: AsyncIterable[bytes]) -> Artifact:
        upload_id = f"upload-{secrets.token_hex(8)}"
        return await self._save("inputs", upload_id, filename, chunks)

    async def save_result(
        self,
        chunk_id: str,
        filename: str,
        chunks: AsyncIterable[bytes],
    ) -> Artifact:
        if not _SAFE_ID.fullmatch(chunk_id):
            raise ValueError("invalid chunk id")
        return await self._save("results", chunk_id, filename, chunks)

    async def _save(
        self,
        category: str,
        artifact_id: str,
        filename: str,
        chunks: AsyncIterable[bytes],
    ) -> Artifact:
        name = safe_filename(filename)
        directory = self.root / category / artifact_id
        directory.mkdir(parents=True, exist_ok=False)
        destination = directory / name
        partial = directory / f".{name}.part"
        size = 0
        try:
            with partial.open("wb") as handle:
                async for chunk in chunks:
                    if not chunk:
                        continue
                    size += len(chunk)
                    if size > self.max_upload_bytes:
                        raise ArtifactTooLarge(
                            f"artifact exceeds {self.max_upload_bytes} bytes"
                        )
                    handle.write(chunk)
            partial.replace(destination)
        except Exception:
            partial.unlink(missing_ok=True)
            try:
                directory.rmdir()
            except OSError:
                pass
            raise
        return Artifact(artifact_id, name, destination, size)

    def input(self, upload_id: str) -> Artifact | None:
        return self._find("inputs", upload_id)

    def result(self, chunk_id: str) -> Artifact | None:
        return self._find("results", chunk_id)

    def _find(self, category: str, artifact_id: str) -> Artifact | None:
        if not _SAFE_ID.fullmatch(artifact_id):
            return None
        directory = self.root / category / artifact_id
        if not directory.is_dir():
            return None
        files = [path for path in directory.iterdir() if path.is_file() and not path.name.startswith(".")]
        if len(files) != 1:
            return None
        path = files[0]
        return Artifact(artifact_id, path.name, path, path.stat().st_size)
