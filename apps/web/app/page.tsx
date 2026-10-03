import { Button } from "@/components/ui";

const STEPS = [
  { n: "01", t: "Upload", d: "Satellite tiles or audio files. Fixed job types only, so providers stay safe." },
  { n: "02", t: "Split", d: "We shard the job into chunks and run them on idle GPUs in parallel." },
  { n: "03", t: "Pay per minute", d: "Usage is metered from real GPU logs; providers are paid on Solana." },
];

export default function Home() {
  return (
    <div className="py-8 sm:py-16">
      <p className="text-sm font-medium text-accent">Flood Watch · powered by idle GPUs</p>
      <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
        Rent a GPU by the minute. Or get paid for yours.
      </h1>
      <p className="mt-5 max-w-xl text-lg text-muted">
        Students and small teams get cheap compute. GPU owners earn from hardware that’s idle most of the day.
        No card, no cloud account, just a Solana wallet.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button href="/rent">Rent GPUs</Button>
        <Button href="/download" variant="ghost">Share my GPU</Button>
      </div>

      <ol className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-3">
        {STEPS.map((s) => (
          <li key={s.n} className="bg-surface p-6">
            <span className="num font-mono text-sm text-muted">{s.n}</span>
            <h2 className="mt-3 font-medium">{s.t}</h2>
            <p className="mt-1 text-sm text-muted">{s.d}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
