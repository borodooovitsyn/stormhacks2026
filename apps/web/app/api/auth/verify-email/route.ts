import { NextRequest, NextResponse } from "next/server";
import { verifyRegistrationEmail } from "@/lib/accounts";

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email");
  const token = request.nextUrl.searchParams.get("token");
  const verified = await verifyRegistrationEmail(email, token);
  const target = new URL("/sign-in", request.url);
  target.searchParams.set(verified ? "verified" : "error", verified ? "1" : "VerificationFailed");
  return NextResponse.redirect(target);
}
