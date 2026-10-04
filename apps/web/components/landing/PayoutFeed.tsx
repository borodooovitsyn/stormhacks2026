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
// A new payout lands after a random 1-10 s wait, so the feed doesn't tick like a metronome.
const MIN_GAP_S = 1;
const MAX_GAP_S = 10;
// Fixed starting gaps (newest first) so server and client render the same first frame.
const INITIAL_GAPS = [3, 7, 2];

const randomGap = () => MIN_GAP_S + Math.floor(Math.random() * (MAX_GAP_S - MIN_GAP_S + 1));
const ago = (s: number) => (s === 0 ? "just now" : s < 60 ? `${s}s ago` : `${Math.floor(s / 60)} min ago`);

export function PayoutFeed() {
  const reduced = useReducedMotion();
  const root = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  // tick = how many rows have arrived; row i was born at tick i.
  // gaps[i] = seconds between row i and the row above it (newest first).
  const [feed, setFeed] = useState({ tick: VISIBLE - 1, gaps: INITIAL_GAPS });

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
    let id: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const gap = randomGap();
      id = setTimeout(() => {
        setFeed((f) => ({ tick: f.tick + 1, gaps: [gap, ...f.gaps].slice(0, VISIBLE - 1) }));
        schedule();
      }, gap * 1000);
    };
    schedule();
    return () => clearTimeout(id);
  }, [reduced, inView]);

  const rows = Array.from({ length: VISIBLE }, (_, i) => {
    const born = feed.tick - i;
    const age = feed.gaps.slice(0, i).reduce((a, b) => a + b, 0);
    return { id: born, ...SAMPLES[born % SAMPLES.length], age };
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
