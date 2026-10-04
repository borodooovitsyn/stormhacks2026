import tempfile
import unittest
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path
from unittest.mock import AsyncMock

from payments.settlement import SettlementEngine
from payments.state import SettlementState
from payments.usage_source import UsageRecord


class SettlementEngineTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()

        self.state = SettlementState(
            Path(self.temp_dir.name) / "settlement_state.json"
        )

        # Old timestamps so these buckets are guaranteed to be closed.
        self.records = [
            UsageRecord(
                worker_id="worker-1",
                payout_wallet="ProviderWallet123",
                bucket=1700000000,
                cost_usd=Decimal("0.001"),
            ),
            UsageRecord(
                worker_id="worker-1",
                payout_wallet="ProviderWallet123",
                bucket=1700000060,
                cost_usd=Decimal("0.002"),
            ),
        ]

        self.usage_source = AsyncMock()
        self.usage_source.get_usage.return_value = self.records

        self.payment_client = AsyncMock()
        self.payment_client.pay.return_value = "signature-123"

        self.engine = SettlementEngine(
            usage_source=self.usage_source,
            payment_client=self.payment_client,
            state=self.state,
        )

    def tearDown(self) -> None:
        self.temp_dir.cleanup()

    async def test_settles_unpaid_usage(self) -> None:
        result = await self.engine.settle_worker("worker-1")

        self.assertIsNotNone(result)

        self.assertEqual(
            result.worker_id,
            "worker-1",
        )
        self.assertEqual(
            result.payout_wallet,
            "ProviderWallet123",
        )
        self.assertEqual(
            result.amount_sol,
            Decimal("0.003"),
        )
        self.assertEqual(
            result.record_count,
            2,
        )
        self.assertEqual(
            result.signature,
            "signature-123",
        )

        self.payment_client.pay.assert_awaited_once_with(
            dest_wallet="ProviderWallet123",
            amount_sol=Decimal("0.003"),
        )

    async def test_does_not_pay_same_usage_twice(self) -> None:
        first_result = await self.engine.settle_worker(
            "worker-1"
        )

        second_result = await self.engine.settle_worker(
            "worker-1"
        )

        self.assertIsNotNone(first_result)
        self.assertIsNone(second_result)

        self.assertEqual(
            self.payment_client.pay.await_count,
            1,
        )

    async def test_failed_payment_does_not_mark_usage_settled(self) -> None:
        self.payment_client.pay.side_effect = RuntimeError(
            "Solana transfer failed"
        )

        with self.assertRaises(RuntimeError):
            await self.engine.settle_worker(
                "worker-1"
            )

        unsettled = self.state.get_unsettled(
            self.records
        )

        self.assertEqual(
            unsettled,
            self.records,
        )

    async def test_rejects_multiple_payout_wallets(self) -> None:
        self.usage_source.get_usage.return_value = [
            UsageRecord(
                worker_id="worker-1",
                payout_wallet="ProviderWalletA",
                bucket=1700000000,
                cost_usd=Decimal("0.001"),
            ),
            UsageRecord(
                worker_id="worker-1",
                payout_wallet="ProviderWalletB",
                bucket=1700000060,
                cost_usd=Decimal("0.002"),
            ),
        ]

        with self.assertRaises(ValueError):
            await self.engine.settle_worker(
                "worker-1"
            )

        self.payment_client.pay.assert_not_awaited()

    async def test_returns_none_when_no_usage_exists(self) -> None:
        self.usage_source.get_usage.return_value = []

        result = await self.engine.settle_worker(
            "worker-1"
        )

        self.assertIsNone(result)
        self.payment_client.pay.assert_not_awaited()

    async def test_does_not_settle_current_minute(self) -> None:
        current_bucket = int(
            datetime.now(timezone.utc)
            .replace(second=0, microsecond=0)
            .timestamp()
        )

        self.usage_source.get_usage.return_value = [
            UsageRecord(
                worker_id="worker-1",
                payout_wallet="ProviderWallet123",
                bucket=current_bucket,
                cost_usd=Decimal("0.001"),
            )
        ]

        result = await self.engine.settle_worker(
            "worker-1"
        )

        self.assertIsNone(result)
        self.payment_client.pay.assert_not_awaited()


if __name__ == "__main__":
    unittest.main()