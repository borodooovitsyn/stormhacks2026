import { Button } from "@/components/ui";

const STEPS = [
  { t: "Upload", d: "Satellite tiles or audio files. Fixed job types only, so providers stay safe." },
  { t: "Split", d: "We shard the job into chunks and run them on idle GPUs in parallel." },
  { t: "Pay per minute", d: "Usage is metered from real GPU logs; providers are paid on Solana." },
];

export default function Home() {
  return (
    <div className="py-8 sm:py-20">
      <h1 className="max-w-3xl text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
        Rent a GPU by the minute. Or get paid for yours.
      </h1>
      <p className="mt-6 max-w-xl text-lg text-muted">
        Students and small teams get cheap compute. GPU owners earn from hardware that’s idle most of the day.
        No card, no cloud account, just a Solana wallet.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button href="/rent">Rent GPUs</Button>
        <Button href="/download" variant="ghost">Share my GPU</Button>
      </div>

      <dl className="mt-20 grid gap-8 sm:grid-cols-3">
        {STEPS.map((s) => (
          <div key={s.t} className="border-t border-border pt-4">
            <dt className="font-medium">{s.t}</dt>
            <dd className="mt-1.5 text-sm text-muted">{s.d}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
