"use client";

import { useEffect, useRef } from "react";

// Placeholder result: procedural terrain with a river/flood plain. Replaced by
// the real merged segmentation mask once the jobs endpoint returns result_url.
function hash(x: number, y: number) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function noise(x: number, y: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi);
  const b = hash(xi + 1, yi);
  const c = hash(xi, yi + 1);
  const d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

export function FloodMap() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const W = canvas.width;
    const H = canvas.height;
    const img = ctx.createImageData(W, H);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const n = noise(x / 28, y / 28) * 0.6 + noise(x / 9, y / 9) * 0.4;
        const river = Math.abs(y - (H * 0.5 + Math.sin(x / 55) * 45)) / 60;
        const flooded = n * 0.55 + river * 0.6 < 0.42;
        const i = (y * W + x) * 4;
        const g = 70 + n * 90;
        if (flooded) {
          img.data[i] = 40;
          img.data[i + 1] = 120 + n * 60;
          img.data[i + 2] = 230;
        } else {
          img.data[i] = g * 0.8;
          img.data[i + 1] = g;
          img.data[i + 2] = g * 0.6;
        }
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }, []);

  return (
    <canvas
      ref={ref}
      width={720}
      height={320}
      role="img"
      aria-label="Flood extent map; flooded areas shown in blue"
      className="h-auto w-full rounded-xl border border-border"
    />
  );
}
