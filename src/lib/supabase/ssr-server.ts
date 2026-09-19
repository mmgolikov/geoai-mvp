import { createServerClient, type CookieMethodsServer } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getEffectiveAuthMode } from "@/src/lib/auth/auth-mode";
import { getSupabasePublishableKey, getSupabaseUrl } from "@/src/lib/supabase/config";

function deadlineBoundFetch(deadlineSignal: AbortSignal): typeof fetch {
  return (input, init) => {
    const signals = [deadlineSignal];
    if (input instanceof Request) signals.push(input.signal);
    if (init?.signal) signals.push(init.signal);
    return globalThis.fetch(input, {
      ...init,
      signal: AbortSignal.any(signals)
    });
  };
}

export async function createRequestScopedSupabaseClient(deadlineSignal?: AbortSignal): Promise<SupabaseClient | null> {
  if (getEffectiveAuthMode() !== "supabase_auth") return null;
  const url = getSupabaseUrl();
  const publishableKey = getSupabasePublishableKey();
  if (!url || !publishableKey) return null;

  const cookieStore = await cookies();

  const cookieMethods: CookieMethodsServer = {
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
  };

  if (!deadlineSignal) return createServerClient(url, publishableKey, {
    cookies: cookieMethods
  });

  return createServerClient(url, publishableKey, {
    global: { fetch: deadlineBoundFetch(deadlineSignal) },
    cookies: cookieMethods
  });
}
