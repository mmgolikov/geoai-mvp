import { NextResponse } from "next/server";
import { countSources } from "@/src/lib/db/repositories/sources";
import { getSchemaReadinessSummary } from "@/src/lib/db/schema-readiness";
import { getStorageReadiness } from "@/src/lib/storage/storage-readiness";

export const runtime = "nodejs";

export async function GET() {
  const [readiness, storage] = await Promise.all([
    getSchemaReadinessSummary(),
    getStorageReadiness()
  ]);
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
    sources_count: sourcesCount,
    storageReady: storage.storageReady,
    storage,
    migrationApplied,
    seedReady: migrationApplied,
    canWrite: readiness.repositoryMode === "supabase",
    canRead: readiness.repositoryMode === "supabase",
    blockers: Array.from(new Set(blockers)),
    nextActions: Array.from(new Set(nextActions))
  });
}
