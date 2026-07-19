import { getAuthModeStatus } from "@/src/lib/auth/auth-mode";
import { requestAuthKernelStatus } from "@/src/lib/auth/request-auth-kernel";
import { requiredPersistenceTables, getSchemaReadinessSummary } from "@/src/lib/db/schema-readiness";
import { getEnforcementConfig } from "@/src/lib/platform/enforcement-config";
import { type RepositoryMode } from "@/src/lib/repositories/repository-mode";
import { getStorageReadiness } from "@/src/lib/storage/storage-readiness";
import { probeSupabaseApiHealth } from "@/src/lib/supabase/api-readiness";
import { getSupabasePublishableKey, requestScopedSupabaseRepositoriesEnabled } from "@/src/lib/supabase/config";

export const supabaseRuntimeReadinessVersion = "1.0";

export const runtimeDataHonestyCaveat =
  "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";

export const localFallbackRuntimeCaveat = "Local/API fallback is not durable production storage.";
export const storageRuntimeCaveat =
  "Storage readiness is not secure enterprise storage until buckets, policies, signed URL flows and access enforcement are configured and verified.";
export const publicDemoRuntimeCaveat =
  "Public demo access is enabled; official validation and production access control are not configured.";

export type SupabaseRuntimeMode =
  | "local_api_fallback"
  | "supabase_configured_unreachable"
  | "supabase_read_only_partial"
  | "supabase_read_only_ready";

export type SupabaseRuntimeStatus =
  | "fallback_missing_env"
  | "configured_unreachable"
  | "read_only_partial"
  | "read_only_ready";

type ProbeName = "healthcheck" | "sourceRegistry" | "externalSnapshots";

type ReadProbe = {
  name: ProbeName;
  table: string;
  ready: boolean;
  count: number | null;
  status: "not_configured" | "readable" | "blocked" | "operator_evidence_required";
};

