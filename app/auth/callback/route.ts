import { NextResponse } from "next/server";
import { isPasswordOnlyAuthEnabled } from "@/src/lib/auth/password-only-policy";
import { getSafeAuthRedirectPath } from "@/src/lib/auth/redirect-path";
import { applyPrivateNoStore } from "@/src/lib/http/private-no-store";
import { createRequestScopedSupabaseClient } from "@/src/lib/supabase/ssr-server";
import { getPublicRequestOrigin } from "@/src/lib/platform/public-request-origin";

export const runtime = "nodejs";

function redirect(requestUrl: URL, path: string) {
  return applyPrivateNoStore(NextResponse.redirect(new URL(path, getPublicRequestOrigin(requestUrl.href))));
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code")?.trim();
  const next = getSafeAuthRedirectPath(requestUrl.searchParams.get("next"));
  if (!code || code.length > 2048) {
    return redirect(requestUrl, "/login?auth_error=invalid_callback");
  }
  if (isPasswordOnlyAuthEnabled()) {
    const params = new URLSearchParams({ auth_error: "password_only_required", next });
    return redirect(requestUrl, `/login?${params.toString()}`);
  }

  const supabase = await createRequestScopedSupabaseClient();
  if (!supabase) {
    return redirect(requestUrl, "/login?auth_error=configuration_unavailable");
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return redirect(requestUrl, "/login?auth_error=callback_failed");
  }

  return redirect(requestUrl, next);
}
