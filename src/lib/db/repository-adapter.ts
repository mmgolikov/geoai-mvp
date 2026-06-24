import { getSchemaReadinessSummary } from "@/src/lib/db/schema-readiness";
import { repositoryModeFields, type RepositoryMode } from "@/src/lib/repositories/repository-mode";

export const supabasePreparedRepositories = [
  "projects",
  "aois",
  "analysis_runs",
  "reports",
  "comparison_sets",
  "data_room_assets",
  "pilot_workflows",
  "pilot_client_inputs",
  "pilot_deliverables",
  "ai_decision_scores",
  "audit_events"
] as const;

export type SupabasePreparedRepository = (typeof supabasePreparedRepositories)[number];

export async function getRepositoryAdapterStatus(repository: SupabasePreparedRepository) {
  const readiness = await getSchemaReadinessSummary();
  const mode: RepositoryMode = readiness.repositoryMode === "supabase" ? "supabase" : "local_fallback";

  return {
    repository,
    ready: mode === "supabase",
    schemaVersion: readiness.schemaVersion,
    missingTables: readiness.missingTables,
    ...repositoryModeFields(mode)
  };
}

export async function shouldUseSupabaseRepository(repository: SupabasePreparedRepository) {
  const status = await getRepositoryAdapterStatus(repository);
  return status.ready;
}
