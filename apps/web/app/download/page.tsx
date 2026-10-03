"use client";

import { useState } from "react";
import { api, type PairResult } from "@/lib/api";
import { Button, Card, PageHeader } from "@/components/ui";

export default function DownloadPage() {
  const [pair, setPair] = useState<PairResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      setPair(await api.pair());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t reach the API");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Share your GPU"
        subtitle="The desktop app runs jobs in a sandbox on your machine and sends your earnings to your wallet. Install it, then pair it with this account."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="font-medium">1. Download the app</h2>
          <p className="mt-1 text-sm text-muted">
            Needs an NVIDIA GPU and Docker. You choose the VRAM cap and schedule.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button href="#" variant="ghost">Windows</Button>
            <Button href="#" variant="ghost">macOS</Button>
            <Button href="#" variant="ghost">Linux</Button>
          </div>
          <p className="mt-3 text-xs text-muted">Installers aren’t published yet; links will go live with the first build.</p>
        </Card>

        <Card>
          <h2 className="font-medium">2. Pair it with your wallet</h2>
          <p className="mt-1 text-sm text-muted">
            Phantom lives in your browser, so the app shows a code and you approve it here.
          </p>
          <div className="mt-4">
            {pair ? (
              <div>
                <p className="font-mono text-4xl font-semibold tracking-[0.3em] text-accent" aria-live="polite">
                  {pair.code}
                </p>
                <p className="mt-2 text-sm text-muted">
                  Status: <span className="text-text">{pair.status}</span>. Enter this code in the app to link it.
                </p>
              </div>
            ) : (
              <Button onClick={start} disabled={busy}>
                {busy ? "Generating…" : "Generate pairing code"}
              </Button>
            )}
          </div>
          {error && <p className="mt-3 text-sm text-danger" role="alert">{error}</p>}
        </Card>
      </div>
    </>
  );
}
