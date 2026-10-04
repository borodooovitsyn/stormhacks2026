"use client";

import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { api, desktopDownloadUrl } from "@/lib/api";
import { Button, Card, PageHeader } from "@/components/ui";
import { Tooltip } from "@/components/ui/tooltip-card";

function cleanCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-F0-9]/g, "");
}

export function DownloadClient() {
  const params = useSearchParams();
  const { data: session, status } = useSession();
  const [code, setCode] = useState(() => cleanCode(params.get("code") ?? ""));
  const [busy, setBusy] = useState(false);
  const [approved, setApproved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const accountEmail = session?.user?.email ?? "";
  const isSignedIn = status === "authenticated" && Boolean(accountEmail);

  const approve = async () => {
    if (!isSignedIn || !accountEmail) {
      setError("Sign in before approving this device.");
      return;
    }
    const pairCode = cleanCode(code);
    setCode(pairCode);
    setBusy(true);
    setError(null);
    setApproved(false);
    try {
      await api.approvePair(pairCode, accountEmail);
      setApproved(true);
    } catch (e) {
      const message = e instanceof Error ? e.message : "";
      setError(message.startsWith("404") ? "Code not found" : "Could not approve this device");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Put your GPU to work"
        subtitle="Download the desktop app, then approve the pairing code it shows."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="font-medium">1. Download the app</h2>
          <p className="mt-1 text-sm text-muted">
            Needs an NVIDIA GPU and Docker. You choose the{" "}
            <Tooltip content="A soft limit: a memory cap plus time-slicing. Consumer GPUs can’t be split in hardware, so we limit what the worker is allowed to use.">
              VRAM cap
            </Tooltip>{" "}
            and schedule.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button href={desktopDownloadUrl} variant="ghost">Download zip</Button>
          </div>
          <p className="mt-3 text-xs text-muted">Backend serves the current desktop app bundle as a zip for the demo.</p>
        </Card>

        <Card>
          <h2 className="font-medium">2. Approve this device</h2>
          <p className="mt-1 text-sm text-muted">
            Click “Open website to approve” in the desktop app, or paste the code shown there.
          </p>
          {status === "loading" ? (
            <div className="skeleton mt-4 h-10 w-40" />
          ) : (
            <p className="mt-3 text-sm text-muted">
              Approving as <span className="text-text">{accountEmail}</span>.
            </p>
          )}
          <label className="mt-4 block">
            <span className="text-sm font-medium">Pairing code</span>
            <input
              value={code}
              onChange={(event) => setCode(cleanCode(event.target.value))}
              maxLength={6}
              inputMode="text"
              placeholder="A1B2C3"
              className="mt-2 h-12 w-full rounded-lg border border-border bg-bg px-3 font-mono text-2xl font-semibold tracking-[0.28em] text-text outline-none transition-colors placeholder:text-muted focus:border-accent"
            />
          </label>
          <div className="mt-4">
            <Button onClick={approve} disabled={busy || code.length < 6 || !isSignedIn}>
              {busy ? "Approving..." : "Approve device"}
            </Button>
          </div>
          {approved && (
            <p className="mt-3 text-sm text-accent" role="status">
              Device approved. Return to the desktop app; it should unlock in a moment.
            </p>
          )}
          {error && <p className="mt-3 text-sm text-danger" role="alert">{error}</p>}
        </Card>
      </div>
    </>
  );
}
