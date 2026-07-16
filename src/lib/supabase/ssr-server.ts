import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getSupabasePublishableKey, getSupabaseUrl } from "@/src/lib/supabase/config";

export async function createRequestScopedSupabaseClient(): Promise<SupabaseClient | null> {
  const url = getSupabaseUrl();
  const publishableKey = getSupabasePublishableKey();
  if (!url || !publishableKey) return null;

  const cookieStore = await cookies();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot mutate response cookies. Middleware owns
          // refresh-cookie propagation; Route Handlers may write them.
        }
      }
    }
  });
}
