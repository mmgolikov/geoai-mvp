import { NextResponse, type NextRequest } from "next/server";
import { evaluateApiMutationOrigin } from "@/src/lib/auth/api-mutation-origin";
import { getEffectiveAuthMode } from "@/src/lib/auth/auth-mode";
import { updateSupabaseSession } from "@/src/lib/supabase/update-session";

function isAuthCookieMutationPath(pathname: string) {
  return pathname === "/api/admin" ||
    pathname === "/api/auth/logout" ||
    pathname === "/api/onboarding/invitation" ||
    pathname.startsWith("/api/onboarding/invitation/");
}

export function middleware(request: NextRequest) {
  const authMode = getEffectiveAuthMode();
  if (authMode !== "supabase_auth" && !isAuthCookieMutationPath(request.nextUrl.pathname)) {
    return NextResponse.next({ request });
  }

  const originDecision = evaluateApiMutationOrigin({
    method: request.method,
    pathname: request.nextUrl.pathname,
    requestUrl: request.url,
    origin: request.headers.get("origin"),
    secFetchSite: request.headers.get("sec-fetch-site"),
    host: request.headers.get("host"),
    forwardedHost: request.headers.get("x-forwarded-host"),
    forwardedProto: request.headers.get("x-forwarded-proto")
  });
  if (!originDecision.allowed) {
    return NextResponse.json({
      ok: false,
      status: "request_origin_rejected",
      message: "Authenticated API mutations require a same-origin request."
    }, {
      status: 403,
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
        "Vary": "Origin, Sec-Fetch-Site, Cookie"
      }
    });
  }

  if (authMode !== "supabase_auth") {
    return NextResponse.next({ request });
  }

  return updateSupabaseSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"
  ]
};