function envPresent(name: string) {
  return Boolean(process.env[name]?.trim());
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function deriveRuntimeMode(input: {
  hasSupabaseReadEnv: boolean;
  canReadHealthcheck: boolean;
  schemaReady: boolean;
  sourceRegistryReady: boolean;
  externalSnapshotsReady: boolean;
}): SupabaseRuntimeMode {
  if (!input.hasSupabaseReadEnv) return "local_api_fallback";
  if (!input.canReadHealthcheck) return "supabase_configured_unreachable";
  if (input.schemaReady && input.sourceRegistryReady && input.externalSnapshotsReady) {
    return "supabase_read_only_ready";
  }
  return "supabase_read_only_partial";
}

function runtimeStatusFromMode(mode: SupabaseRuntimeMode): SupabaseRuntimeStatus {
  if (mode === "supabase_read_only_ready") return "read_only_ready";
  if (mode === "supabase_read_only_partial") return "read_only_partial";
  if (mode === "supabase_configured_unreachable") return "configured_unreachable";
  return "fallback_missing_env";
}

export async function getSupabaseRuntimeReadiness() {
  const [
    schema,
    storage,
    apiHealth
  ] = await Promise.all([
    getSchemaReadinessSummary(),
    getStorageReadiness(),
    probeSupabaseApiHealth()
  ]);
  const healthcheck: ReadProbe = {
    name: "healthcheck",
    table: "api.healthcheck()",
    ready: apiHealth.reachable && apiHealth.healthy,
    count: null,
    status: !apiHealth.configured ? "not_configured" : apiHealth.reachable ? "readable" : "blocked"
  };
  const sourceRegistry: ReadProbe = {
    name: "sourceRegistry",
    table: "public.source_registry_snapshots",
    ready: false,
    count: null,
    status: "operator_evidence_required"
  };
  const externalSnapshots: ReadProbe = {
    name: "externalSnapshots",
    table: "public.external_data_snapshots",
    ready: false,
    count: null,
    status: "operator_evidence_required"
  };
  const auth = getAuthModeStatus();
  const enforcement = getEnforcementConfig();
  const hasSupabaseUrl = envPresent("NEXT_PUBLIC_SUPABASE_URL");
  const hasSupabasePublishableKey = Boolean(getSupabasePublishableKey());
  const hasSupabasePublicEnv = hasSupabaseUrl && hasSupabasePublishableKey;
  const hasSupabaseServerEnv = hasSupabasePublicEnv && requestScopedSupabaseRepositoriesEnabled;
  const hasSupabaseReadEnv = hasSupabaseServerEnv;
  const schemaReady = schema.status === "connected" && schema.postgisReady && schema.tablesReady;
  const schemaDetected = schema.configured && schema.missingTables.length < requiredPersistenceTables.length;
  const sourceRegistryReady = sourceRegistry.ready;
  const externalSnapshotsReady = externalSnapshots.ready;
  const canReadHealthcheck = healthcheck.ready;
  const runtimeMode = deriveRuntimeMode({
    hasSupabaseReadEnv,
    canReadHealthcheck,
    schemaReady,
    sourceRegistryReady,
    externalSnapshotsReady
  });
  const status = runtimeStatusFromMode(runtimeMode);
  const fallbackActive = schema.repositoryMode !== "supabase" || runtimeMode !== "supabase_read_only_ready";
  const hardAccessEnabled = enforcement.accessEnforcementMode === "hard";
  const authSessionVerified = requestAuthKernelStatus.requestUserVerified;
  const projectMembershipsVerified = requestAuthKernelStatus.projectMembershipVerified;
  const rlsPoliciesVerified = requestAuthKernelStatus.rlsPersonaMatrixVerified;
  const hardAccessVerified =
    hardAccessEnabled &&
    auth.effectiveMode === "supabase_auth" &&
    authSessionVerified &&
    projectMembershipsVerified &&
    rlsPoliciesVerified;
  const blockers: string[] = [];
  const nextActions: string[] = [];

  if (!hasSupabasePublicEnv) {
    blockers.push("Supabase public URL/publishable key env is missing.");
    nextActions.push("Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY only after AUTH-01 target approval.");
  }

  if (!requestScopedSupabaseRepositoriesEnabled) {
    blockers.push("Request-scoped Supabase repositories are disabled until AUTH-01 and the RLS persona matrix pass.");
    nextActions.push("Keep privileged Supabase/database credentials in a separate operator/worker runtime, never in the public Vercel application.");
  }

  if (hasSupabaseReadEnv && !canReadHealthcheck) {
    blockers.push("Supabase env is present, but api.healthcheck() is unavailable or unhealthy.");
    nextActions.push("Verify the publishable-key class, expose only the api schema, and grant anon EXECUTE only on api.healthcheck().");
  }

  if (!schemaReady) {
    blockers.push(schema.missingTables.length > 0
      ? `Supabase schema reports ${schema.missingTables.length} missing required table(s).`
      : "Base-table and PostGIS readiness is not certified by isolated DB-01 evidence.");
    nextActions.push("Run the clean/upgrade replay and persona suite in the approved operator plane; never expose public for readiness probes.");
  }

  if (!sourceRegistryReady) {
    blockers.push("Source registry custody has no approved api projection or operator evidence.");
    nextActions.push("Keep source readiness on local fallback until SOURCE-01 adds a reviewed api RPC and freshness evidence.");
  }

  if (!externalSnapshotsReady) {
    blockers.push("External snapshot custody has no approved api projection or operator evidence.");
    nextActions.push("Keep external snapshots on local fallback until SOURCE-01 adds a reviewed api RPC and freshness evidence.");
  }

  if (!storage.storageReady) {
    blockers.push(...storage.blockers);
    nextActions.push(...storage.nextActions);
  }

  if (!hardAccessVerified) {
    blockers.push("Hard access is not verified; public demo/fallback access remains the safe mode.");
    nextActions.push("Keep GEOAI_ACCESS_ENFORCEMENT_MODE=soft until Supabase Auth, memberships, RLS and storage checks are verified.");
  }

  return {
    ok: true,
    version: supabaseRuntimeReadinessVersion,
    status,
    runtimeMode,
    repositoryMode: schema.repositoryMode as RepositoryMode,
    supabaseConfigured: hasSupabaseReadEnv,
    hasSupabaseUrl,
    hasSupabasePublicEnv,
    hasSupabasePublishableKey,
    hasSupabaseServerEnv,
    operatorCredentialsInspected: false,
    serviceRoleMode: "forbidden_in_application_runtime",
    serviceRoleUsedForWrites: false,
    publicPublishableReadOnlyReachable: hasSupabasePublicEnv && canReadHealthcheck,
    canReadHealthcheck,
    canReadSourceRegistry: sourceRegistryReady,
    canReadExternalSnapshots: externalSnapshotsReady,
    healthcheckReachable: canReadHealthcheck,
    schemaDetected,
    schemaReady,
    postgisReady: schema.postgisReady,
    sourceRegistryReady,
    externalSnapshotsReady,
    storageReady: storage.storageReady,
    storageReadinessMissing: !storage.storageReady,
    localApiFallbackActive: fallbackActive,
    authMode: auth.effectiveMode,
    requestedAuthMode: auth.requestedMode,
    authSessionVerified,
    projectMembershipsVerified,
    rlsPoliciesVerified,
    hardAccessEnabled,
    hardAccessVerified,
    hardAccessDisabled: !hardAccessEnabled,
    accessEnforcementMode: enforcement.accessEnforcementMode,
    requireSupabaseReady: enforcement.requireSupabaseReady,
    requireStorageReady: enforcement.requireStorageReady,
    allowDemoPublic: enforcement.allowDemoPublic,
    readOnlyProbes: [healthcheck, sourceRegistry, externalSnapshots],
    counts: {
      sourceRegistrySnapshots: sourceRegistry.count,
      externalDataSnapshots: externalSnapshots.count
    },
    schema: {
      status: schema.status,
      requiredTables: schema.requiredTables,
      missingTables: schema.missingTables,
      unverifiedTables: schema.unverifiedTables
    },
    storage: {
      provider: storage.provider,
      requiredBuckets: storage.requiredBuckets,
      missingBuckets: storage.missingBuckets,
      signedUploadReady: storage.signedUploadReady,
      signedDownloadReady: storage.signedDownloadReady,
      privateBucketPolicyReady: storage.privateBucketPolicyReady
    },
    readinessClaim: "not_production_ready_or_pilot_ready",
    notReadyReason: "Runtime readiness only verifies safe read probes and fallback behavior; production/pilot access controls, storage policy verification and official data validation remain incomplete.",
    blockers: unique(blockers),
    nextActions: unique(nextActions),
    caveat: runtimeDataHonestyCaveat,
    caveats: unique([
      runtimeDataHonestyCaveat,
      localFallbackRuntimeCaveat,
      storageRuntimeCaveat,
      publicDemoRuntimeCaveat,
      "This runtime readiness model returns booleans, counts and status labels only; it never returns Supabase keys, JWTs, database URLs or raw env values.",
      "Read-only probes do not insert, update, delete, upsert, create tables, alter tables, seed data, change RLS or create storage buckets."
    ]),
    generatedAt: new Date().toISOString()
  };
}
