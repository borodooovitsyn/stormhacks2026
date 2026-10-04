import Image from "next/image";

/** The logo: a static SVG with a transparent background, used on every page. */
export function Logo({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <Image
      src="/coreshare-mark.svg"
      alt="CoreShare"
      width={40}
      height={40}
      priority
      unoptimized
      className={className}
    />
  );
}
