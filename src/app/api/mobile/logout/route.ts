import { extractBearerToken, revokeMobileSession } from "@/lib/mobileAuth";
import { corsJson, corsOptionsResponse } from "@/lib/mobileCors";

export async function OPTIONS() {
  return corsOptionsResponse();
}

export async function POST(request: Request) {
  const token = extractBearerToken(request);
  if (token) {
    await revokeMobileSession(token);
  }
  return corsJson({ ok: true });
}
