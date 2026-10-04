import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AccountSignOutButton } from "@/components/AccountSignOutButton";
import { Button, Card, PageHeader } from "@/components/ui";

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in?callbackUrl=/account");

  return (
    <>
      <PageHeader
        title="Account"
        subtitle="Your sign-in identity and connected payment credentials."
        action={<AccountSignOutButton />}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <p className="text-sm text-muted">Email</p>
          <p className="mt-2 break-all font-medium">{session.user.email}</p>
          <p className="mt-3 text-xs text-muted">Verified during account registration.</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Payment wallet</p>
          <p className="mt-2 font-medium">Connect your Solana wallet</p>
          <p className="mt-3 text-xs text-muted">
            Your wallet remains separate from sign-in until you verify a signed message.
          </p>
          <div className="mt-4">
            <Button href="/wallet" variant="ghost">Open wallet</Button>
          </div>
        </Card>
      </div>
    </>
  );
}
