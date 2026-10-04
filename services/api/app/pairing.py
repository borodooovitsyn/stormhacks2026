"""Desktop pairing code state."""

from __future__ import annotations

import secrets
import time
from dataclasses import dataclass


@dataclass
class PairSession:
    code: str
    device_token: str
    status: str
    expires_at: float
    wallet: str | None = None

    def as_response(self) -> dict:
        return {
            "code": self.code,
            "device_token": self.device_token,
            "status": self.status,
        }


class PairingStore:
    def __init__(self, ttl_seconds: int = 600) -> None:
        self.ttl_seconds = ttl_seconds
        self._sessions: dict[str, PairSession] = {}

    def create(self) -> PairSession:
        code = secrets.token_hex(3).upper()
        while code in self._sessions:
            code = secrets.token_hex(3).upper()

        session = PairSession(
            code=code,
            device_token="device-" + secrets.token_urlsafe(24),
            status="pending",
            expires_at=time.time() + self.ttl_seconds,
        )
        self._sessions[code] = session
        return session

    def get(self, code: str) -> PairSession | None:
        session = self._sessions.get(code.upper())
        if session is None:
            return None
        if session.expires_at < time.time():
            session.status = "expired"
        return session

    def approve(self, code: str, wallet: str) -> PairSession | None:
        session = self.get(code)
        if session is None or session.status == "expired":
            return session
        session.wallet = wallet
        session.status = "approved"
        return session
