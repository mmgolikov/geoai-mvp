export const geoaiSupabaseProjectRef = "pphdqkurxneyagvnnjdt";
export const geoaiPreviewSupabaseUrl = `https://${geoaiSupabaseProjectRef}.supabase.co`;
export const geoaiPreviewPublishableKey = "sb_publishable_DW_uYi1s2vNMPSn6bsTgeg_vZevTDi4";

export function isPreviewRuntime() {
  return process.env.VERCEL_ENV?.trim().toLowerCase() === "preview";
}

export function getSupabaseUrl() {
  return isPreviewRuntime() ? geoaiPreviewSupabaseUrl : process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || null;
}

export function getSupabaseAnonKey() {
  return isPreviewRuntime() ? geoaiPreviewPublishableKey : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || null;
}

export function getSupabaseServiceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || null;
}

export function isSupabaseConfigured() {
  return Boolean(getSupabaseUrl() && (getSupabaseServiceRoleKey() || getSupabaseAnonKey()));
}
