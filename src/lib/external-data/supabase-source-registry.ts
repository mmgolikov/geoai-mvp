import { getSupabaseServerClient } from "@/src/lib/supabase/server";
import { externalDataCaveat } from "@/src/lib/external-data/source-registry";
import { readExternalDataManifest } from "@/src/lib/external-data/data-manifest";
import { normalizeSourceStatus } from "@/src/lib/external-data/source-status";
import { normalizeSourceDataMode } from "@/src/lib/external-data/source-modes";

type RegistryRow = {
  source_id?: string | null;
  source_name?: string | null;
  category?: string | null;
  connection_status?: string | null;
  source_mode?: string | null;
  record_count?: number | null;
  caveat?: string | null;
  updated_at?: string | null;
};

type SnapshotRow = {
  source_id?: string | null;
  normalized_path?: string | null;
  record_count?: number | null;
  imported_at?: string | null;
};

function normalizeRegistryStatus(value: unknown) {
  if (String(value ?? "").trim().toLowerCase() === "connected_context_ready") return "connected" as const;
  return normalizeSourceStatus(value);
}

async function readRows() {
  const client = await getSupabaseServerClient();
  if (!client) return { rows: [] as RegistryRow[], snapshots: [] as SnapshotRow[], blocker: "Supabase server client is not configured." };

  try {
    const sourceQuery = client.from("source_registry_snapshots").select("*") as Promise<{ data?: RegistryRow[] | null; error?: unknown }>;
    const snapshotQuery = client.from("external_data_snapshots").select("*") as Promise<{ data?: SnapshotRow[] | null; error?: unknown }>;
    const [sourceResponse, snapshotResponse] = await Promise.all([sourceQuery, snapshotQuery]);
    if (sourceResponse.error) return { rows: [] as RegistryRow[], snapshots: [] as SnapshotRow[], blocker: "Source registry query failed." };
    return {
      rows: Array.isArray(sourceResponse.data) ? sourceResponse.data : [],
      snapshots: Array.isArray(snapshotResponse.data) ? snapshotResponse.data : [],
      blocker: null as string | null
    };
  } catch {
    return { rows: [] as RegistryRow[], snapshots: [] as SnapshotRow[], blocker: "Source registry is unreachable." };
  }
}

export async function getSourceRegistryReadiness() {
  const fallback = readExternalDataManifest();
  const { rows, snapshots, blocker } = await readRows();

  if (rows.length === 0) {
    return {
      mode: "local_fallback",
      source: "local_manifest_fallback",
      sourceRegistryCount: 0,
      externalSnapshotCount: snapshots.length,
      manifest: fallback,
      readiness: fallback.sources.map((source) => ({
        sourceId: source.id,
        sourceName: source.id,
        status: source.status,
        sourceMode: source.sourceMode,
        lastUpdated: source.lastUpdated ?? null,
        recordCount: source.recordCount ?? source.rowCount ?? source.featureCount,
        coverageArea: source.coverageArea ?? "Dubai / UAE screening context",
        confidence: source.confidence ?? "requires-validation",
        caveat: source.caveat ?? source.disclaimer ?? externalDataCaveat
      })),
      blockers: [blocker].filter(Boolean),
      caveat: externalDataCaveat,
      generatedAt: new Date().toISOString()
    };
  }

  const snapshotsBySource = new Map(snapshots.filter((item) => item.source_id).map((item) => [item.source_id as string, item]));
  const manifestSources = rows.filter((row) => row.source_id).map((row) => {
    const snapshot = snapshotsBySource.get(row.source_id as string);
    const status = normalizeRegistryStatus(row.connection_status ?? "manual_import_ready");
    const sourceMode = normalizeSourceDataMode(snapshot?.normalized_path ? "snapshot_available" : row.source_mode ?? status);
    return {
      id: row.source_id as string,
      status,
      lastUpdated: snapshot?.imported_at ?? row.updated_at ?? null,
      availableFiles: snapshot?.normalized_path ? [snapshot.normalized_path] : [],
      recordCount: snapshot?.record_count ?? row.record_count ?? undefined,
      coverageArea: row.category ?? "Dubai / UAE screening context",
      confidence: status === "snapshot_available" || status === "connected" ? "medium" : "requires-validation",
      caveat: row.caveat ?? externalDataCaveat,
      sourceMode,
      usedInAnalysis: status === "connected" || status === "snapshot_available",
      disclaimer: row.caveat ?? externalDataCaveat
    };
  });

  return {
    mode: "supabase",
    source: "supabase_source_registry",
    sourceRegistryCount: rows.length,
    externalSnapshotCount: snapshots.length,
    manifest: {
      generatedAt: new Date().toISOString(),
      version: "1.7",
      summary: "GeoAI Data Foundation v1.1 source registry metadata.",
      sources: manifestSources
    },
    readiness: manifestSources.map((source) => ({
      sourceId: source.id,
      sourceName: rows.find((row) => row.source_id === source.id)?.source_name ?? source.id,
      status: source.status,
      sourceMode: source.sourceMode,
      lastUpdated: source.lastUpdated,
      recordCount: source.recordCount,
      coverageArea: source.coverageArea,
      confidence: source.confidence,
      caveat: source.caveat
    })),
    blockers: [],
    caveat: externalDataCaveat,
    generatedAt: new Date().toISOString()
  };
}
