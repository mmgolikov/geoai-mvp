import { getAuthModeStatus } from "@/src/lib/auth/auth-mode";
import { getSchemaReadinessSummary } from "@/src/lib/db/schema-readiness";
import { getEnforcementConfig } from "@/src/lib/platform/enforcement-config";
import { getStorageReadiness } from "@/src/lib/storage/storage-readiness";
import { getSupabaseServerClient } from "@/src/lib/supabase/server";
import { requestScopedSupabaseRepositoriesEnabled } from "@/src/lib/supabase/config";

export const supabasePilotProject = {
  ref: "pphdqkurxneyagvnnjdt",
  name: "geoai-dev",
  region: "eu-west-1",
  status: "ACTIVE_HEALTHY",
  postgresVersion: "17.6",
  currentPublicTable: "geoai_healthcheck"
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
  const client = await getSupabaseServerClient();

  if (!client) {
    return {
      table: supabasePilotProject.currentPublicTable,
      configured: false,
      reachable: false,
      status: "not_configured" as const
    };
  }

  try {
    const query = client
      .from(supabasePilotProject.currentPublicTable)
      .select("*", { head: true, count: "exact" }) as Promise<{ error?: unknown }>;
    const response = await query;
    const reachable = !response.error;

    return {
      table: supabasePilotProject.currentPublicTable,
      configured: true,
      reachable,
      status: reachable ? "reachable" as const : "unreachable" as const
    };
  } catch {
    return {
      table: supabasePilotProject.currentPublicTable,
      configured: true,
      reachable: false,
      status: "unreachable" as const
    };
  }
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
  const anonKeyConfigured = envPresent("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const applicationRepositoryEnabled = requestScopedSupabaseRepositoriesEnabled;
  const canApplyGuardedMigration = false;
  const schemaReady = schema.status === "connected" && schema.postgisReady && schema.tablesReady;
  const blockers: string[] = [];
  const nextActions: string[] = [];

  if (!urlConfigured || !anonKeyConfigured) {
    blockers.push("Supabase public URL/anon key env is missing.");
    nextActions.push("Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in local/Vercel runtime.");
  }

  if (!applicationRepositoryEnabled) {
    blockers.push("Request-scoped Supabase application repositories are disabled until AUTH-01 and RLS personas are verified.");
    nextActions.push("Keep service-role and database credentials in a separate operator/worker runtime; never add them to the public Vercel application.");
  }

  if (!healthcheck.reachable) {
    blockers.push(`${supabasePilotProject.currentPublicTable} is not reachable from this runtime.`);
    nextActions.push("Verify the Supabase project URL/key and the public healthcheck table from a trusted runtime.");
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
      anonKeyConfigured,
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
    activationReady: urlConfigured && anonKeyConfigured && applicationRepositoryEnabled && healthcheck.reachable && schemaReady && storage.storageReady,
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
