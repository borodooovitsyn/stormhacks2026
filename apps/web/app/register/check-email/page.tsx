import Link from "next/link";
import { Card, PageHeader } from "@/components/ui";

export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  return (
    <div className="mx-auto max-w-lg py-8 sm:py-16">
      <PageHeader title="Check your email" subtitle="Your account is waiting for one final confirmation." />
      <Card>
        <p className="text-sm leading-relaxed text-muted">
          We sent a verification link{email ? ` to ${email}` : ""}. Open it within 30 minutes, then sign in
          with your password.
        </p>
        <Link href="/sign-in" className="mt-5 inline-flex text-sm font-medium text-text hover:text-accent">
          Back to sign in
        </Link>
      </Card>
    </div>
  );
}
