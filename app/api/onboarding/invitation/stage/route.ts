import { getEffectiveAuthMode } from "@/src/lib/auth/auth-mode";
import {
  onboardingInvitationCookieName,
  onboardingInvitationCookieOptions
} from "@/src/lib/auth/invitation-cookie.server";
import { isInvitationToken } from "@/src/lib/auth/invitation-token.server";
import { privateNoStoreJson } from "@/src/lib/http/private-no-store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (getEffectiveAuthMode() !== "supabase_auth") {
    return privateNoStoreJson({ ok: false, status: "auth_mode_disabled" }, { status: 503 });
  }

  const raw = await request.text();
  if (raw.length === 0 || raw.length > 2048) {
    return privateNoStoreJson({ ok: false, status: "invalid_invitation_request" }, { status: 400 });
  }

  let token: string | null = null;
  try {
    const payload = JSON.parse(raw) as { token?: unknown };
    token = typeof payload.token === "string" ? payload.token.trim() : null;
  } catch {
    token = null;
  }
  if (!token || !isInvitationToken(token)) {
    return privateNoStoreJson({ ok: false, status: "invalid_invitation_request" }, { status: 400 });
  }

  const response = privateNoStoreJson({ ok: true, status: "invitation_staged" });
  response.cookies.set(
    onboardingInvitationCookieName,
    token,
    onboardingInvitationCookieOptions(request.url)
  );
  return response;
}
