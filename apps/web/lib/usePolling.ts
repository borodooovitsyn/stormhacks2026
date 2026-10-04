"use client";

import { useEffect, useState } from "react";

// `fn` must be referentially stable (wrap in useCallback); a new fn restarts polling.
export function usePolling<T>(fn: () => Promise<T>, intervalMs: number) {
  const [result, setResult] = useState<{ fn: () => Promise<T>; data: T } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const data = await fn();
        if (!cancelled) {
          setResult({ fn, data });
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Request failed");
      }
    };
    void tick();
    const id = setInterval(tick, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [fn, intervalMs]);

  // Ignore results that belong to a previous fn (e.g. the old worker id).
  const data = result?.fn === fn ? result.data : null;
  return { data, error, loading: data === null && error === null };
}
