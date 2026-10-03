"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { EarningsPoint } from "@/lib/api";
import { useReducedMotion } from "@/lib/useReducedMotion";

const fmtTime = (s: number) =>
  new Date(s * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export function EarningsChart({ series }: { series: EarningsPoint[] }) {
  const reduced = useReducedMotion();
  const data = series.map((p) => ({ t: p.bucket, usd: p.cost_usd }));
  return (
    <div className="h-72 w-full" role="img" aria-label="Earnings per minute, last 10 minutes">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="earn" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3dff72" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#3dff72" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#1f281f" vertical={false} />
          <XAxis
            dataKey="t"
            tickFormatter={fmtTime}
            stroke="#8b95a3"
            tickLine={false}
            axisLine={false}
            fontSize={12}
            minTickGap={32}
          />
          <YAxis
            stroke="#8b95a3"
            tickLine={false}
            axisLine={false}
            fontSize={12}
            width={52}
            tickFormatter={(v: number) => `$${v.toFixed(2)}`}
          />
          <Tooltip
            contentStyle={{
              background: "#151b15",
              border: "1px solid #1f281f",
              borderRadius: 10,
              fontSize: 13,
            }}
            labelFormatter={(l) => fmtTime(Number(l))}
            formatter={(v) => [`$${Number(v).toFixed(4)}`, "Earned"]}
          />
          <Area
            type="monotone"
            dataKey="usd"
            stroke="#3dff72"
            strokeWidth={2}
            fill="url(#earn)"
            isAnimationActive={!reduced}
            animationDuration={600}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
