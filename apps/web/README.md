# CoreWhore Web

Next.js client for GPU Share, including password accounts with Resend email verification and a separate Solana wallet verification flow.

## Getting Started

Install dependencies, configure auth, migrate the auth tables, and run the development server:

```bash
cp .env.example .env.local
npm install
npm run auth:migrate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Required authentication variables:

- `AUTH_SECRET`: generate with `npx auth secret`.
- `AUTH_DATABASE_URL`: PostgreSQL connection used for accounts, sessions, and verification tokens.
- `AUTH_RESEND_KEY`: Resend API key.
- `AUTH_EMAIL_FROM`: sender on a domain verified in Resend.
- `NEXT_PUBLIC_APP_URL`: public web origin used in registration verification links.

Registration stores a `scrypt` password hash and sends a one-time Resend link. Password sign-in is enabled only after the email is verified. The existing Solana wallet flow remains separate and verifies wallet ownership for API and payment operations.

Google and GitHub can be added later as Auth.js providers without changing the account tables.

## Checks

```bash
npm run lint
npm run build
```
