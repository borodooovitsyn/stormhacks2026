"use client";

import { useCallback, useState } from "react";
import { api } from "@/lib/api";
import { usePolling } from "@/lib/usePolling";
import { SAMPLE_PAYOUTS } from "@/lib/pending";
import { EarningsChart } from "@/components/EarningsChart";
import { Card, EmptyState, LiveBadge, PageHeader, PreviewBadge, Stat, usd, shortAddr } from "@/components/ui";

export default function ProviderPage() {
  const [workerId, setWorkerId] = useState("demo-worker");
  const fetchEarnings = useCallback(() => api.earnings(workerId), [workerId]);
  const { data, error, loading } = usePolling(fetchEarnings, 3000);

  const perMin = data?.series.at(-1)?.cost_usd ?? 0;

  return (
    <>
      <PageHeader
        title="Provider dashboard"
        subtitle="Earnings from your shared GPU, aggregated per minute and paid out in SOL on devnet."
        action={
          <label className="flex items-center gap-2 text-sm text-muted">
            Worker
            <input
              value={workerId}
              onChange={(e) => setWorkerId(e.target.value.trim() || "demo-worker")}
              className="h-10 w-44 rounded-[10px] border border-border bg-surface px-3 text-text outline-none focus:border-accent"
              aria-label="Worker ID"
            />
          </label>
        }
      />

      {error && !data && (
        <Card className="mb-6 border-danger/40">
          <p className="font-medium text-danger">Can’t reach the API</p>
          <p className="mt-1 text-sm text-muted">
            {error}. Start the backend with <code className="font-mono text-text">make api</code>.
          </p>
        </Card>
      )}

      <Card>
        <div className="mb-6 flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="text-sm text-muted">Earned today</p>
            {loading ? (
              <div className="skeleton mt-2 h-12 w-48" />
            ) : (
              <p className="num mt-1 text-5xl font-semibold tracking-tight text-accent">
                {data ? usd(data.earnings_today_usd) : "—"}
              </p>
            )}
          </div>
          <div className="flex gap-8">
            <Stat label="All time" value={data ? usd(data.earnings_total_usd) : ""} loading={loading} />
            <Stat label="Last minute" value={data ? usd(perMin) : ""} loading={loading} />
          </div>
          <LiveBadge live={!error} />
        </div>
        {loading ? (
          <div className="skeleton h-72 w-full" />
        ) : data && data.series.length > 0 ? (
          <EarningsChart series={data.series} />
        ) : (
          <EmptyState
            title="No usage yet"
            body="Start sharing from the desktop app and your first minute of earnings will show up here."
          />
        )}
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-medium">Payout wallet</h2>
          {loading ? (
            <div className="skeleton h-6 w-48" />
          ) : (
            <p className="break-all font-mono text-sm" title={data?.payout_wallet}>
              {data ? shortAddr(data.payout_wallet) : "—"}
            </p>
          )}
          <p className="mt-2 text-xs text-muted">
            Linked automatically when you pair the desktop app.
          </p>
        </Card>

        <Card>
          <div className="mb-3 flex items-center gap-2">
            <h2 className="font-medium">Recent payouts</h2>
            <PreviewBadge />
          </div>
          <ul className="divide-y divide-border">
            {SAMPLE_PAYOUTS.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2.5 text-sm">
                <span className="font-mono text-muted">{p.signature}</span>
                <span className="text-xs text-muted">{p.ago_min} min ago</span>
                <span className="num font-medium text-accent">+{usd(p.amount_usd)}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
