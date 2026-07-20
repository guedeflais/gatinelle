import { NextResponse } from "next/server";
import { extractBearerToken, revokeMobileSession } from "@/lib/mobileAuth";

export async function POST(request: Request) {
  const token = extractBearerToken(request);
  if (token) {
    await revokeMobileSession(token);
  }
  return NextResponse.json({ ok: true });
}
