"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";

// Inline term explainer: hover, focus or tap the underlined text. Replaces an
// FAQ page, the answer shows up where the question comes up.
export function Tooltip({
  children,
  content,
  containerClassName = "",
}: {
  children: React.ReactNode;
  content: React.ReactNode;
  containerClassName?: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [shift, setShift] = useState(0);
  const root = useRef<HTMLSpanElement>(null);
  const card = useRef<HTMLSpanElement>(null);

  const close = useCallback(() => setOpen(false), []);

  // Keep the card inside the viewport (8px margin) without leaving its anchor.
  useLayoutEffect(() => {
    if (!open || !card.current) return;
    const r = card.current.getBoundingClientRect();
    const pad = 8;
    const vw = document.documentElement.clientWidth;
    const base = r.left - shift;
    const right = base + r.width;
    let next = 0;
    if (base < pad) next = pad - base;
    else if (right > vw - pad) next = vw - pad - right;
    setShift(next);
  }, [open, shift]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) close();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open, close]);

  return (
    <span
      ref={root}
      className={`relative inline-block ${containerClassName}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={close}
    >
      <span
        tabIndex={0}
        role="button"
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        onFocus={() => setOpen(true)}
        onBlur={close}
        onClick={() => setOpen((o) => !o)}
        className="underline decoration-muted decoration-dotted underline-offset-4 transition-colors hover:decoration-accent focus-visible:decoration-accent"
      >
        {children}
      </span>
      {open && (
        <span
          ref={card}
          id={id}
          role="tooltip"
          style={{ transform: `translateX(calc(-50% + ${shift}px))` }}
          className="absolute bottom-full left-1/2 z-40 mb-2 block w-64 rounded-xl border border-border bg-surface-2 p-3 text-left text-xs font-normal leading-relaxed text-text"
        >
          {content}
        </span>
      )}
    </span>
  );
}
