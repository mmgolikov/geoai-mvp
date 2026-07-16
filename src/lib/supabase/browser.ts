"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublishableKey, getSupabaseUrl } from "@/src/lib/supabase/config";

let browserClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient | null {
  const url = getSupabaseUrl();
  const publishableKey = getSupabasePublishableKey();
  if (!url || !publishableKey) return null;

  if (!browserClient) {
    browserClient = createBrowserClient(url, publishableKey);
  }

  return browserClient;
}
