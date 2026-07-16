import { repositoryModeToCaveat, type RepositoryMode } from "@/src/lib/repositories/repository-mode";
import { probeSupabaseApiHealth } from "@/src/lib/supabase/api-readiness";

export const geoaiPersistenceMigrationName = "20260705102844_geoai_pilot_persistence_foundation";
export const geoaiPersistenceSchemaVersion = "v2.3";

export const requiredPersistenceTables = [
  "organizations",
  "profiles",
  "organization_memberships",
  "project_memberships",
  "projects",
  "aois",
  "analysis_runs",
  "reports",
  "comparison_sets",
  "uploaded_datasets",
  "data_room_assets",
  "validation_checklist_items",
  "pilot_workflows",
  "pilot_client_inputs",
  "pilot_deliverables",
  "source_registry_snapshots",
  "external_data_snapshots",
  "ai_decision_scores",
  "audit_events"
] as const;

export type RequiredPersistenceTable = (typeof requiredPersistenceTables)[number];

export type SchemaReadinessStatus =
  | "not_configured"
  | "configured_unavailable"
  | "configured_incomplete"
  | "connected";

export type SchemaReadinessSummary = {
  configured: boolean;
  status: SchemaReadinessStatus;
  repositoryMode: RepositoryMode;
  mode: RepositoryMode;
  postgisReady: boolean;
  tablesReady: boolean;
  missingTables: RequiredPersistenceTable[];
  unverifiedTables: RequiredPersistenceTable[];
  requiredTables: RequiredPersistenceTable[];
  migrationName: string;
  schemaVersion: string;
  caveat: string;
  sources_count: number | null;
  message: string;
};

type TableProbeResult = {
  table: RequiredPersistenceTable;
  ready: boolean;
};

async function probeTable(table: RequiredPersistenceTable): Promise<TableProbeResult> {
  // Base tables are intentionally not part of the application Data API.
  // Existence/PostGIS must be certified by the isolated DB-01 operator replay.
  return { table, ready: false };
}

export async function checkSupabaseConnection() {
  const health = await probeSupabaseApiHealth();
  return {
    configured: health.configured,
    reachable: health.reachable && health.healthy,
    surface: "api.healthcheck" as const
  };
}

export async function checkPostgisReady() {
  return false;
}

export async function checkRequiredTables() {
  return Promise.all(requiredPersistenceTables.map((table) => probeTable(table)));
}

export function getMissingTables(results: TableProbeResult[]) {
  return results.filter((result) => !result.ready).map((result) => result.table);
}

export async function getSchemaReadinessSummary(): Promise<SchemaReadinessSummary> {
  const connection = await checkSupabaseConnection();
  const [postgisReady, tableResults] = await Promise.all([
    checkPostgisReady(),
    checkRequiredTables()
  ]);
  const unverifiedTables = getMissingTables(tableResults);
  const missingTables: RequiredPersistenceTable[] = [];
  const tablesReady = false;
  const repositoryMode: RepositoryMode = "local_fallback";
  const status: SchemaReadinessStatus = !connection.configured
    ? "not_configured"
    : !connection.reachable
      ? "configured_unavailable"
      : "configured_incomplete";

  return {
    configured: connection.configured,
    status,
    repositoryMode,
    mode: repositoryMode,
    postgisReady,
    tablesReady,
    missingTables,
    unverifiedTables,
    requiredTables: [...requiredPersistenceTables],
    migrationName: geoaiPersistenceMigrationName,
    schemaVersion: geoaiPersistenceSchemaVersion,
    caveat: repositoryModeToCaveat(repositoryMode),
    sources_count: null as number | null,
    message: status === "configured_incomplete"
        ? "The api.healthcheck allowlist is reachable; base-table and PostGIS readiness still require isolated DB-01 replay evidence. Local fallback remains active."
        : status === "configured_unavailable"
          ? "Supabase env is configured, but api.healthcheck is unavailable or unhealthy. Local fallback remains active."
          : "A valid Supabase URL/publishable key is not configured. GeoAI is running in local/demo mode."
  };
}
