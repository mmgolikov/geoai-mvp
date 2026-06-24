import { getSupabaseServerClient } from "@/src/lib/supabase/server";
import { isSupabaseConfigured } from "@/src/lib/supabase/config";
import { repositoryModeToCaveat, type RepositoryMode } from "@/src/lib/repositories/repository-mode";

export const geoaiPersistenceMigrationName = "20260624_geoai_pilot_persistence_foundation";
export const geoaiPersistenceSchemaVersion = "v2.3";

export const requiredPersistenceTables = [
  "organizations",
  "profiles",
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

type TableProbeResult = {
  table: RequiredPersistenceTable;
  ready: boolean;
};

async function probeTable(table: RequiredPersistenceTable): Promise<TableProbeResult> {
  const client = await getSupabaseServerClient();
  if (!client) return { table, ready: false };

  try {
    const query = client.from(table).select("id", { head: true, count: "exact" }) as Promise<{
      error?: unknown;
    }>;
    const response = await query;
    return { table, ready: !response.error };
  } catch {
    return { table, ready: false };
  }
}

export async function checkSupabaseConnection() {
  if (!isSupabaseConfigured()) {
    return { configured: false, reachable: false };
  }

  const client = await getSupabaseServerClient();
  if (!client) {
    return { configured: true, reachable: false };
  }

  try {
    const query = client.from("projects").select("id", { head: true, count: "exact" }) as Promise<{
      error?: unknown;
    }>;
    const response = await query;
    return { configured: true, reachable: !response.error };
  } catch {
    return { configured: true, reachable: false };
  }
}

export async function checkPostgisReady() {
  if (!isSupabaseConfigured()) return false;
  const client = await getSupabaseServerClient();
  if (!client) return false;

  try {
    const query = client.from("spatial_ref_sys").select("srid", { head: true, count: "exact" }) as Promise<{
      error?: unknown;
    }>;
    const response = await query;
    return !response.error;
  } catch {
    return false;
  }
}

export async function checkRequiredTables() {
  if (!isSupabaseConfigured()) {
    return requiredPersistenceTables.map((table) => ({ table, ready: false }));
  }

  return Promise.all(requiredPersistenceTables.map((table) => probeTable(table)));
}

export function getMissingTables(results: TableProbeResult[]) {
  return results.filter((result) => !result.ready).map((result) => result.table);
}

export async function getSchemaReadinessSummary() {
  const connection = await checkSupabaseConnection();
  const [postgisReady, tableResults] = await Promise.all([
    checkPostgisReady(),
    checkRequiredTables()
  ]);
  const missingTables = getMissingTables(tableResults);
  const tablesReady = missingTables.length === 0;
  const repositoryMode: RepositoryMode = connection.configured && connection.reachable && postgisReady && tablesReady
    ? "supabase"
    : "local_fallback";
  const status: SchemaReadinessStatus = !connection.configured
    ? "not_configured"
    : !connection.reachable
      ? "configured_unavailable"
      : tablesReady && postgisReady
        ? "connected"
        : "configured_incomplete";

  return {
    configured: connection.configured,
    status,
    repositoryMode,
    mode: repositoryMode,
    postgisReady,
    tablesReady,
    missingTables,
    requiredTables: [...requiredPersistenceTables],
    migrationName: geoaiPersistenceMigrationName,
    schemaVersion: geoaiPersistenceSchemaVersion,
    caveat: repositoryModeToCaveat(repositoryMode),
    sources_count: null as number | null,
    message: status === "connected"
      ? "Supabase/PostGIS durable persistence foundation is reachable and required tables are present."
      : status === "configured_incomplete"
        ? "Supabase is reachable, but the v2.3 persistence schema is incomplete. Local fallback remains active."
        : status === "configured_unavailable"
          ? "Supabase env is configured, but the database client is unavailable or unreachable. Local fallback remains active."
          : "Supabase is not configured. GeoAI is running in local/demo mode."
  };
}
