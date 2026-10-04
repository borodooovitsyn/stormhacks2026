"""Cross-platform demo helper: make wallets, check balances, airdrop. No Solana CLI needed.

  python -m payments.demo wallets          # generate payer + provider keypairs
  python -m payments.demo balance <pubkey> # devnet balance of an address
  python -m payments.demo airdrop          # fund the payer (needs a faucet-friendly RPC_URL)
"""

import asyncio
import json
import sys
from pathlib import Path

from solana.rpc.async_api import AsyncClient
from solders.keypair import Keypair
from solders.pubkey import Pubkey

from payments.config import DEVNET_RPC_URL

WALLET_DIR = Path.home() / ".gpu-share"


def _save(name: str, kp: Keypair) -> Path:
    WALLET_DIR.mkdir(parents=True, exist_ok=True)
    path = WALLET_DIR / f"{name}.json"
    path.write_text(json.dumps(list(bytes(kp))))
    return path


def cmd_wallets() -> None:
    payer, provider = Keypair(), Keypair()
    payer_path = _save("payer", payer)
    _save("provider", provider)
    print(f"Payer (platform wallet, SENDS payouts): {payer.pubkey()}")
    print(f"  keypair: {payer_path}")
    print(f"Provider (RECEIVES payouts — watch this one): {provider.pubkey()}")
    print()
    print("Fund the PAYER with devnet SOL (one of):")
    print("  1) Web faucet: https://faucet.solana.com  (paste the payer address above)")
    print("  2) RPC_URL=<helius devnet url> python -m payments.demo airdrop")
    print()
    print("Then export these for the demo:")
    print(f"  export PAYOUT_KEYPAIR_PATH={payer_path}")
    print(f"  export DEFAULT_PAYOUT_WALLET={provider.pubkey()}   # backend reports this as payout wallet")
    print("  export SETTLEMENT_WORKER_IDS=worker-local")


async def _balance(addr: str) -> int:
    rpc = AsyncClient(DEVNET_RPC_URL)
    bal = (await rpc.get_balance(Pubkey.from_string(addr))).value
    await rpc.close()
    return bal


def cmd_balance(addr: str) -> None:
    bal = asyncio.run(_balance(addr))
    print(f"{addr}: {bal} lamports = {bal / 1e9:.6f} SOL")


async def _airdrop(sol: float) -> int:
    kp = Keypair.from_bytes(bytes(json.loads((WALLET_DIR / "payer.json").read_text())))
    rpc = AsyncClient(DEVNET_RPC_URL)
    sig = (await rpc.request_airdrop(kp.pubkey(), int(sol * 1_000_000_000))).value
    await rpc.confirm_transaction(sig, commitment="confirmed")
    bal = (await rpc.get_balance(kp.pubkey())).value
    await rpc.close()
    return bal


def cmd_airdrop() -> None:
    bal = asyncio.run(_airdrop(1.0))
    print(f"payer funded: {bal / 1e9:.4f} SOL")


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "wallets"
    if cmd == "wallets":
        cmd_wallets()
    elif cmd == "balance" and len(sys.argv) > 2:
        cmd_balance(sys.argv[2])
    elif cmd == "airdrop":
        cmd_airdrop()
    else:
        print("usage: python -m payments.demo [wallets | balance <pubkey> | airdrop]")
