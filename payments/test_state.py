import tempfile
import unittest
from decimal import Decimal
from pathlib import Path

from payments.state import SettlementState
from payments.usage_source import UsageRecord


class SettlementStateTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.path = Path(self.temp_dir.name) / "state.json"

        self.state = SettlementState(self.path)

        self.record = UsageRecord(
            worker_id="worker-1",
            payout_wallet="ProviderWallet123",
            bucket="2026-10-03T20:01:00Z",
            cost_usd=Decimal("0.10"),
        )

    def tearDown(self) -> None:
        self.temp_dir.cleanup()

    def test_new_record_is_unsettled(self) -> None:
        result = self.state.get_unsettled([self.record])

        self.assertEqual(result, [self.record])

    def test_settled_record_is_not_returned_again(self) -> None:
        self.state.mark_settled(
            [self.record],
            "signature-123",
        )

        result = self.state.get_unsettled([self.record])

        self.assertEqual(result, [])

    def test_state_persists_after_reload(self) -> None:
        self.state.mark_settled(
            [self.record],
            "signature-123",
        )

        reloaded = SettlementState(self.path)

        result = reloaded.get_unsettled([self.record])

        self.assertEqual(result, [])


if __name__ == "__main__":
    unittest.main()