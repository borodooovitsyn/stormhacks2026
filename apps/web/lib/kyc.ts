// Trulioo KYC, browser side. Trulioo credentials NEVER live here: the backend
// holds them, creates the Trulioo verification session and receives their
// webhook. The browser only embeds the hosted URL and reads the result.
//
// Backend contract this module expects (not in the API yet, ask backend owner):
//   POST /kyc/session -> { session_id, verification_url }   (needs Bearer token)
//   GET  /kyc/status  -> { status: KycStatus }              (needs Bearer token)
// Set NEXT_PUBLIC_KYC_ENABLED=true once both exist.

import { request } from "./api";

export type KycStatus = "unverified" | "pending" | "verified" | "rejected";

export const KYC_ENABLED = process.env.NEXT_PUBLIC_KYC_ENABLED === "true";

export const kyc = {
  start: () =>
    request<{ session_id: string; verification_url: string }>("/kyc/session", { method: "POST" }),
  status: () => request<{ status: KycStatus }>("/kyc/status"),
};
