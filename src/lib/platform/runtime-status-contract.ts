export type RuntimeStatusRow = {
  label: string;
  value: string;
  note: string;
};

export type RuntimeExecutiveStatus = {
  environment: "local_development" | "vercel_preview" | "vercel_production_demo";
  accessMode:
    | "demo_public"
    | "supabase_authenticated_preview"
    | "supabase_auth_configured_unverified"
    | "hard_access_unverified"
    | "hard_access_verified_preview"
    | "hard_access_verified_production";
  repositoryMode: string;
  demoWorkflow: "demo_workflow_available" | "demo_workflow_degraded" | "demo_workflow_blocked";
  confidentialPilot: "confidential_pilot_ready" | "confidential_pilot_blocked";
  supabaseRuntime: "reachable" | "configured_unavailable" | "not_configured_in_runtime" | "not_attested_on_public_endpoint";
  storageRuntime: "reachable" | "configured_unavailable" | "not_configured_in_runtime" | "not_attested_on_public_endpoint";
  rows: RuntimeStatusRow[];
  caveat: string;
};

export type RuntimeExecutiveStatusInput = {
  vercelEnvironment?: string | null;
  authMode: string;
  repositoryMode: string;
  accessEnforcementMode: "soft" | "hard";
  canRunDemoWorkflow: boolean;
  canRunConfidentialPilot: boolean;
  supabaseConfigured: boolean;
  supabaseReachable: boolean;
  schemaReady: boolean;
  storageConfigured: boolean;
  storageReady: boolean;
  auditFoundationPresent: boolean;
  authSessionVerified: boolean;
  projectMembershipsVerified: boolean;
  rlsPoliciesVerified: boolean;
  hardAccessEnabled: boolean;
  hardAccessVerified: boolean;
  infrastructureDiagnosticsWithheld?: boolean;
};

const caveat =
  "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";

export const initialRuntimeStatusRows: RuntimeStatusRow[] = [
  {
    label: "Public demo workflow",
    value: "Checking",
    note: "Checking runtime status."
  },
  {
    label: "Confidential pilot",
    value: "Checking",
    note: "Checking runtime status."
  },
  {
    label: "Auth",
    value: "Checking runtime status",
    note: "Checking current authentication mode."
  }
];

function deriveEnvironment(value?: string | null): RuntimeExecutiveStatus["environment"] {
  if (value === "production") return "vercel_production_demo";
  if (value === "preview") return "vercel_preview";
  return "local_development";
}

function deriveAccessMode(input: RuntimeExecutiveStatusInput): RuntimeExecutiveStatus["accessMode"] {
  if (input.accessEnforcementMode === "hard" || input.hardAccessEnabled) {
    if (!input.hardAccessVerified) return "hard_access_unverified";
    return input.vercelEnvironment === "production"
      ? "hard_access_verified_production"
      : "hard_access_verified_preview";
  }
  if (input.authMode === "supabase_auth") {
    return input.authSessionVerified && input.projectMembershipsVerified
      ? "supabase_authenticated_preview"
      : "supabase_auth_configured_unverified";
  }
  return "demo_public";
}

function deriveSupabaseRuntime(input: RuntimeExecutiveStatusInput): RuntimeExecutiveStatus["supabaseRuntime"] {
  if (input.infrastructureDiagnosticsWithheld) return "not_attested_on_public_endpoint";
  if (!input.supabaseConfigured) return "not_configured_in_runtime";
  return input.supabaseReachable && input.schemaReady ? "reachable" : "configured_unavailable";
}

function deriveStorageRuntime(input: RuntimeExecutiveStatusInput): RuntimeExecutiveStatus["storageRuntime"] {
  if (input.infrastructureDiagnosticsWithheld) return "not_attested_on_public_endpoint";
  if (!input.storageConfigured) return "not_configured_in_runtime";
  return input.storageReady ? "reachable" : "configured_unavailable";
}

