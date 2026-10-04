"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ConnectionProvider, WalletProvider, useWallet } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { clusterApiUrl } from "@solana/web3.js";
import bs58 from "bs58";
import { SessionProvider } from "next-auth/react";
import { api, getSession, setSession as storeSession, type Session } from "@/lib/api";

type AuthState = {
  token: string | null;
  signingIn: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <Providers>");
  return ctx;
}

function AuthProvider({ children }: { children: React.ReactNode }) {
  const { publicKey, signMessage, disconnect, connected } = useWallet();
  const [session, setSession] = useState<Session | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wasConnected = useRef(false);
  const address = publicKey?.toBase58() ?? null;

  // Read localStorage after mount so server and client markup match.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setSession(getSession()), []);

  // A session belongs to one wallet: drop it if the user switches wallets or
  // disconnects. (While autoConnect is still resolving, `connected` is false
  // but was never true, so a page reload keeps the session.)
  useEffect(() => {
    const dropped = wasConnected.current && !connected;
    wasConnected.current = connected;
    const switched = connected && session !== null && session.wallet !== address;
    if (dropped || switched) {
      storeSession(null);
      setSession(null);
    }
  }, [connected, address, session]);

  // Never hand out a token that isn't for the wallet currently connected.
  const token = session && session.wallet === address ? session.token : null;

  const signIn = useCallback(async () => {
    if (!publicKey || !signMessage) {
      setError("Connect a wallet that supports message signing.");
      return;
    }
    setSigningIn(true);
    setError(null);
    try {
      const wallet = publicKey.toBase58();
      const { nonce } = await api.nonce(wallet);
      const signature = await signMessage(new TextEncoder().encode(nonce));
      const res = await api.verify(wallet, bs58.encode(signature));
      const next = { token: res.token, wallet };
      storeSession(next);
      setSession(next);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      setError(
        /reject|denied|declin|cancel/i.test(msg)
          ? "You declined the signature request"
          : msg || "Couldn’t reach the sign-in service",
      );
    } finally {
      setSigningIn(false);
    }
  }, [publicKey, signMessage]);

  const signOut = useCallback(() => {
    storeSession(null);
    setSession(null);
    void disconnect();
  }, [disconnect]);

  const value = useMemo(
    () => ({ token, signingIn, error, signIn, signOut }),
    [token, signingIn, error, signIn, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const endpoint = useMemo(() => clusterApiUrl("devnet"), []);
  // Wallets register themselves via the Wallet Standard, so no explicit adapters.
  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={[]} autoConnect>
        <WalletModalProvider>
          <SessionProvider>
            <AuthProvider>{children}</AuthProvider>
          </SessionProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
