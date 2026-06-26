import type { RepositoryMode } from "@/src/lib/repositories/repository-mode";

export type PilotBackendStatus =
  | "demo_only"
  | "ready_to_configure"
  | "migration_ready"
  | "migration_applied"
  | "storage_ready"
  | "auth_ready"
  | "access_enforced"
  | "verified_for_pilot"
  | "blocked";

export type BackendCapability =
  | "supabase_connection"
  | "postgis_schema"
  | "auth_sessions"
  | "project_memberships"
  | "rls_policies"
  | "storage_buckets"
  | "signed_upload_download"
  | "audit_events"
  | "report_packages"
  | "validation_evidence"
  | "hard_access_enforcement";

export type CapabilityStatus =
  | "not_configured"
  | "configured_unverified"
  | "configured_ready"
  | "verified_active"
  | "blocked";

export type ActivationBlocker = {
  id: string;
  severity: "p0" | "p1" | "p2";
  title: string;
  description: string;
  requiredEnv?: string[];
  requiredCommand?: string;
  relatedRoute?: string;
  nextAction: string;
};

export type PilotBackendCapabilitySummary = {
  id: BackendCapability;
  label: string;
  status: CapabilityStatus;
  evidence: string;
  caveat?: string;
  repositoryMode?: RepositoryMode;
};

export type PilotBackendActivationSummary = {
  ok: boolean;
  status: PilotBackendStatus;
  repositoryMode: RepositoryMode;
  accessEnforcementMode: "soft" | "hard";
  allowDemoPublic: boolean;
  requireSupabaseReady: boolean;
  requireStorageReady: boolean;
  canRunDemoPilot: boolean;
  canRunConfidentialPilot: boolean;
  capabilities: PilotBackendCapabilitySummary[];
  blockers: ActivationBlocker[];
  nextActions: string[];
  caveats: string[];
  generatedAt: string;
};
