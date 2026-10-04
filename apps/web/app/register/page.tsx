import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isResendConfigured, registerAccount } from "@/lib/accounts";
import { Card, PageHeader } from "@/components/ui";

type RegisterPageProps = { searchParams: Promise<{ error?: string }> };

const errors: Record<string, string> = {
  invalid_email: "Enter a valid email address.",
  weak_password: "Password must contain between 8 and 128 characters.",
  password_mismatch: "Passwords do not match.",
  account_exists: "An account with this email already exists.",
  email_unavailable: "We couldn’t send the verification email. Try again in a moment.",
};

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const session = await auth();
  if (session?.user) redirect("/account");
  const params = await searchParams;

  return (
    <div className="mx-auto max-w-lg py-8 sm:py-16">
      <PageHeader
        title="Create account"
        subtitle="Choose a password, then confirm your email once through Resend."
      />
      <Card>
        {params.error && (
          <p role="alert" className="mb-4 text-sm text-danger">
            {errors[params.error] ?? "Account creation failed. Try again."}
          </p>
        )}
        {!isResendConfigured && (
          <p role="status" className="mb-4 text-sm text-warn">
            Registration is unavailable until Resend is configured.
          </p>
        )}
        <form
          action={async (formData) => {
            "use server";
            const result = await registerAccount(formData);
            if (!result.ok) redirect(`/register?error=${result.error}`);
            redirect(`/register/check-email?email=${encodeURIComponent(result.email)}`);
          }}
          className="space-y-4"
        >
          <label className="block">
            <span className="text-sm font-medium">Email address</span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              inputMode="email"
              required
              autoFocus
              disabled={!isResendConfigured}
              placeholder="you@example.com"
              className="mt-2 h-11 w-full rounded-lg border border-border bg-bg px-3 text-text outline-none transition-colors placeholder:text-muted focus:border-accent disabled:opacity-50"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Password</span>
            <input
              type="password"
              name="password"
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={128}
              disabled={!isResendConfigured}
              className="mt-2 h-11 w-full rounded-lg border border-border bg-bg px-3 text-text outline-none transition-colors focus:border-accent disabled:opacity-50"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Confirm password</span>
            <input
              type="password"
              name="password_confirmation"
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={128}
              disabled={!isResendConfigured}
              className="mt-2 h-11 w-full rounded-lg border border-border bg-bg px-3 text-text outline-none transition-colors focus:border-accent disabled:opacity-50"
            />
          </label>
          <button
            type="submit"
            disabled={!isResendConfigured}
            className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-accent px-4 text-sm font-semibold text-accent-ink transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            Create account
          </button>
        </form>
        <p className="mt-4 text-sm text-muted">
          Already verified?{" "}
          <Link href="/sign-in" className="font-medium text-text hover:text-accent">
            Sign in
          </Link>
        </p>
      </Card>
    </div>
  );
}
