import Link from "next/link";

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-border bg-surface p-5 sm:p-6 ${className}`}>
      {children}
    </section>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-xl text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  loading,
}: {
  label: string;
  value: string;
  hint?: string;
  loading?: boolean;
}) {
  // Flat on purpose: a row of boxed tiles is the dashboard cliché.
  return (
    <div className="border-t border-border pt-4">
      <p className="text-sm text-muted">{label}</p>
      {loading ? (
        <div className="skeleton mt-2 h-8 w-28" />
      ) : (
        <p className="num mt-1 text-2xl font-semibold tracking-tight">{value}</p>
      )}
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function PreviewBadge({ children = "Preview data" }: { children?: string }) {
  return (
    <span
      title="Waiting on a backend endpoint; numbers are placeholders"
      className="rounded-full border border-warn/40 bg-warn/10 px-2 py-0.5 text-[11px] font-medium text-warn"
    >
      {children}
    </span>
  );
}

export function LiveBadge({ live }: { live: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted">
      <span
        className={`live-dot h-2 w-2 rounded-full ${live ? "bg-accent" : "bg-danger"}`}
        aria-hidden
      />
      {live ? "Live" : "Offline"}
    </span>
  );
}

export function Button({
  children,
  onClick,
  disabled,
  variant = "primary",
  href,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "ghost";
  href?: string;
  type?: "button" | "submit";
}) {
  const cls =
    "inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent " +
    (variant === "primary"
      ? "bg-accent text-accent-ink hover:bg-accent-hover"
      : "border border-border text-text hover:bg-surface-2");
  // In-page anchors stay plain <a> so the smooth scroller owns the jump.
  if (href?.startsWith("#")) return <a href={href} className={cls}>{children}</a>;
  if (href) return <Link href={href} className={cls}>{children}</Link>;
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={cls}>
      {children}
    </button>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-border px-6 py-10 text-center">
      <p className="font-medium">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export const usd = (n: number, digits = 4) => `$${n.toFixed(digits)}`;

export const shortAddr = (a: string) => (a.length > 12 ? `${a.slice(0, 4)}…${a.slice(-4)}` : a);
