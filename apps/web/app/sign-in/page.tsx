import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SignInForm } from "@/components/SignInForm";
import { Card, PageHeader } from "@/components/ui";

type SignInPageProps = {
  searchParams: Promise<{ callbackUrl?: string; error?: string; verified?: string }>;
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
      <PageHeader title="Sign in" subtitle="Use the email and password from your verified account." />
      <Card>
        <SignInForm callbackUrl={redirectTo} hasError={Boolean(params.error)} verified={params.verified === "1"} />
      </Card>
    </div>
  );
}
