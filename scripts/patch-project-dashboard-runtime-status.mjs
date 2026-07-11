import fs from "node:fs";
import path from "node:path";

const filePath = path.join(process.cwd(), "components", "project-dashboard", "project-dashboard.tsx");
let source = fs.readFileSync(filePath, "utf8");

function replaceOnce(label, before, after) {
  const count = source.split(before).length - 1;
  if (count !== 1) {
    throw new Error(`${label}: expected exactly one match, found ${count}`);
  }
  source = source.replace(before, after);
}

replaceOnce(
  "runtime status import",
  'import { repositoryModeToLabel, type RepositoryMode } from "@/src/lib/repositories/repository-mode";',
  'import { repositoryModeToLabel, type RepositoryMode } from "@/src/lib/repositories/repository-mode";\nimport { connectorRuntimeStatusLabel, storageRuntimeSummary, type RuntimeExecutiveStatus } from "@/src/lib/platform/runtime-status-contract";'
);

replaceOnce(
  "pilot backend executive status type",
  '  nextActions: string[];\n  caveats: string[];\n};',
  '  nextActions: string[];\n  caveats: string[];\n  executiveStatus?: RuntimeExecutiveStatus;\n};'
);

replaceOnce(
  "public demo access label",
  '      : `${authStatus.label} / ${roleLabel}`;',
  '      : `Public demo access / ${roleLabel}`;'
);

replaceOnce(
  "platform rows",
  `  const pilotCapability = (id: string) => pilotBackendStatus?.capabilities.find((item) => item.id === id);
  const platformRows = [
    {
      label: "Sample pilot",
      value: pilotBackendStatus?.canRunDemoPilot ? "Ready" : "Blocked",
      note: pilotBackendStatus?.canRunDemoPilot ? "Sample/open path remains available" : "Public sample access is disabled"
    },
    {
      label: "Confidential",
      value: pilotBackendStatus?.canRunConfidentialPilot ? "Ready" : "Blocked",
      note: pilotBackendStatus?.canRunConfidentialPilot ? "Backend gates verified" : pilotBackendStatus?.blockers?.[0]?.title ?? "Backend gates not verified"
    },
    {
      label: "Auth",
      value: platformStatus?.authMode === "supabase_auth" ? "Supabase Auth" : "Pilot access",
      note: pilotCapability("auth_sessions")?.evidence ?? (platformStatus?.authMode === "supabase_auth"
        ? "Membership-backed access foundation"
        : "Public demo access; not production authentication")
    },
    {
      label: "DB",
      value: repositoryModeToLabel(platformStatus?.repositoryMode ?? dbHealth?.repositoryMode ?? projectsMode),
      note: dbHealth?.caveat ?? getSupabaseFallbackMessage(false)
    },
    {
      label: "Schema",
      value: platformStatus?.schemaReady ? "Ready" : "Incomplete",
      note: platformStatus?.migrationApplied ? "v2.3 migration verified" : "Migration not applied or not reachable"
    },
    {
      label: "Storage",
      value: pilotCapability("signed_upload_download")?.status === "verified_active"
        ? "Signed URL verified"
        : platformStatus?.storageReady ? "Buckets ready" : "Metadata only",
      note: pilotCapability("storage_buckets")?.evidence ?? (platformStatus?.storageReady ? "Buckets reachable; policies still require verification" : "Bucket readiness path is explicit")
    },
    {
      label: "Audit",
      value: pilotCapability("audit_events")?.status === "verified_active" ? "Durable verified" : "Foundation",
      note: pilotCapability("audit_events")?.evidence ?? "Audit events never block workflows; not a certified audit trail"
    },
    {
      label: "Access",
      value: pilotBackendStatus?.accessEnforcementMode === "hard" ? "Hard" : "Soft",
      note: pilotCapability("hard_access_enforcement")?.evidence ?? "Project access metadata is returned; hard enforcement remains opt-in"
    },
    {
      label: "RLS",
      value: pilotCapability("rls_policies")?.status === "configured_ready" ? "Ready to test" : "Draft",
      note: pilotCapability("rls_policies")?.evidence ?? "RLS policy draft requires live verification"
    }
  ];`,
  `  const platformRows = pilotBackendStatus?.executiveStatus?.rows ?? [
    {
      label: "Public demo workflow",
      value: "Checking",
      note: "Loading current runtime status."
    },
    {
      label: "Confidential pilot",
      value: "Checking",
      note: "Loading security and persistence gate status."
    },
    {
      label: "Auth",
      value: platformStatus?.authMode === "supabase_auth" ? "Preview authenticated access" : "Public demo access",
      note: platformStatus?.authMode === "supabase_auth"
        ? "Authentication mode is configured for this environment; membership evidence remains separately controlled."
        : "Public demo access is not production authentication."
    }
  ];`
);

replaceOnce(
  "report panel wording",
  'subtitle="Client-ready memo generation remains connected to the workspace result and report preview flow."',
  'subtitle="Review-ready screening memo previews remain connected to the workspace result and report flow."'
);

replaceOnce(
  "connector status wording",
  '{formatDataRoomLabel(connector.currentStatus)}',
  '{connectorRuntimeStatusLabel(connector.currentStatus)}'
);

replaceOnce(
  "storage runtime wording",
  `                        Buckets: {storageHealth?.bucketReady ? "ready" : storageHealth?.missingBuckets?.length ? \`${'${storageHealth.missingBuckets.length}'} missing\` : "not configured"}.
                        {" "}Files: {evidenceFiles.length}; metadata-only: {evidenceFiles.filter((file) => file.objectStatus === "metadata_only").length}.`,
  `                        {storageRuntimeSummary({
                          configured: storageHealth?.provider === "supabase_storage",
                          bucketReady: storageHealth?.bucketReady,
                          evidenceFileCount: evidenceFiles.length,
                          metadataOnlyCount: evidenceFiles.filter((file) => file.objectStatus === "metadata_only").length
                        })}`
);

fs.writeFileSync(filePath, source, "utf8");
console.log(JSON.stringify({
  ok: true,
  file: path.relative(process.cwd(), filePath),
  changes: [
    "canonical executive runtime rows",
    "public demo access label",
    "review-ready report wording",
    "manual import path wording",
    "runtime-reachability storage wording"
  ]
}, null, 2));
