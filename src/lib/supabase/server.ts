import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  getSupabaseAnonKey,
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
  isSupabaseConfigured
} from "@/src/lib/supabase/config";

export type SupabaseServerClient = SupabaseClient;

export async function getSupabaseServerClient(): Promise<SupabaseServerClient | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const url = getSupabaseUrl();
  const key = getSupabaseServiceRoleKey() ?? getSupabaseAnonKey();

  if (!url || !key) {
    return null;
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    },
    global: {
      headers: {
        "X-Client-Info": "geoai-mvp-server"
      }
    }
  });
}
