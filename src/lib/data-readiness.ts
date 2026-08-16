export type ImportedMetricReadiness = {
  count: number;
  hasProjectMatch?: boolean;
};

export function getImportedMetricsReadinessMessage({ count, hasProjectMatch }: ImportedMetricReadiness) {
  if (count <= 0) {
    return "No imported snapshot metrics are available; illustrative local context remains available.";
  }

  if (hasProjectMatch === false) {
    return "Imported snapshot metrics are available, but no project-level area match exists; illustrative local context is used for this card.";
  }

  return "Manual snapshot metrics are available; they are not live official data.";
}

export function getSupabaseFallbackMessage(configured?: boolean) {
  return configured
    ? "Supabase/PostGIS configured; availability depends on project database access."
    : "Illustrative local fallback; Supabase/PostGIS not configured.";
}
