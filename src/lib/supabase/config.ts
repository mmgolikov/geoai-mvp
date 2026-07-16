// Global anon clients are not request-scoped authorization. Keep application
// repositories disconnected until AUTH-01 replaces this foundation with a
// caller-JWT client and proves the RLS persona matrix.
export const requestScopedSupabaseRepositoriesEnabled = false;

export function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || null;
}

export function getSupabaseAnonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || null;
}

export function isSupabaseConfigured() {
  return requestScopedSupabaseRepositoriesEnabled && Boolean(getSupabaseUrl() && getSupabaseAnonKey());
}
