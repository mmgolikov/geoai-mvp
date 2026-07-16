import { getAuthModeStatus } from "@/src/lib/auth/auth-mode";
import { getSchemaReadinessSummary } from "@/src/lib/db/schema-readiness";
import { getEnforcementConfig } from "@/src/lib/platform/enforcement-config";
import { getStorageReadiness } from "@/src/lib/storage/storage-readiness";
import { probeSupabaseApiHealth } from "@/src/lib/supabase/api-readiness";
import { getSupabasePublishableKey, requestScopedSupabaseRepositoriesEnabled } from "@/src/lib/supabase/config";

export const supabasePilotProject = {
  ref: "pphdqkurxneyagvnnjdt",
  name: "geoai-dev",
  region: "eu-west-1",
  metadataSource: "repository_expected_target_not_live_status",
  currentReadinessSurface: "api.healthcheck()"
} as const;

type SchemaReadinessSummary = Awaited<ReturnType<typeof getSchemaReadinessSummary>>;
type StorageReadinessSummary = Awaited<ReturnType<typeof getStorageReadiness>>;

type ActivationInput = {
  schema?: SchemaReadinessSummary;
  storage?: StorageReadinessSummary;
};

function envPresent(name: string) {
  return Boolean(process.env[name]?.trim());
}

async function checkHealthcheckTable() {
  const health = await probeSupabaseApiHealth();
  return {
    surface: supabasePilotProject.currentReadinessSurface,
    configured: health.configured,
    reachable: health.reachable && health.healthy,
    status: health.status
  };
}

export async function getSupabaseActivationReadiness(input: ActivationInput = {}) {
  const [schema, storage, healthcheck] = await Promise.all([
    input.schema ? Promise.resolve(input.schema) : getSchemaReadinessSummary(),
    input.storage ? Promise.resolve(input.storage) : getStorageReadiness(),
    checkHealthcheckTable()
  ]);
  const authStatus = getAuthModeStatus();
  const enforcement = getEnforcementConfig();
  const urlConfigured = envPresent("NEXT_PUBLIC_SUPABASE_URL");
  const publishableKeyConfigured = Boolean(getSupabasePublishableKey());
  const applicationRepositoryEnabled = requestScopedSupabaseRepositoriesEnabled;
  const canApplyGuardedMigration = false;
  const schemaReady = schema.status === "connected" && schema.postgisReady && schema.tablesReady;
  const blockers: string[] = [];
  const nextActions: string[] = [];

  if (!urlConfigured || !publishableKeyConfigured) {
    blockers.push("Supabase public URL/publishable key env is missing.");
    nextActions.push("Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY only when AUTH-01 is approved for the target runtime.");
  }

  if (!applicationRepositoryEnabled) {
    blockers.push("Request-scoped Supabase application repositories are disabled until AUTH-01 and RLS personas are verified.");
    nextActions.push("Keep service-role and database credentials in a separate operator/worker runtime; never add them to the public Vercel application.");
  }

  if (!healthcheck.reachable) {
    if (healthcheck.status === "target_mismatch") {
      blockers.push("Configured Supabase URL does not match the approved development project ref.");
      nextActions.push(`Set NEXT_PUBLIC_SUPABASE_URL only to the approved ${supabasePilotProject.ref}.supabase.co target before any probe.`);
    } else {
      blockers.push(`${supabasePilotProject.currentReadinessSurface} is not reachable and healthy from this runtime.`);
      nextActions.push("Verify the publishable-key class and the api-only Data API exposure; do not expose public for health probes.");
    }
  }

  if (!schemaReady) {
    blockers.push(schema.missingTables.length > 0
      ? `Persistence schema incomplete: ${schema.missingTables.length} required table(s) missing or blocked.`
      : "PostGIS/readiness checks are not fully verified.");
    nextActions.push("Run npm run supabase:activation-status and npm run supabase:migrate:check.");
  }

  if (!storage.storageReady) {
    blockers.push(...storage.blockers);
    nextActions.push(...storage.nextActions);
  }

  if (!schemaReady) {
    nextActions.push("Do not apply the current migration chain until DB-01 clean/upgrade replay and an owner-approved exact operator plan pass.");
  }

  return {
    ok: true,
    project: supabasePilotProject,
    environment: {
      urlConfigured,
      publishableKeyConfigured,
      applicationRepositoryEnabled,
      operatorCredentialsInspected: false,
      canApplyGuardedMigration,
      authMode: authStatus.effectiveMode,
      accessEnforcementMode: enforcement.accessEnforcementMode,
      requireSupabaseReady: enforcement.requireSupabaseReady,
      requireStorageReady: enforcement.requireStorageReady
    },
    schema: {
      configured: schema.configured,
      status: schema.status,
      repositoryMode: schema.repositoryMode,
      postgisReady: schema.postgisReady,
      tablesReady: schema.tablesReady,
      missingTables: schema.missingTables,
      unverifiedTables: schema.unverifiedTables,
      requiredTables: schema.requiredTables,
      migrationName: schema.migrationName,
      schemaVersion: schema.schemaVersion
    },
    healthcheck,
    storage: {
      provider: storage.provider,
      configured: storage.configured,
      storageReady: storage.storageReady,
      bucketReady: storage.bucketReady,
      missingBuckets: storage.missingBuckets,
      requiredBuckets: storage.requiredBuckets,
      signedUploadReady: storage.signedUploadReady,
      signedDownloadReady: storage.signedDownloadReady,
      privateBucketPolicyReady: storage.privateBucketPolicyReady,
      signedUrlVerified: storage.signedUrlVerified
    },
    rls: {
      detectableFromRuntime: false,
      caveat: "RLS policy correctness is not inferred from public table probes; verify with Supabase Auth, memberships and policy tests before confidential pilot access."
    },
    activationReady: urlConfigured && publishableKeyConfigured && applicationRepositoryEnabled && healthcheck.reachable && schemaReady && storage.storageReady,
    blockers: Array.from(new Set(blockers)),
    nextActions: Array.from(new Set(nextActions)),
    caveats: Array.from(new Set([
      schema.caveat,
      storage.caveat,
      authStatus.caveat,
      "This readiness output reports env presence and probe results only; it never returns Supabase keys or database URLs."
    ])),
    generatedAt: new Date().toISOString()
  };
}
