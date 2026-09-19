import { createServerClient, type CookieMethodsServer } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublishableKey, getSupabaseUrl } from "@/src/lib/supabase/config";
import {
  createPointObjectSourceMiddlewareAuthDeadline,
  isPointObjectSourceMiddlewareAuthDeadlineError,
  pointObjectSourceMiddlewareRoute
} from "@/src/lib/supabase/point-object-source-middleware-auth-deadline";

function sourceAuthDependencyResponse(timedOut: boolean) {
  return NextResponse.json({
    mode: "unavailable",
    code: timedOut ? "AUTH_DEPENDENCY_TIMEOUT" : "AUTH_DEPENDENCY_UNAVAILABLE",
    error: "Authentication dependency is temporarily unavailable.",
    retryable: true
  }, {
    status: 503,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      Vary: "Cookie",
      "Retry-After": "5"
    }
  });
}

export async function updateSupabaseSession(request: NextRequest) {
  const url = getSupabaseUrl();
  const publishableKey = getSupabasePublishableKey();
  let response = NextResponse.next({ request });

  if (!url || !publishableKey) return response;

  const sourceRoute = pointObjectSourceMiddlewareRoute(request.nextUrl.pathname);
  const sourceDeadline = sourceRoute ? createPointObjectSourceMiddlewareAuthDeadline(sourceRoute) : null;

  const cookies: CookieMethodsServer = {
    getAll() {
      return request.cookies.getAll();
    },
    setAll(cookiesToSet) {
      const apply = () => {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      };
      if (sourceDeadline) sourceDeadline.runCookieMutation(apply);
      else apply();
    }
  };
  const supabase = sourceDeadline ? createServerClient(url, publishableKey, {
    global: { fetch: sourceDeadline.fetch },
    cookies
  }) : createServerClient(url, publishableKey, {
    cookies
  });

  // getClaims verifies token signature/expiry and refreshes when required.
  // Authorization still comes from RLS-backed membership rows, never claims.
  if (!sourceDeadline) {
    await supabase.auth.getClaims();
    return response;
  }

  sourceDeadline.stage("auth_started");
  try {
    await sourceDeadline.run(supabase.auth.getClaims());
    sourceDeadline.stage("auth_completed");
    return response;
  } catch (error) {
    const timedOut = isPointObjectSourceMiddlewareAuthDeadlineError(error);
    sourceDeadline.stage(timedOut ? "auth_timeout" : "auth_failed");
    return sourceAuthDependencyResponse(timedOut);
  } finally {
    sourceDeadline.terminate();
    sourceDeadline.stage("finished");
  }
}
