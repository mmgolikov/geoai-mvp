import { getAuthModeStatus } from "@/src/lib/auth/auth-mode";
import { getSchemaReadinessSummary } from "@/src/lib/db/schema-readiness";
import { getEnforcementConfig } from "@/src/lib/platform/enforcement-config";
import { getStorageReadiness } from "@/src/lib/storage/storage-readiness";
import { getSupabaseServerClient } from "@/src/lib/supabase/server";
import type {
  ActivationBlocker,
  BackendCapability,
  CapabilityStatus,
  PilotBackendActivationSummary,
  PilotBackendCapabilitySummary,
  PilotBackendStatus
} from "@/src/types/pilot-backend";

const fallbackCaveat = "Local/API fallback is not durable production storage.";
const demoAccessCaveat = "Public demo access is not production authentication.";
const supabaseCaveat = "Supabase/PostGIS durable persistence is active only when configured and schema readiness checks pass.";
const storageCaveat = "Storage readiness is not secure enterprise storage until buckets, policies, signed URL flows and access enforcement are configured and verified.";
const auditCaveat = "Audit events are a foundation only, not a certified audit trail.";

type AuditRow = {
  event_type?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at?: string | null;
};

type DbSelectResponse<T> = {
  data?: T[] | null;
  error?: unknown;
};

type DbClientLike = {
  from: (table: string) => {
    select: (columns?: string, options?: unknown) => unknown;
  };
};

