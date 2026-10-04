"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { EarningsPoint } from "@/lib/api";
import { useReducedMotion } from "@/lib/useReducedMotion";

const fmtTime = (s: number) =>
  new Date(s * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const tick = { fill: "var(--muted)", fontSize: 12 };

export function EarningsChart({ series }: { series: EarningsPoint[] }) {
  const reduced = useReducedMotion();
  const data = series.map((p) => ({ t: p.bucket, usd: p.cost_usd }));
  return (
    <>
      {/* The drawing is decorative for assistive tech; the table carries the data. */}
      <div className="h-72 w-full" aria-hidden>
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="earn" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" style={{ stopColor: "var(--accent)", stopOpacity: 0.3 }} />
                <stop offset="100%" style={{ stopColor: "var(--accent)", stopOpacity: 0 }} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="t"
              tickFormatter={fmtTime}
              tick={tick}
              tickLine={false}
              axisLine={false}
              minTickGap={32}
            />
            <YAxis
              tick={tick}
              tickLine={false}
              axisLine={false}
              width={52}
              tickFormatter={(v: number) => v.toFixed(2)}
            />
            <Tooltip
              contentStyle={{
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                fontSize: 13,
                color: "var(--text)",
              }}
              labelStyle={{ color: "var(--muted)" }}
              itemStyle={{ color: "var(--text)" }}
              labelFormatter={(l) => fmtTime(Number(l))}
              formatter={(v) => [`${Number(v).toFixed(4)} SOL`, "Earned"]}
            />
            <Area
              type="monotone"
              dataKey="usd"
              stroke="var(--accent)"
              strokeWidth={2}
              fill="url(#earn)"
              isAnimationActive={!reduced}
              animationDuration={600}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>Earnings per minute, most recent last</caption>
        <thead>
          <tr>
            <th scope="col">Time</th>
            <th scope="col">Earned (SOL)</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.t}>
              <th scope="row">{fmtTime(d.t)}</th>
              <td>{d.usd.toFixed(4)} SOL</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
