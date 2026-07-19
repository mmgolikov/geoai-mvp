import { hashInvitationToken, isInvitationToken } from "@/src/lib/auth/invitation-token.server";
import {
  onboardingInvitationCookieName,
  onboardingInvitationCookieOptions
} from "@/src/lib/auth/invitation-cookie.server";
import { createRequestAuthContext } from "@/src/lib/auth/request-context";
import { privateNoStoreJson } from "@/src/lib/http/private-no-store";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const context = await createRequestAuthContext(request);
  if (!context.verified || !context.supabase || !context.user || !context.profile) {
    return privateNoStoreJson({ ok: false, status: "authentication_required" }, { status: 401 });
  }

  const raw = await request.text();
  if (raw.length > 2048) {
    return privateNoStoreJson({ ok: false, status: "invalid_invitation_request" }, { status: 400 });
  }

  let token: string | null = null;
  if (raw.length > 0) {
    try {
      const payload = JSON.parse(raw) as { token?: unknown };
      token = typeof payload.token === "string" ? payload.token.trim() : null;
    } catch {
      token = null;
    }
  }
  if (!token) {
    const cookieStore = await cookies();
    token = cookieStore.get(onboardingInvitationCookieName)?.value.trim() ?? null;
  }
  if (!token || !isInvitationToken(token)) {
    return privateNoStoreJson({ ok: false, status: "invalid_invitation_request" }, { status: 400 });
  }

  const requestId = crypto.randomUUID();
  const response = await context.supabase.schema("api").rpc("accept_invitation", {
    target_token_hash: hashInvitationToken(token),
    request_id: requestId
  });
  if (response.error) {
    return privateNoStoreJson({ ok: false, status: "invitation_denied_or_unavailable", requestId }, { status: 409 });
  }

  const result = privateNoStoreJson({
    ok: true,
    status: "invitation_processed",
    data: response.data,
    requestId
  });
  result.cookies.set(
    onboardingInvitationCookieName,
    "",
    onboardingInvitationCookieOptions(request.url, 0)
  );
  return result;
}
