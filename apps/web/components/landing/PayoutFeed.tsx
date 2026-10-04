"use client";

import { useEffect, useRef, useState } from "react";
import { PreviewBadge, sol } from "@/components/ui";
import { useReducedMotion } from "@/lib/useReducedMotion";

// Made-up rows cycled forever. Never real payouts; the badge says so.
const SAMPLES = [
  { sig: "5Kd9…q2Tn", usd: 0.184 },
  { sig: "3Hf1…x8Zc", usd: 0.221 },
  { sig: "9Pa7…m1Wd", usd: 0.096 },
  { sig: "2Rt5…k6Vb", usd: 0.312 },
  { sig: "7Lq3…d4Ye", usd: 0.143 },
];
const VISIBLE = 4;
const TICK_S = 4;

const ago = (s: number) => (s < 60 ? `${s}s ago` : `${Math.floor(s / 60)} min ago`);

export function PayoutFeed() {
  const reduced = useReducedMotion();
  const root = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  // tick = how many rows have arrived; row i was born at tick i.
  const [tick, setTick] = useState(VISIBLE - 1);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Tick only while visible, and never under reduced motion (static rows then).
  useEffect(() => {
    if (reduced || !inView) return;
    const id = setInterval(() => setTick((t) => t + 1), TICK_S * 1000);
    return () => clearInterval(id);
  }, [reduced, inView]);

  const rows = Array.from({ length: VISIBLE }, (_, i) => {
    const born = tick - i;
    return { id: born, ...SAMPLES[born % SAMPLES.length], age: i * TICK_S };
  });

  return (
    <div ref={root} className="rounded-2xl border border-border bg-surface p-4 sm:p-5" aria-label="Sample payout feed">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-sm text-muted">Payouts to a provider wallet</span>
        <PreviewBadge />
      </div>
      <ul className="divide-y divide-border" aria-live="off">
        {rows.map((r) => (
          <li
            key={r.id}
            className={`flex items-center justify-between gap-3 py-3 text-sm ${reduced ? "" : "feed-row"}`}
          >
            <span className="font-mono text-muted">{r.sig}</span>
            <span className="num text-xs text-muted">{ago(r.age)}</span>
            <span className="num font-medium text-accent">+{sol(r.usd)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted">Sample feed. Real payouts are metered per minute and paid in Solana.</p>
    </div>
  );
}
