import { getAuthModeStatus } from "@/src/lib/auth/auth-mode";
import { getSchemaReadinessSummary } from "@/src/lib/db/schema-readiness";
import { getEnforcementConfig } from "@/src/lib/platform/enforcement-config";
import { repositoryModeToCaveat } from "@/src/lib/repositories/repository-mode";
import { getStorageReadiness } from "@/src/lib/storage/storage-readiness";
import { requestScopedSupabaseRepositoriesEnabled } from "@/src/lib/supabase/config";

export type PilotActivationStatus =
  | "ready_to_apply"
  | "applied_and_verified"
  | "blocked_missing_env"
  | "blocked_missing_cli"
  | "blocked_schema_incomplete"
  | "local_fallback_only";

function boolEnv(name: string) {
  return process.env[name]?.trim().toLowerCase() === "true";
}

export async function getPilotActivationGate() {
  const authStatus = getAuthModeStatus();
  const enforcement = getEnforcementConfig();
  const [schema, storage] = await Promise.all([
    getSchemaReadinessSummary(),
    getStorageReadiness()
  ]);
  const hasSupabasePublicEnv = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
  );
  const hasSupabaseServerEnv = Boolean(
    hasSupabasePublicEnv && requestScopedSupabaseRepositoriesEnabled
  );
  const canApplyMigration = false;
  const hasSupabaseCli = boolEnv("GEOAI_SUPABASE_CLI_AVAILABLE");
  const schemaReady = schema.status === "connected" && schema.postgisReady && schema.tablesReady;
  const blockers: string[] = [];
  const nextActions: string[] = [];

  if (!hasSupabasePublicEnv || !hasSupabaseServerEnv) {
    blockers.push("Request-scoped Supabase application repositories are not enabled.");
    nextActions.push("Complete AUTH-01 caller-JWT repositories and RLS personas; keep privileged database credentials in a separate operator/worker runtime.");
  }

  if (!schemaReady) {
    if (schema.missingTables.length > 0) {
      blockers.push(`Persistence schema incomplete: ${schema.missingTables.length} required table(s) missing.`);
    } else if (!schema.postgisReady) {
      blockers.push("PostGIS readiness is not verified.");
    }
    nextActions.push("Run npm run supabase:migrate:check, then apply the v2.3 migration from a trusted environment.");
  }

  if (!hasSupabaseCli && !canApplyMigration && !schemaReady) {
    blockers.push("Supabase CLI availability is not confirmed and migration apply env is disabled.");
    nextActions.push("Use the owner-approved operator runbook outside the public application runtime after DB-01 replay evidence passes.");
  }

  if (!storage.storageReady) {
    blockers.push(...storage.blockers);
    nextActions.push(...storage.nextActions);
  }

  const activationStatus: PilotActivationStatus =
    schemaReady && storage.storageReady
      ? "applied_and_verified"
      : !hasSupabasePublicEnv || !hasSupabaseServerEnv
        ? "blocked_missing_env"
        : !hasSupabaseCli && !canApplyMigration && !schemaReady
          ? "blocked_missing_cli"
          : schema.configured && !schemaReady
            ? "blocked_schema_incomplete"
            : schema.configured
              ? "ready_to_apply"
              : "local_fallback_only";

  return {
    ok: true,
    hasSupabasePublicEnv,
    hasSupabaseServerEnv,
    hasSupabaseCli,
    canApplyMigration,
    canVerifySchema: hasSupabaseServerEnv,
    canUseSupabaseStorage: storage.storageReady,
    accessEnforcementMode: enforcement.accessEnforcementMode,
    requireSupabaseReady: enforcement.requireSupabaseReady,
    requireStorageReady: enforcement.requireStorageReady,
    allowDemoPublic: enforcement.allowDemoPublic,
    authMode: authStatus.effectiveMode,
    repositoryMode: schema.repositoryMode,
    activationStatus,
    supabaseConfigured: schema.configured,
    schemaReady,
    postgisReady: schema.postgisReady,
    tablesReady: schema.tablesReady,
    storageReady: storage.storageReady,
    migrationApplied: schemaReady,
    blockers: Array.from(new Set(blockers)),
    nextActions: Array.from(new Set(nextActions)),
    caveats: Array.from(new Set([
      schema.caveat,
      storage.caveat,
      authStatus.caveat,
      repositoryModeToCaveat(schema.repositoryMode)
    ]))
  };
}
