import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublishableKey, getSupabaseUrl } from "@/src/lib/supabase/config";

export async function updateSupabaseSession(request: NextRequest) {
  const url = getSupabaseUrl();
  const publishableKey = getSupabasePublishableKey();
  let response = NextResponse.next({ request });

  if (!url || !publishableKey) return response;

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      }
    }
  });

  // getClaims verifies token signature/expiry and refreshes when required.
  // Authorization still comes from RLS-backed membership rows, never claims.
  await supabase.auth.getClaims();
  return response;
}
