"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { getSession } from "@/lib/api";
import { signInWithSecretKey } from "@/lib/walletKey";

export function LinkWalletForm() {
  const { data: account } = useSession();
  const [address, setAddress] = useState("");
  const [secret, setSecret] = useState("");
  const [status, setStatus] = useState<"idle" | "working" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [linked, setLinked] = useState<string | null>(null);

  useEffect(() => {
    const initial = window.setTimeout(() => setLinked(getSession()?.wallet ?? null), 0);
    return () => window.clearTimeout(initial);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("working");
    setMessage("");
    try {
      await signInWithSecretKey(address, secret, account?.user?.email);
      setStatus("done");
      setMessage("Wallet linked ✓");
      setSecret("");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Failed to link wallet");
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <label className="text-sm text-muted">
        Payout wallet address
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="e.g. 2oUn6uDrZ…"
          className="mt-1 h-10 w-full rounded-[10px] border border-border bg-surface px-3 font-mono text-sm text-text outline-none focus:border-accent"
          required
        />
      </label>
      <label className="text-sm text-muted">
        Secret key (JSON array or bs58)
        <textarea
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          placeholder="[41,113,240, … ]"
          rows={3}
          className="mt-1 w-full rounded-[10px] border border-border bg-surface px-3 py-2 font-mono text-xs text-text outline-none focus:border-accent"
          required
        />
      </label>
      <button
        type="submit"
        disabled={status === "working"}
        className="h-10 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-ink transition-colors hover:bg-accent-hover disabled:opacity-50"
      >
        {status === "working" ? "Linking…" : "Link wallet"}
      </button>
      {message && (
        <p className={`text-sm ${status === "error" ? "text-danger" : "text-accent"}`}>{message}</p>
      )}
      {linked && status !== "done" && (
        <p className="text-xs text-muted">Currently linked: <span className="font-mono">{linked}</span></p>
      )}
      <p className="text-xs text-muted">
        Demo only — your secret key signs the login once and is never stored or sent.
      </p>
    </form>
  );
}
