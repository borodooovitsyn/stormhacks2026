import json
from pathlib import Path

from solders.keypair import Keypair


def load_keypair(path: str) -> Keypair:
    key_bytes = json.loads(Path(path).expanduser().read_text())
    return Keypair.from_bytes(bytes(key_bytes))