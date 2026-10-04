import unittest
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from solders.hash import Hash
from solders.keypair import Keypair
from solders.signature import Signature

from payments.solana_clients import SolanaPaymentClient


class SolanaPaymentClientTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self) -> None:
        self.payer = Keypair()
        self.recipient = Keypair().pubkey()
        self.rpc = SimpleNamespace(
            get_latest_blockhash=AsyncMock(
                return_value=SimpleNamespace(
                    value=SimpleNamespace(blockhash=Hash.default(), last_valid_block_height=123)
                )
            ),
            send_transaction=AsyncMock(
                return_value=SimpleNamespace(value=Signature.default())
            ),
            confirm_transaction=AsyncMock(
                return_value=SimpleNamespace(value=[SimpleNamespace(err=None)])
            ),
            close=AsyncMock(),
        )
        with patch("payments.solana_clients.get_payout_keypair_path", return_value="unused"), \
             patch("payments.solana_clients.load_keypair", return_value=self.payer), \
             patch("payments.solana_clients.AsyncClient", return_value=self.rpc):
            self.client = SolanaPaymentClient()

    async def test_builds_and_confirms_sol_transfer(self) -> None:
        signature = await self.client.pay(str(self.recipient), Decimal("0.001"))

        self.assertEqual(signature, str(Signature.default()))
        transaction = self.rpc.send_transaction.call_args.args[0]
        self.assertIn(self.recipient, transaction.message.account_keys)
        instruction = transaction.message.instructions[0]
        self.assertEqual(int.from_bytes(bytes(instruction.data)[4:], "little"), 1_000_000)
        self.assertEqual(len(transaction.signatures), 1)
        self.assertNotEqual(transaction.signatures[0], Signature.default())
        self.rpc.confirm_transaction.assert_awaited_once_with(
            Signature.default(), commitment="confirmed", last_valid_block_height=123
        )

    async def test_rejects_fractional_lamports_before_rpc(self) -> None:
        for amount in (Decimal("0.0000000001"), Decimal("0"), Decimal("NaN")):
            with self.subTest(amount=amount), self.assertRaises(ValueError):
                await self.client.pay(str(self.recipient), amount)
        self.rpc.get_latest_blockhash.assert_not_awaited()

    async def test_rejects_failed_confirmation(self) -> None:
        self.rpc.confirm_transaction.return_value.value[0].err = "InstructionError"
        with self.assertRaises(RuntimeError):
            await self.client.pay(str(self.recipient), Decimal("0.001"))

    async def test_close(self) -> None:
        await self.client.close()
        self.rpc.close.assert_awaited_once()
