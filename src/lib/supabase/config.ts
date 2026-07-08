const geoaiPreviewSupabaseUrl = "https://pphdqkurxneyagvnnjdt.supabase.co";
const geoaiPreviewPublishableKey = "sb_publishable_DW_uYi1s2vNMPSn6bsTgeg_vZevTDi4";

function isPreviewRuntime() {
  return process.env.VERCEL_ENV?.trim().toLowerCase() === "preview";
}

export function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || (isPreviewRuntime() ? geoaiPreviewSupabaseUrl : null);
}

export function getSupabaseAnonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || (isPreviewRuntime() ? geoaiPreviewPublishableKey : null);
}

export function getSupabaseServiceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || null;
}

export function isSupabaseConfigured() {
  return Boolean(getSupabaseUrl() && (getSupabaseServiceRoleKey() || getSupabaseAnonKey()));
}