function capability(
  id: BackendCapability,
  label: string,
  status: CapabilityStatus,
  evidence: string,
  caveat?: string
): PilotBackendCapabilitySummary {
  return { id, label, status, evidence, caveat };
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function statusRank(status: CapabilityStatus) {
  if (status === "verified_active") return 4;
  if (status === "configured_ready") return 3;
  if (status === "configured_unverified") return 2;
  if (status === "blocked") return 1;
  return 0;
}

function boolEnv(name: string) {
  return process.env[name]?.trim().toLowerCase() === "true";
}

function deriveOverallStatus(input: {
  supabaseConfigured: boolean;
  schemaReady: boolean;
  storageReady: boolean;
  authReady: boolean;
  accessEnforced: boolean;
  confidentialReady: boolean;
  hasP0: boolean;
}): PilotBackendStatus {
  if (input.confidentialReady) return "verified_for_pilot";
  if (input.hasP0 && !input.supabaseConfigured) return "demo_only";
  if (input.accessEnforced) return "access_enforced";
  if (input.authReady) return "auth_ready";
  if (input.storageReady) return "storage_ready";
  if (input.schemaReady) return "migration_applied";
  if (input.supabaseConfigured) return "migration_ready";
  return "demo_only";
}

async function isAuditDurabilityVerified(schemaReady: boolean) {
  if (!schemaReady) {
    return false;
  }

  if (process.env.GEOAI_AUDIT_WRITE_READ_VERIFIED?.trim().toLowerCase() === "true") {
    return true;
  }

  const client = await getSupabaseServerClient() as DbClientLike | null;
  if (!client) {
    return false;
  }

  try {
    const response = await client
      .from("audit_events")
      .select("event_type,metadata,created_at") as DbSelectResponse<AuditRow>;

    if (response.error || !Array.isArray(response.data)) {
      return false;
    }

    return response.data.some((event) => (
      event.event_type === "storage_health_checked" &&
      event.metadata?.verification === "geoai-storage-readiness-v1" &&
      event.metadata?.signedUrlVerified === true
    ));
  } catch {
    return false;
  }
}

export async function getPilotBackendActivationSummary(): Promise<PilotBackendActivationSummary> {
  const [schema, storage] = await Promise.all([
    getSchemaReadinessSummary(),
    getStorageReadiness()
  ]);
  const auth = getAuthModeStatus();
  const config = getEnforcementConfig();
  const schemaReady = schema.status === "connected" && schema.postgisReady && schema.tablesReady;
  const authConfigured = auth.effectiveMode === "supabase_auth" && auth.supabasePublicConfigAvailable;
  const authSessionVerified = authConfigured && boolEnv("GEOAI_AUTH_SESSION_VERIFIED");
  const hardAccessEnabled = config.accessEnforcementMode === "hard";
  const membershipsConfigured = schemaReady;
  const membershipsVerified = membershipsConfigured && boolEnv("GEOAI_PROJECT_MEMBERSHIP_TESTS_VERIFIED");
  const rlsConfigured = schemaReady;
  const rlsVerified = rlsConfigured && boolEnv("GEOAI_RLS_POLICY_TESTS_VERIFIED");
  const hardAccessVerified = hardAccessEnabled && authSessionVerified && membershipsVerified && rlsVerified;
  const signedUrlVerified = Boolean(storage.signedUrlVerified);
  const auditVerified = await isAuditDurabilityVerified(schemaReady);

  const capabilities = [
    capability(
      "supabase_connection",
      "Supabase connection",
      schema.configured ? (schema.status === "connected" ? "configured_ready" : schema.status === "configured_unavailable" ? "blocked" : "configured_unverified") : "not_configured",
      schema.configured ? schema.message : "Supabase environment variables are not configured.",
      supabaseCaveat
    ),
    capability(
      "postgis_schema",
      "PostGIS schema",
      schemaReady ? "verified_active" : schema.configured ? "configured_unverified" : "not_configured",
      schemaReady ? "Required v2.3 tables and PostGIS readiness are verified." : `${schema.missingTables.length} required table(s) missing or unreachable.`,
      supabaseCaveat
    ),
    capability(
      "auth_sessions",
      "Auth sessions",
      authConfigured ? authSessionVerified ? "configured_ready" : "configured_unverified" : "not_configured",
      authConfigured
        ? authSessionVerified
          ? "Supabase Auth session verification has been recorded for this runtime."
          : "Supabase Auth config is present, but real Preview session verification is not recorded."
        : auth.caveat,
      demoAccessCaveat
    ),
    capability(
      "project_memberships",
      "Project memberships",
      membershipsConfigured ? membershipsVerified ? "configured_ready" : "configured_unverified" : "not_configured",
      membershipsConfigured
        ? membershipsVerified
          ? "Positive and negative project membership checks have been recorded for this runtime."
          : "Membership table exists; real positive/negative membership tests are still required."
        : "Membership table is not verified.",
      "Membership checks must be verified with seeded pilot users before hard access rollout."
    ),
    capability(
      "rls_policies",
      "RLS policies",
      rlsConfigured ? rlsVerified ? "configured_ready" : "configured_unverified" : "not_configured",
      rlsConfigured
        ? rlsVerified
          ? "RLS positive and negative hard-mode checks have been recorded for this runtime."
          : "RLS remains a migration/policy foundation until auth, memberships and hard-mode tests are verified."
        : "RLS policy foundation is not verified.",
      "RLS policies require configured Supabase Auth, project memberships and deployment governance."
    ),
    capability(
      "storage_buckets",
      "Storage buckets",
      storage.bucketReady ? "configured_ready" : storage.configured ? "configured_unverified" : "not_configured",
      storage.bucketReady ? "Required private bucket names are reachable." : storage.blockers[0] ?? "Storage buckets are not verified.",
      storageCaveat
    ),
    capability(
      "signed_upload_download",
      "Signed upload/download",
      signedUrlVerified ? "verified_active" : storage.bucketReady ? "configured_unverified" : "not_configured",
      signedUrlVerified ? "Signed URL marker flow was verified." : "Signed URL binary verification has not been completed.",
      storageCaveat
    ),
    capability(
      "audit_events",
      "Audit events",
      auditVerified ? "verified_active" : schemaReady ? "configured_unverified" : "not_configured",
      auditVerified ? "Audit write/read verification is backed by a persisted storage health audit event." : "Audit helper exists, but durable write/read verification is not active.",
      auditCaveat
    ),
    capability(
      "report_packages",
      "Report packages",
      "configured_ready",
      "Report package builder, APIs, JSON export and print route are available.",
      "Browser print/save as PDF remains the current PDF workflow."
    ),
    capability(
      "validation_evidence",
      "Validation evidence",
      "configured_ready",
      "Validation evidence model, review lifecycle and connector readiness metadata are available.",
      "screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion."
    ),
    capability(
      "hard_access_enforcement",
      "Hard access enforcement",
      hardAccessVerified ? "verified_active" : "not_configured",
      hardAccessVerified
        ? "Hard access mode is enabled and backed by verified Auth, membership and RLS checks."
        : "Hard access is disabled or unverified; soft demo-safe mode remains the supported runtime path.",
      demoAccessCaveat
    )
  ];

  const blockers: ActivationBlocker[] = [];

  if (!schema.configured) {
    blockers.push({
      id: "supabase_env_missing",
      severity: "p0",
      title: "Supabase environment is not configured",
      description: "Durable persistence cannot be used until Supabase URL and server credentials are configured in the target runtime.",
      requiredEnv: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"],
      relatedRoute: "/api/db/health",
      nextAction: "Configure Supabase environment variables in Vercel/server runtime, then run migration readiness checks."
    });
  }

  if (schema.configured && !schemaReady) {
    blockers.push({
      id: "supabase_schema_incomplete",
      severity: "p0",
      title: "Supabase/PostGIS schema is not verified",
      description: schema.missingTables.length > 0
        ? `${schema.missingTables.length} required table(s) are missing or unreachable.`
        : "PostGIS readiness is not verified.",
      requiredCommand: "npm run supabase:migrate:check",
      relatedRoute: "/api/db/health",
      nextAction: "Review and apply the migration from a trusted environment, then verify persistence."
    });
  }

  if (!authSessionVerified) {
    blockers.push({
      id: "auth_not_enforced",
      severity: "p0",
      title: "Production auth is not enforced",
      description: authConfigured
        ? "Supabase Auth config is present, but a real server-verified Preview session has not been recorded."
        : auth.caveat,
      requiredEnv: ["NEXT_PUBLIC_AUTH_MODE=supabase_auth"],
      relatedRoute: "/api/auth/session",
      nextAction: "Configure Supabase Auth and project memberships before confidential client access."
    });
  }

  if (!storage.storageReady) {
    blockers.push({
      id: "storage_not_verified",
      severity: config.requireStorageReady ? "p0" : "p1",
      title: "Supabase Storage is not verified",
      description: storage.blockers[0] ?? "Required private buckets and signed URL flows are not verified.",
      requiredCommand: "npm run storage:check",
      relatedRoute: "/api/storage/health",
      nextAction: storage.nextActions[0] ?? "Create private buckets and verify signed upload/download flows."
    });
  }

  if (!signedUrlVerified) {
    blockers.push({
      id: "signed_url_not_verified",
      severity: "p1",
      title: "Signed URL binary verification is pending",
      description: "Private bucket signed upload/download has not been tested with a temporary object.",
      requiredCommand: "npm run storage:verify:signed-url",
      relatedRoute: "/api/storage/health",
      nextAction: "Run signed URL marker verification before storing protected client files."
    });
  }

  if (!hardAccessVerified) {
    blockers.push({
      id: "hard_access_not_verified",
      severity: "p0",
      title: "Hard project access is not verified",
      description: hardAccessEnabled
        ? "Hard access mode is requested, but auth/schema membership readiness is not complete."
        : "Soft public demo access remains active.",
      requiredEnv: ["GEOAI_ACCESS_ENFORCEMENT_MODE=hard"],
      relatedRoute: "/api/pilot-backend/status",
      nextAction: "Verify Supabase Auth, memberships and RLS before enabling hard enforcement for client projects."
    });
  }

  if (!auditVerified) {
    blockers.push({
      id: "audit_not_durable_verified",
      severity: "p1",
      title: "Audit durability is not verified",
      description: "Audit events are non-blocking and have not been verified as durable write/read evidence.",
      requiredCommand: "npm run audit:verify",
      relatedRoute: "/api/pilot-backend/status",
      nextAction: "Run audit verification after Supabase schema readiness is confirmed."
    });
  }

  const canRunDemoPilot = config.allowDemoPublic;
  const canRunDemoWorkflow = canRunDemoPilot;
  const canRunConfidentialPilot = [
    "supabase_connection",
    "postgis_schema",
    "auth_sessions",
    "project_memberships",
    "storage_buckets",
    "signed_upload_download",
    "audit_events",
    "hard_access_enforcement"
  ].every((id) => {
    const found = capabilities.find((item) => item.id === id);
    return found
      ? statusRank(found.status) >= statusRank(id === "audit_events" || id === "signed_upload_download" || id === "hard_access_enforcement" ? "verified_active" : "configured_ready")
      : false;
  });
  const hasP0 = blockers.some((item) => item.severity === "p0");
  const status = deriveOverallStatus({
    supabaseConfigured: schema.configured,
    schemaReady,
    storageReady: storage.storageReady,
    authReady: authSessionVerified,
    accessEnforced: hardAccessVerified,
    confidentialReady: canRunConfidentialPilot,
    hasP0
  });

  return {
    ok: true,
    status,
    repositoryMode: schema.repositoryMode,
    accessEnforcementMode: config.accessEnforcementMode,
    allowDemoPublic: config.allowDemoPublic,
    requireSupabaseReady: config.requireSupabaseReady,
    requireStorageReady: config.requireStorageReady,
    canRunDemoPilot,
    canRunDemoWorkflow,
    canRunConfidentialPilot,
    capabilities,
    blockers,
    nextActions: unique(blockers.map((item) => item.nextAction)),
    caveats: unique([
      fallbackCaveat,
      demoAccessCaveat,
      supabaseCaveat,
      storageCaveat,
      auditCaveat,
      ...capabilities.map((item) => item.caveat ?? "")
    ]),
    generatedAt: new Date().toISOString()
  };
}
