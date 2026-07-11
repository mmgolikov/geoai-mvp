export type RuntimeStatusRow = {
  label: string;
  value: string;
  note: string;
};

export type RuntimeExecutiveStatus = {
  environment: "local_development" | "vercel_preview" | "vercel_production_demo";
  accessMode: "demo_public" | "supabase_authenticated_preview" | "hard_access_preview" | "hard_access_production";
  repositoryMode: string;
  demoWorkflow: "demo_workflow_available" | "demo_workflow_degraded" | "demo_workflow_blocked";
  confidentialPilot: "confidential_pilot_ready" | "confidential_pilot_blocked";
  supabaseRuntime: "reachable" | "configured_unavailable" | "not_configured_in_runtime";
  storageRuntime: "reachable" | "configured_unavailable" | "not_configured_in_runtime";
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
  storageReady: boolean;
  authEvidence?: string | null;
  storageEvidence?: string | null;
  auditEvidence?: string | null;
  rlsEvidence?: string | null;
  hardAccessEvidence?: string | null;
};

const caveat =
  "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";

function environmentLabel(value?: string | null): RuntimeExecutiveStatus["environment"] {
  if (value === "production") return "vercel_production_demo";
  if (value === "preview") return "vercel_preview";
  return "local_development";
}

function accessMode(input: RuntimeExecutiveStatusInput): RuntimeExecutiveStatus["accessMode"] {
  if (input.accessEnforcementMode === "hard") {
    return input.vercelEnvironment === "production" ? "hard_access_production" : "hard_access_preview";
  }
  if (input.authMode === "supabase_auth") return "supabase_authenticated_preview";
  return "demo_public";
}

function supabaseRuntime(input: RuntimeExecutiveStatusInput): RuntimeExecutiveStatus["supabaseRuntime"] {
  if (!input.supabaseConfigured) return "not_configured_in_runtime";
  return input.supabaseReachable ? "reachable" : "configured_unavailable";
}

function storageRuntime(input: RuntimeExecutiveStatusInput): RuntimeExecutiveStatus["storageRuntime"] {
  if (!input.supabaseConfigured) return "not_configured_in_runtime";
  return input.storageReady ? "reachable" : "configured_unavailable";
}

export function buildRuntimeExecutiveStatus(input: RuntimeExecutiveStatusInput): RuntimeExecutiveStatus {
  const demoWorkflow: RuntimeExecutiveStatus["demoWorkflow"] = input.canRunDemoWorkflow
    ? input.repositoryMode === "local_fallback"
      ? "demo_workflow_degraded"
      : "demo_workflow_available"
    : "demo_workflow_blocked";

  const confidentialPilot: RuntimeExecutiveStatus["confidentialPilot"] = input.canRunConfidentialPilot
    ? "confidential_pilot_ready"
    : "confidential_pilot_blocked";

  const supabase = supabaseRuntime(input);
  const storage = storageRuntime(input);

  const rows: RuntimeStatusRow[] = [
    {
      label: "Public demo workflow",
      value: input.canRunDemoWorkflow ? "Available" : "Blocked",
      note: input.canRunDemoWorkflow
        ? input.repositoryMode === "local_fallback"
          ? "Controlled sample/open workflow is available in local/demo fallback mode."
          : "Controlled demo workflow is available."
        : "The controlled public demo workflow is unavailable."
    },
    {
      label: "Confidential pilot",
      value: input.canRunConfidentialPilot ? "Ready" : "Blocked",
      note: input.canRunConfidentialPilot
        ? "Confidential-pilot backend gates are verified for the stated environment."
        : "Auth, membership, live RLS, storage scope and validation evidence remain incomplete."
    },
    {
      label: "Auth",
      value: input.authMode === "supabase_auth" ? "Preview authenticated access" : "Public demo access",
      note: input.authEvidence ?? (input.authMode === "supabase_auth"
        ? "Supabase Auth mode is configured for this environment; membership evidence remains separately controlled."
        : "Public demo access is not production authentication.")
    },
    {
      label: "Repository",
      value: input.repositoryMode === "local_fallback" ? "Local/demo fallback" : "Supabase runtime",
      note: input.repositoryMode === "local_fallback"
        ? "This runtime is not using durable Production Supabase persistence."
        : "Repository mode must still be interpreted with schema and access evidence."
    },
    {
      label: "Supabase schema",
      value: supabase === "reachable" && input.schemaReady
        ? "Reachable"
        : supabase === "not_configured_in_runtime"
          ? "Not connected in this runtime"
          : "Configured but not verified",
      note: supabase === "not_configured_in_runtime"
        ? "The development Supabase project may contain the schema, but this runtime intentionally has no Supabase connection."
        : input.schemaReady
          ? "Required application schema is reachable in this runtime."
          : "Schema is incomplete, policy-blocked or unreachable in this runtime."
    },
    {
      label: "Storage",
      value: storage === "reachable"
        ? "Reachable"
        : storage === "not_configured_in_runtime"
          ? "Not connected in this runtime"
          : "Configured but not verified",
      note: input.storageEvidence ?? (storage === "not_configured_in_runtime"
        ? "Private buckets may exist in the development project, but this runtime cannot use or verify them."
        : input.storageReady
          ? "Storage is reachable; object-scope and signed URL evidence remain separately controlled."
          : "Storage configuration or object-scope verification is incomplete.")
    },
    {
      label: "Audit",
      value: input.auditEvidence ? "Foundation" : "Not verified",
      note: input.auditEvidence ?? "Audit durability is not verified in this runtime."
    },
    {
      label: "Access enforcement",
      value: input.accessEnforcementMode === "hard" ? "Hard" : "Soft",
      note: input.hardAccessEvidence ?? (input.accessEnforcementMode === "hard"
        ? "Hard access must be supported by Auth, memberships, live RLS and storage evidence."
        : "Soft public-demo access remains the supported mode.")
    },
    {
      label: "RLS",
      value: input.rlsEvidence ? "Static/readiness foundation" : "Not verified",
      note: input.rlsEvidence ?? "Live positive/negative RLS behavior has not been verified."
    }
  ];

  return {
    environment: environmentLabel(input.vercelEnvironment),
    accessMode: accessMode(input),
    repositoryMode: input.repositoryMode,
    demoWorkflow,
    confidentialPilot,
    supabaseRuntime: supabase,
    storageRuntime: storage,
    rows,
    caveat
  };
}

export function connectorRuntimeStatusLabel(status?: string | null) {
  if (status === "manual_snapshot_ready") {
    return "manual import path available; no verified snapshot attached";
  }
  return (status ?? "not configured").replace(/_/g, " ");
}

export function storageRuntimeSummary(input: {
  configured?: boolean;
  bucketReady?: boolean;
  evidenceFileCount: number;
  metadataOnlyCount: number;
}) {
  const bucketLabel = input.bucketReady
    ? "reachable in this runtime"
    : input.configured
      ? "configured but not verified in this runtime"
      : "not connected in this runtime";
  return `Buckets: ${bucketLabel}. Files: ${input.evidenceFileCount}; metadata-only: ${input.metadataOnlyCount}.`;
}

export const runtimeStatusCaveat = caveat;
