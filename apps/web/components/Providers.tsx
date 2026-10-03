"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ConnectionProvider, WalletProvider, useWallet } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { clusterApiUrl } from "@solana/web3.js";
import bs58 from "bs58";
import { api, getToken, setToken } from "@/lib/api";

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
  const { publicKey, signMessage, disconnect } = useWallet();
  const [token, setTokenState] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Read localStorage after mount so server and client markup match.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setTokenState(getToken()), []);

  const signIn = useCallback(async () => {
    if (!publicKey || !signMessage) {
      setError("Connect a wallet that supports message signing (Phantom).");
      return;
    }
    setSigningIn(true);
    setError(null);
    try {
      const wallet = publicKey.toBase58();
      const { nonce } = await api.nonce(wallet);
      const signature = await signMessage(new TextEncoder().encode(nonce));
      const res = await api.verify(wallet, bs58.encode(signature));
      setToken(res.token);
      setTokenState(res.token);
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
    setToken(null);
    setTokenState(null);
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
  // Phantom registers itself via the Wallet Standard, so no explicit adapters.
  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={[]} autoConnect>
        <WalletModalProvider>
          <AuthProvider>{children}</AuthProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