export function buildRuntimeExecutiveStatus(input: RuntimeExecutiveStatusInput): RuntimeExecutiveStatus {
  const environment = deriveEnvironment(input.vercelEnvironment);
  const accessMode = deriveAccessMode(input);
  const supabaseRuntime = deriveSupabaseRuntime(input);
  const storageRuntime = deriveStorageRuntime(input);
  const demoWorkflow: RuntimeExecutiveStatus["demoWorkflow"] = input.canRunDemoWorkflow
    ? input.repositoryMode === "local_fallback"
      ? "demo_workflow_degraded"
      : "demo_workflow_available"
    : "demo_workflow_blocked";
  const confidentialPilot: RuntimeExecutiveStatus["confidentialPilot"] = input.canRunConfidentialPilot
    ? "confidential_pilot_ready"
    : "confidential_pilot_blocked";

  const authVerified = input.authSessionVerified && input.projectMembershipsVerified;
  const rows: RuntimeStatusRow[] = [
    {
      label: "Public demo workflow",
      value: input.canRunDemoWorkflow ? "Available" : "Blocked",
      note: input.canRunDemoWorkflow
        ? input.repositoryMode === "local_fallback"
          ? "Controlled sample/open workflow is available in local/demo fallback mode."
          : "Controlled demo workflow is available in this runtime."
        : "The controlled public demo workflow is unavailable."
    },
    {
      label: "Confidential pilot",
      value: input.canRunConfidentialPilot ? "Ready" : "Blocked",
      note: input.canRunConfidentialPilot
        ? "The authoritative backend readiness gate confirms this environment."
        : "Auth, membership, live RLS, Storage scope and validation evidence remain incomplete."
    },
    {
      label: "Auth",
      value: input.authMode === "supabase_auth"
        ? authVerified
          ? "Preview authenticated access"
          : "Supabase Auth configured; caller unverified"
        : "Public demo access",
      note: input.authMode === "supabase_auth"
        ? authVerified
          ? "Preview Auth and membership evidence is recorded; this does not activate Production access."
          : "Preview Auth configuration is present; session and membership evidence remains incomplete."
        : "Public demo access is not production authentication."
    },
    {
      label: "Repository",
      value: input.repositoryMode === "browser_local"
        ? "Browser-local demo"
        : input.repositoryMode === "local_fallback"
          ? "Local/demo fallback"
          : "Supabase runtime",
      note: input.repositoryMode === "browser_local"
        ? "User-created public-demo state remains in this browser and is not durable or shared."
        : input.repositoryMode === "local_fallback"
          ? "This runtime is not using durable Production Supabase persistence."
          : "Repository mode must be interpreted with schema, access and environment evidence."
    },
    {
      label: "Supabase schema",
      value: supabaseRuntime === "reachable"
        ? "Reachable in this runtime"
        : supabaseRuntime === "not_attested_on_public_endpoint"
          ? "Not attested on public endpoint"
        : supabaseRuntime === "not_configured_in_runtime"
          ? "Not connected in this runtime"
          : "Configured but not verified",
      note: supabaseRuntime === "reachable"
        ? environment === "vercel_preview"
          ? "Preview read-only evidence is reachable; this does not activate Production Supabase persistence."
          : "Required application schema is reachable in this runtime."
        : supabaseRuntime === "not_attested_on_public_endpoint"
          ? "Configuration and reachability diagnostics are withheld from this public response."
        : supabaseRuntime === "not_configured_in_runtime"
          ? "The development Supabase project state does not mean this Production runtime is connected."
          : "Schema is incomplete, policy-blocked or unreachable in this runtime."
    },
    {
      label: "Storage",
      value: storageRuntime === "reachable"
        ? "Reachable in this runtime"
        : storageRuntime === "not_attested_on_public_endpoint"
          ? "Not attested on public endpoint"
        : storageRuntime === "not_configured_in_runtime"
          ? "Not connected in this runtime"
          : "Configured but not verified",
      note: storageRuntime === "reachable"
        ? environment === "vercel_preview"
          ? "Preview Storage evidence is reachable; object scope and signed URL behavior remain environment-specific."
          : "Storage reachability is recorded for this runtime; access scope still follows the backend gates."
        : storageRuntime === "not_attested_on_public_endpoint"
          ? "Storage configuration and reachability diagnostics are withheld from this public response."
        : storageRuntime === "not_configured_in_runtime"
          ? "Private buckets and signed URL flows are not available or verified in this runtime."
          : "Storage configuration, private bucket reachability or signed URL verification is incomplete."
    },
    {
      label: "Audit",
      value: input.infrastructureDiagnosticsWithheld ? "Not attested on public endpoint" : input.auditFoundationPresent ? "Foundation" : "Not verified",
      note: input.infrastructureDiagnosticsWithheld
        ? "Audit infrastructure diagnostics are withheld from this public response."
        : input.auditFoundationPresent
        ? "Audit foundation evidence exists; this is not a certified audit trail."
        : "Audit durability is not verified in this runtime."
    },
    {
      label: "Access enforcement",
      value: input.accessEnforcementMode === "hard" ? "Hard" : "Soft",
      note: input.accessEnforcementMode === "hard"
        ? input.hardAccessVerified
          ? "Hard access is backed by the recorded Auth, membership and RLS gates for this environment."
          : "Hard access is requested but security evidence is incomplete; confidential access remains blocked."
        : "Soft public-demo access remains the supported mode."
    },
    {
      label: "RLS",
      value: input.infrastructureDiagnosticsWithheld ? "Not attested on public endpoint" : input.rlsPoliciesVerified ? "Verified in this runtime" : input.schemaReady ? "Static/readiness foundation" : "Not verified",
      note: input.infrastructureDiagnosticsWithheld
        ? "RLS and persona-test diagnostics are withheld from this public response."
        : input.rlsPoliciesVerified
        ? "Recorded positive and negative RLS checks apply only to this environment."
        : "Live positive/negative RLS behavior has not been verified."
    }
  ];

  return {
    environment,
    accessMode,
    repositoryMode: input.repositoryMode,
    demoWorkflow,
    confidentialPilot,
    supabaseRuntime,
    storageRuntime,
    rows,
    caveat
  };
}

export function connectorRuntimeStatusLabel(status?: string | null, verifiedSnapshotAttached = false) {
  if (status === "manual_snapshot_ready" && !verifiedSnapshotAttached) {
    return "manual import path available; no verified snapshot attached";
  }
  return (status ?? "not configured").replace(/_/g, " ");
}

export function storageRuntimeSummary(input: {
  configured: boolean;
  storageReady: boolean;
  evidenceFileCount: number;
  metadataOnlyCount: number;
}) {
  const state = input.storageReady
    ? "reachable in this runtime"
    : input.configured
      ? "configured but not verified"
      : "not connected in this runtime";
  return `Storage: ${state}. Files: ${input.evidenceFileCount}; metadata-only: ${input.metadataOnlyCount}.`;
}

export const runtimeStatusCaveat = caveat;
