"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useAuth } from "./Providers";
import { Logo } from "./Logo";

// The adapter button reads window state, so render it client-side only.
const WalletMultiButton = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false, loading: () => <div className="skeleton h-[38px] w-36" /> },
);

const LINKS = [
  { href: "/rent", label: "Rent" },
  { href: "/provider", label: "Provider" },
  { href: "/wallet", label: "Wallet" },
  { href: "/download", label: "Get the app" },
];

function avatarLabel(email?: string | null, name?: string | null) {
  const label = name?.trim() || email?.trim() || "Account";
  return label.slice(0, 1).toUpperCase();
}

export function Nav() {
  const pathname = usePathname();
  const { connected } = useWallet();
  const { token, signIn, signingIn, signOut, error } = useAuth();
  const { data: account, status: accountStatus } = useSession();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="flex items-baseline gap-2.5" aria-label="CoreWhore home">
          <Logo />
          <span className="hidden text-sm font-semibold tracking-tight text-muted sm:inline">CoreWhore</span>
        </Link>
        <nav className="hidden gap-1 sm:flex" aria-label="Main">
          {LINKS.map((l) => {
            const active = pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                  active ? "bg-surface-2 text-text" : "text-muted hover:text-text"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          {connected && !token && (
            <button
              onClick={signIn}
              disabled={signingIn}
              className="h-[38px] rounded-[10px] border border-accent px-4 text-sm font-semibold text-accent transition-colors hover:bg-accent/10 disabled:opacity-50"
            >
              {signingIn ? "Check wallet…" : "Verify wallet"}
            </button>
          )}
          {token && !account?.user && (
            <button onClick={signOut} className="text-sm text-muted hover:text-text">
              Clear wallet session
            </button>
          )}
          {accountStatus === "loading" ? (
            <div className="skeleton h-[38px] w-24" />
          ) : accountStatus === "authenticated" && account?.user ? (
            <Link
              href="/account"
              aria-label={`Account ${account.user.email ?? ""}`.trim()}
              className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-full border border-accent/60 bg-accent text-sm font-bold text-accent-ink shadow-[0_0_20px_rgba(61,255,114,0.18)] transition-colors hover:bg-accent-hover"
              title={account.user.email ?? "Account"}
            >
              {avatarLabel(account.user.email, account.user.name)}
            </Link>
          ) : (
            <Link
              href="/sign-in"
              className="inline-flex h-[38px] items-center rounded-lg border border-border px-3 text-sm font-medium text-text transition-colors hover:bg-surface-2"
            >
              Sign in
            </Link>
          )}
          <WalletMultiButton />
        </div>
      </div>
      {error && (
        <p role="alert" className="border-t border-danger/30 bg-danger/10 px-4 py-2 text-center text-sm text-danger">
          Sign-in failed. {error}. Open your wallet and try again.
        </p>
      )}
      <nav
        className="flex gap-1 overflow-x-auto border-t border-border px-4 py-2 sm:hidden"
        aria-label="Main mobile"
      >
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm ${
              pathname.startsWith(l.href) ? "bg-surface-2" : "text-muted"
            }`}
          >
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
