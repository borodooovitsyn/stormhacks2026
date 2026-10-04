import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { authPool } from "@/lib/auth-db";
import { hashPassword } from "@/lib/password";

const resendApiKey = process.env.AUTH_RESEND_KEY?.trim();
export const isResendConfigured = Boolean(
  resendApiKey && resendApiKey !== "re_your_api_key" && resendApiKey !== "re_replace_me",
);
const configuredEmailFrom = process.env.AUTH_EMAIL_FROM?.trim();
const emailFrom =
  configuredEmailFrom && !configuredEmailFrom.includes("your-verified-domain.com")
    ? configuredEmailFrom
    : "CoreShare <onboarding@resend.dev>";

type RegistrationResult =
  | { ok: true; email: string }
  | {
      ok: false;
      error: "invalid_email" | "weak_password" | "password_mismatch" | "account_exists" | "email_unavailable";
    };

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function sendVerificationEmail(email: string, token: string) {
  if (!resendApiKey) throw new Error("Resend is not configured");

  const appUrl = (process.env.AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );
  const url = new URL("/api/auth/verify-email", appUrl);
  url.searchParams.set("email", email);
  url.searchParams.set("token", token);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: emailFrom,
      to: [email],
      subject: "Confirm your CoreShare account",
      text: `Confirm your email by opening this link: ${url.toString()}\n\nThis link expires in 30 minutes.`,
      html: `<p>Confirm your email to finish creating your CoreShare account.</p><p><a href="${url
        .toString()
        .replaceAll("&", "&amp;")}">Confirm email</a></p><p>This link expires in 30 minutes.</p>`,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Resend rejected the verification email: ${response.status} ${detail}`);
  }
}

export async function registerAccount(formData: FormData): Promise<RegistrationResult> {
  const emailValue = formData.get("email");
  const email = typeof emailValue === "string" ? emailValue.trim().toLowerCase() : "";
  const password = formData.get("password");
  const passwordConfirmation = formData.get("password_confirmation");

  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 255) {
    return { ok: false, error: "invalid_email" };
  }
  if (typeof password !== "string" || password.length < 8 || password.length > 128) {
    return { ok: false, error: "weak_password" };
  }
  if (password !== passwordConfirmation) return { ok: false, error: "password_mismatch" };
  if (!isResendConfigured) return { ok: false, error: "email_unavailable" };

  const passwordHash = await hashPassword(password);
  const rawToken = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + 30 * 60 * 1000);
  const client = await authPool.connect();

  try {
    await client.query("BEGIN");
    const existing = await client.query<{
      id: number;
      emailVerified: Date | null;
      password_hash: string | null;
    }>(
      'SELECT id, "emailVerified", password_hash FROM users WHERE LOWER(email) = $1 FOR UPDATE',
      [email],
    );

    let userId: number;
    if (existing.rowCount) {
      const user = existing.rows[0];
      if (user.emailVerified && user.password_hash) {
        await client.query("ROLLBACK");
        return { ok: false, error: "account_exists" };
      }
      userId = user.id;
      await client.query('UPDATE users SET password_hash = $1, "emailVerified" = NULL WHERE id = $2', [
        passwordHash,
        userId,
      ]);
    } else {
      const inserted = await client.query<{ id: number }>(
        'INSERT INTO users (email, password_hash, "emailVerified") VALUES ($1, $2, NULL) RETURNING id',
        [email, passwordHash],
      );
      userId = inserted.rows[0].id;
    }

    await client.query("DELETE FROM email_verification_tokens WHERE user_id = $1", [userId]);
    await client.query(
      "INSERT INTO email_verification_tokens (user_id, token_hash, expires) VALUES ($1, $2, $3)",
      [userId, tokenHash(rawToken), expires],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  try {
    await sendVerificationEmail(email, rawToken);
  } catch (error) {
    console.error("Unable to send registration verification email", error);
    return { ok: false, error: "email_unavailable" };
  }

  return { ok: true, email };
}

export async function verifyRegistrationEmail(emailValue: string | null, rawToken: string | null) {
  const email = emailValue?.trim().toLowerCase() ?? "";
  if (!email || !rawToken) return false;

  const client = await authPool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query<{ user_id: number }>(
      `SELECT token.user_id
       FROM email_verification_tokens token
       JOIN users ON users.id = token.user_id
       WHERE LOWER(users.email) = $1
         AND token.token_hash = $2
         AND token.expires > NOW()
       FOR UPDATE`,
      [email, tokenHash(rawToken)],
    );

    if (!result.rowCount) {
      await client.query("ROLLBACK");
      return false;
    }

    const userId = result.rows[0].user_id;
    await client.query('UPDATE users SET "emailVerified" = NOW() WHERE id = $1', [userId]);
    await client.query("DELETE FROM email_verification_tokens WHERE user_id = $1", [userId]);
    await client.query("COMMIT");
    return true;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
