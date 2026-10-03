// Typed client for the GPU Share API (services/api). Only endpoints that exist
// in the agreed contract live here. Anything the UI needs that isn't in the
// contract goes through lib/pending.ts until the backend owner adds it.

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const TOKEN_KEY = "gpushare.token";
const WALLET_KEY = "gpushare.wallet";

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

// A token only means something for the wallet that signed for it, so the two
// are stored and cleared together.
export type Session = { token: string; wallet: string };

export function getSession(): Session | null {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const wallet = localStorage.getItem(WALLET_KEY);
    return token && wallet ? { token, wallet } : null;
  } catch {
    return null;
  }
}

export function setSession(session: Session | null) {
  try {
    if (session) {
      localStorage.setItem(TOKEN_KEY, session.token);
      localStorage.setItem(WALLET_KEY, session.wallet);
    } else {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(WALLET_KEY);
    }
  } catch {
    /* storage unavailable: session-only */
  }
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} on ${path}`);
  return res.json() as Promise<T>;
}

export type EarningsPoint = { bucket: number; cost_usd: number };

export type Earnings = {
  worker_id: string;
  payout_wallet: string;
  earnings_today_usd: number;
  earnings_total_usd: number;
  series: EarningsPoint[];
};

export type PairResult = {
  code: string;
  device_token: string;
  status: "pending" | "approved";
};

export const api = {
  health: () => request<{ status: string }>("/health"),
  nonce: (wallet: string) =>
    request<{ wallet: string; nonce: string }>("/auth/nonce", {
      method: "POST",
      body: JSON.stringify({ wallet }),
    }),
  verify: (wallet: string, signature: string) =>
    request<{ token: string; wallet: string }>("/auth/verify", {
      method: "POST",
      body: JSON.stringify({ wallet, signature }),
    }),
  pair: () => request<PairResult>("/devices/pair", { method: "POST" }),
  earnings: (workerId: string) =>
    request<Earnings>(`/earnings/${encodeURIComponent(workerId)}`),
};
