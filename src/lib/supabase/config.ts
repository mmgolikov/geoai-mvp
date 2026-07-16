// Global anon clients are not request-scoped authorization. Keep application
// repositories disconnected until AUTH-01 replaces this foundation with a
// caller-JWT client and proves the RLS persona matrix.
export const requestScopedSupabaseRepositoriesEnabled: boolean = false;

export function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || null;
}

export function getSupabasePublishableKey() {
  const value = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  return value && /^sb_publishable_[A-Za-z0-9_-]{16,}$/.test(value) ? value : null;
}

export function isSupabaseConfigured() {
  return requestScopedSupabaseRepositoriesEnabled && Boolean(getSupabaseUrl() && getSupabasePublishableKey());
}
