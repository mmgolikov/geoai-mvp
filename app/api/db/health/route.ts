import { NextResponse } from "next/server";
import { countSources } from "@/src/lib/db/repositories/sources";
import { getSchemaReadinessSummary } from "@/src/lib/db/schema-readiness";
import { getStorageReadiness } from "@/src/lib/storage/storage-readiness";
import { getSupabaseActivationReadiness } from "@/src/lib/supabase/activation-check";
import { getSupabaseRuntimeReadiness } from "@/src/lib/supabase/runtime-readiness";

export const runtime = "nodejs";

export async function GET() {
  const [readiness, storage, runtimeReadiness] = await Promise.all([
    getSchemaReadinessSummary(),
    getStorageReadiness(),
    getSupabaseRuntimeReadiness()
  ]);
  const activation = await getSupabaseActivationReadiness({ schema: readiness, storage });
  const sourcesCount = readiness.configured ? await countSources() : null;
  const migrationApplied = readiness.status === "connected" && readiness.postgisReady && readiness.tablesReady;
  const blockers: string[] = [];
  const nextActions: string[] = [];

  if (!readiness.configured) {
    blockers.push("Supabase is not configured in this runtime.");
    nextActions.push("Configure Supabase env vars and apply the v2.3 migration from a trusted environment.");
  } else if (readiness.status === "configured_unavailable") {
    blockers.push("Supabase env is present, but the database is unavailable or unreachable.");
    nextActions.push("Verify Supabase URL/key configuration and network access.");
  } else if (!migrationApplied) {
    blockers.push("Supabase/PostGIS migration is not fully applied.");
    nextActions.push("Run npm run supabase:migrate:check and apply supabase/migrations/20260624_geoai_pilot_persistence_foundation.sql.");
  }

  if (!storage.storageReady) {
    blockers.push(...storage.blockers);
    nextActions.push(...storage.nextActions);
  }

  return NextResponse.json({
    ...readiness,
    runtimeMode: runtimeReadiness.runtimeMode,
    supabaseConfigured: runtimeReadiness.supabaseConfigured,
    healthcheckReachable: runtimeReadiness.healthcheckReachable,
    schemaReady: runtimeReadiness.schemaReady,
    sourceRegistryReady: runtimeReadiness.sourceRegistryReady,
    externalSnapshotsReady: runtimeReadiness.externalSnapshotsReady,
    localApiFallbackActive: runtimeReadiness.localApiFallbackActive,
    canReadHealthcheck: runtimeReadiness.canReadHealthcheck,
    canReadSourceRegistry: runtimeReadiness.canReadSourceRegistry,
    canReadExternalSnapshots: runtimeReadiness.canReadExternalSnapshots,
    sources_count: sourcesCount,
    storageReady: storage.storageReady,
    storage,
    migrationApplied,
    seedReady: migrationApplied,
    canWrite: readiness.repositoryMode === "supabase",
    canRead: readiness.repositoryMode === "supabase",
    activation,
    runtimeReadiness,
    blockers: Array.from(new Set([...blockers, ...runtimeReadiness.blockers])),
    nextActions: Array.from(new Set([...nextActions, ...runtimeReadiness.nextActions])),
    caveat: runtimeReadiness.caveat,
    caveats: runtimeReadiness.caveats,
    generatedAt: runtimeReadiness.generatedAt
  });
}
