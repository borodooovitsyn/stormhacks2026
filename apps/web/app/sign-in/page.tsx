import { redirect } from "next/navigation";
import { auth, isResendConfigured, signIn } from "@/auth";
import { Card, PageHeader } from "@/components/ui";

type SignInPageProps = {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
};

function safeRedirect(value: string | undefined) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/account";
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const session = await auth();
  const params = await searchParams;
  const redirectTo = safeRedirect(params.callbackUrl);

  if (session?.user) redirect(redirectTo);

  return (
    <div className="mx-auto max-w-lg py-8 sm:py-16">
      <PageHeader
        title="Sign in"
        subtitle="Enter your email and we’ll send a one-time link. No password to remember."
      />
      <Card>
        <form
          action={async (formData) => {
            "use server";
            if (!isResendConfigured) redirect("/sign-in?error=EmailNotConfigured");
            await signIn("resend", formData);
          }}
          className="space-y-4"
        >
          <input type="hidden" name="redirectTo" value={redirectTo} />
          <label className="block">
            <span className="text-sm font-medium">Email address</span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              inputMode="email"
              required
              disabled={!isResendConfigured}
              autoFocus
              placeholder="you@example.com"
              className="mt-2 h-11 w-full rounded-lg border border-border bg-bg px-3 text-text outline-none transition-colors placeholder:text-muted focus:border-accent"
            />
          </label>
          {params.error && (
            <p role="alert" className="text-sm text-danger">
              {params.error === "EmailNotConfigured"
                ? "Email sign-in is not configured yet. Add a Resend API key to .env.local."
                : "We couldn’t send the sign-in email. Check the address and try again."}
            </p>
          )}
          {!isResendConfigured && !params.error && (
            <p role="status" className="text-sm text-warn">
              Email sign-in is unavailable until a Resend API key is added to .env.local.
            </p>
          )}
          <button
            type="submit"
            disabled={!isResendConfigured}
            className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-accent px-4 text-sm font-semibold text-accent-ink transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isResendConfigured ? "Email me a sign-in link" : "Resend setup required"}
          </button>
        </form>
        <p className="mt-4 text-xs leading-relaxed text-muted">
          The link expires after 10 minutes and can be used once.
        </p>
      </Card>
    </div>
  );
}
