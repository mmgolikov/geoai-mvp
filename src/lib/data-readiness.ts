export type ImportedMetricReadiness = {
  count: number;
  hasProjectMatch?: boolean;
};

export function getImportedMetricsReadinessMessage({ count, hasProjectMatch }: ImportedMetricReadiness) {
  if (count <= 0) {
    return "No sample metrics available yet; seed fallback remains available.";
  }

  if (hasProjectMatch === false) {
    return "Sample metrics available, but no project-level area match yet; seed fallback used for this card.";
  }

  return "Sample metrics available - manual/offline import; not live official data.";
}

export function getSupabaseFallbackMessage(configured?: boolean) {
  return configured
    ? "Supabase/PostGIS configured; availability depends on project database access."
    : "Local/demo fallback; Supabase/PostGIS not configured.";
}

