import { getSafeAuthSessionSummary } from "@/src/lib/auth/session-summary";
import { privateNoStoreJson } from "@/src/lib/http/private-no-store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getSafeAuthSessionSummary(request);
  return privateNoStoreJson(session);
}
