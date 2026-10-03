"use client";

import { useCallback, useState } from "react";
import { kyc, KYC_ENABLED, type KycStatus } from "@/lib/kyc";
import { usePolling } from "@/lib/usePolling";
import { useAuth } from "./Providers";
import { Button, Card } from "./ui";

const COPY: Record<KycStatus, string> = {
  unverified: "Verify your identity once to deposit and withdraw. Takes about two minutes with a photo ID.",
  pending: "Verification in progress. This page updates by itself when Trulioo finishes.",
  verified: "Identity verified. Deposits and withdrawals are unlocked.",
  rejected: "We couldn’t verify you. Check that your ID is clear and unexpired, then try again.",
};

export function KycPanel() {
  return KYC_ENABLED ? <KycFlow /> : <KycOff />;
}

function KycOff() {
  return (
    <Card>
      <h2 className="font-medium">Identity verification</h2>
      <p className="mt-1 text-sm text-muted">
        Trulioo KYC is built in but switched off. It turns on when the backend adds{" "}
        <code className="font-mono text-text">/kyc/session</code> and{" "}
        <code className="font-mono text-text">/kyc/status</code> and{" "}
        <code className="font-mono text-text">NEXT_PUBLIC_KYC_ENABLED=true</code> is set.
      </p>
    </Card>
  );
}

function KycFlow() {
  const { token } = useAuth();
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(() => kyc.status(), []);
  // Poll only while there is something to wait for.
  const { data } = usePolling(fetchStatus, url ? 3000 : 15000);
  const status: KycStatus = data?.status ?? "unverified";

  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      setUrl((await kyc.start()).verification_url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t start verification");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-medium">Identity verification</h2>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            status === "verified"
              ? "bg-accent/15 text-accent"
              : status === "rejected"
                ? "bg-danger/15 text-danger"
                : "bg-surface-2 text-muted"
          }`}
        >
          {status}
        </span>
      </div>
      <p className="mt-1 text-sm text-muted">{COPY[status]}</p>

      {status !== "verified" && !url && (
        <div className="mt-4">
          <Button onClick={start} disabled={busy || !token}>
            {busy ? "Starting…" : status === "rejected" ? "Try again" : "Start verification"}
          </Button>
          {!token && <p className="mt-2 text-xs text-muted">Sign in with your wallet first.</p>}
        </div>
      )}

      {url && status !== "verified" && (
        <iframe
          src={url}
          title="Trulioo identity verification"
          allow="camera; microphone"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          referrerPolicy="strict-origin-when-cross-origin"
          className="mt-4 h-[640px] w-full rounded-lg border border-border bg-white"
        />
      )}
      {error && <p className="mt-3 text-sm text-danger" role="alert">{error}</p>}
    </Card>
  );
}
