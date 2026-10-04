"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";

type LenisInstance = { destroy: () => void };
declare global {
  interface Window {
    Lenis?: new (opts: Record<string, unknown>) => LenisInstance;
  }
}

// Lenis smooth scroll for the landing page only. Loaded from the CDN script the
// team picked; skipped entirely for visitors who ask for reduced motion.
export function SmoothScroll() {
  const lenis = useRef<LenisInstance | null>(null);

  // onReady fires on every mount (onLoad only the first time).
  const start = () => {
    if (lenis.current || !window.Lenis) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    lenis.current = new window.Lenis({
      autoRaf: true,
      autoToggle: true,
      anchors: true,
      allowNestedScroll: true,
      naiveDimensions: true,
      stopInertiaOnNavigate: true,
    });
  };

  // Leaving the landing page restores native scrolling.
  useEffect(
    () => () => {
      lenis.current?.destroy();
      lenis.current = null;
    },
    [],
  );

  return (
    <>
      <link rel="stylesheet" href="https://unpkg.com/lenis@1.3.26/dist/lenis.css" />
      <Script src="https://unpkg.com/lenis@1.3.26/dist/lenis.min.js" strategy="afterInteractive" onReady={start} />
    </>
  );
}
