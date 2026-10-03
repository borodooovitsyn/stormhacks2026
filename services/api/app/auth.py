"""Wallet nonce auth and JWT minting."""

from __future__ import annotations

from dataclasses import dataclass
import base64
import binascii
import os
import secrets
import time

import jwt
from base58 import b58decode
from nacl.exceptions import BadSignatureError
from nacl.signing import VerifyKey


class AuthError(Exception):
    pass


@dataclass
class NonceRecord:
    nonce: str
    expires_at: float


def _truthy(value: str | None) -> bool:
    return value is not None and value.lower() in {"1", "true", "yes", "on"}


def _decode_signature(signature: str) -> bytes:
    decoders = (
        lambda value: b58decode(value),
        lambda value: base64.b64decode(value, validate=True),
        lambda value: bytes.fromhex(value),
    )
    for decoder in decoders:
        try:
            decoded = decoder(signature)
        except (ValueError, binascii.Error):
            continue
        if len(decoded) == 64:
            return decoded
    raise AuthError("signature must be base58, base64, or hex encoded 64-byte Ed25519 data")


def verify_solana_message(wallet: str, message: str, signature: str) -> bool:
    try:
        public_key = b58decode(wallet)
    except ValueError as exc:
        raise AuthError("wallet must be a base58 Solana public key") from exc

    if len(public_key) != 32:
        raise AuthError("wallet public key must decode to 32 bytes")

    try:
        VerifyKey(public_key).verify(message.encode("utf-8"), _decode_signature(signature))
    except BadSignatureError:
        return False
    return True


class AuthService:
    def __init__(
        self,
        *,
        jwt_secret: str | None = None,
        nonce_ttl_seconds: int | None = None,
        token_ttl_seconds: int | None = None,
        allow_dev_signatures: bool | None = None,
    ) -> None:
        self.jwt_secret = jwt_secret or os.getenv(
            "JWT_SECRET",
            "dev-only-change-me-please-use-32-bytes",
        )
        self.nonce_ttl_seconds = nonce_ttl_seconds or int(os.getenv("NONCE_TTL_SECONDS", "300"))
        self.token_ttl_seconds = token_ttl_seconds or int(os.getenv("JWT_TTL_SECONDS", "3600"))
        self.allow_dev_signatures = (
            _truthy(os.getenv("AUTH_ALLOW_DEV_SIGNATURES", "true"))
            if allow_dev_signatures is None
            else allow_dev_signatures
        )
        self._nonces: dict[str, NonceRecord] = {}

    def create_nonce(self, wallet: str) -> str:
        nonce = f"GPU Share login nonce: {secrets.token_urlsafe(24)}"
        self._nonces[wallet] = NonceRecord(
            nonce=nonce,
            expires_at=time.time() + self.nonce_ttl_seconds,
        )
        return nonce

    def verify_and_mint(self, wallet: str, signature: str) -> str:
        record = self._nonces.get(wallet)
        if record is None:
            raise AuthError("nonce not found")
        if record.expires_at < time.time():
            self._nonces.pop(wallet, None)
            raise AuthError("nonce expired")

        if self.allow_dev_signatures and signature == f"dev:{record.nonce}":
            verified = True
        else:
            verified = verify_solana_message(wallet, record.nonce, signature)
        if not verified:
            raise AuthError("signature verification failed")

        self._nonces.pop(wallet, None)
        now = int(time.time())
        return jwt.encode(
            {
                "sub": wallet,
                "wallet": wallet,
                "iat": now,
                "exp": now + self.token_ttl_seconds,
                "scope": "wallet",
            },
            self.jwt_secret,
            algorithm="HS256",
        )
