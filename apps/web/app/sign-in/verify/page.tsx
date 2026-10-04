import { Button, Card, PageHeader } from "@/components/ui";

export default function VerifyPage() {
  return (
    <div className="mx-auto max-w-lg py-8 sm:py-16">
      <PageHeader
        title="Check your inbox"
        subtitle="Your one-time sign-in link is on its way. Open it in this browser to finish signing in."
      />
      <Card>
        <p className="text-sm text-muted">
          No email after a minute? Check spam, then request a fresh link. Only the newest link needs to be used.
        </p>
        <div className="mt-5">
          <Button href="/sign-in" variant="ghost">Use another email</Button>
        </div>
      </Card>
    </div>
  );
}
