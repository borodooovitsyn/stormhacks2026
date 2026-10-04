import json
from decimal import Decimal
from pathlib import Path

from solana.rpc.async_api import AsyncClient
from solders.keypair import Keypair
from solders.message import MessageV0
from solders.pubkey import Pubkey
from solders.system_program import TransferParams, transfer
from solders.transaction import VersionedTransaction

from payments.config import DEVNET_RPC_URL, get_payout_keypair_path


LAMPORTS_PER_SOL = 1_000_000_000
MAX_LAMPORTS = (1 << 64) - 1


def load_keypair(path: str) -> Keypair:
    key_bytes = json.loads(Path(path).expanduser().read_text())
    return Keypair.from_bytes(bytes(key_bytes))


class SolanaPaymentClient:
    def __init__(self) -> None:
        self.payer = load_keypair(get_payout_keypair_path())
        self.rpc = AsyncClient(DEVNET_RPC_URL)

    async def pay(self, dest_wallet: str, amount_sol: Decimal) -> str:
        destination = Pubkey.from_string(dest_wallet)

        if not isinstance(amount_sol, Decimal):
            raise TypeError("Payment amount must be a Decimal")
        if not amount_sol.is_finite() or amount_sol <= 0:
            raise ValueError("Payment amount must be finite and positive")

        exact_lamports = amount_sol * LAMPORTS_PER_SOL
        if exact_lamports != exact_lamports.to_integral_value():
            raise ValueError("Payment amount must be a whole number of lamports")
        lamports = int(exact_lamports)
        if lamports > MAX_LAMPORTS:
            raise ValueError("Payment amount exceeds the SOL transfer limit")

        blockhash_response = await self.rpc.get_latest_blockhash()
        instruction = transfer(
            TransferParams(
                from_pubkey=self.payer.pubkey(),
                to_pubkey=destination,
                lamports=lamports,
            )
        )
        message = MessageV0.try_compile(
            payer=self.payer.pubkey(),
            instructions=[instruction],
            address_lookup_table_accounts=[],
            recent_blockhash=blockhash_response.value.blockhash,
        )
        transaction = VersionedTransaction(message, [self.payer])
        signature = (await self.rpc.send_transaction(transaction)).value

        confirmation = await self.rpc.confirm_transaction(
            signature,
            commitment="confirmed",
            last_valid_block_height=blockhash_response.value.last_valid_block_height,
        )
        status = confirmation.value[0]
        if status is None or status.err is not None:
            raise RuntimeError(f"SOL transfer {signature} failed: {status}")
        return str(signature)

    async def close(self) -> None:
        await self.rpc.close()
