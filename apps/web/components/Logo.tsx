export function Logo({ size = "text-2xl" }: { size?: string }) {
  return (
    <span
      className={`font-logo font-extrabold italic leading-none tracking-tighter text-accent ${size}`}
      aria-label="CoreWhore"
    >
      CW<span className="cursor" aria-hidden>_</span>
    </span>
  );
}
