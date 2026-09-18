import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const files = {
  migration: "supabase/migrations/20260918203424_point_object_project_artifacts_v1.sql",
  personas: "supabase/tests/sprint10_point_object_project_artifacts.sql",
  deactivation: "supabase/operator/point_object_project_artifacts_v1_deactivation.sql",
  contract: "src/lib/prototype/point-object-cloud-contract.ts",
  repository: "src/lib/prototype/point-object-cloud-repository.ts",
  route: "app/api/prototype/point-to-object/project-artifacts/route.ts",
  inventory: "security/api-route-access.json"
};
const source = Object.fromEntries(await Promise.all(
  Object.entries(files).map(async ([key, file]) => [key, await readFile(path.join(root, file), "utf8")])
));
const failures = [];
const requirePattern = (key, pattern, message) => { if (!pattern.test(source[key])) failures.push(message); };
const rejectPattern = (key, pattern, message) => { if (pattern.test(source[key])) failures.push(message); };

requirePattern("route", /requirePilotIdentity\(request\)[\s\S]*authorize\(request, "analysis\.run"\)[\s\S]*readBoundedJson\(request, POINT_OBJECT_CLOUD_BODY_BYTES\)/,
  "PUT must authenticate, authorize the server-owned scope and pass gates before reading the body");
requirePattern("route", /requirePilotMutationOrigin\(request\)/, "PUT same-origin guard is missing");
requirePattern("route", /POINT_OBJECT_CLOUD_PAGE_SIZE/, "GET page bound is missing");
requirePattern("route", /privateNoStoreJson/, "private artifact responses are not no-store");
requirePattern("route", /outcome: receipt\.status[\s\S]*cloudRevision:[\s\S]*payloadHash:[\s\S]*immutableHash:/,
  "PUT success does not expose the frozen flat receipt DTO");
rejectPattern("route", /searchParams\.get\(["']projectKey["']\)/, "route accepts client-selected authorization scope");

requirePattern("contract", /parseSavedPointObjectArtifact/, "current artifact parser is not reused");
requirePattern("contract", /artifact\.payloadHash !== await hashPointObjectCloudFullArtifact/, "full local artifact hash is not recomputed and matched");
requirePattern("contract", /delete session\.shortlist[\s\S]*delete session\.comparisonOpen[\s\S]*delete session\.comparisonView[\s\S]*delete session\.analysisTargetSourceFeatureId/,
  "Find mutable view projection is incomplete");
requirePattern("contract", /delete payload\.activeAlternativeId/, "Create mutable view projection is incomplete");
requirePattern("contract", /POINT_OBJECT_CLOUD_BODY_BYTES = 832 \* 1024/, "request body limit drifted");

requirePattern("repository", /GEOAI_POINT_OBJECT_PREVIEW_PROJECT_KEY/, "server-owned Preview project key is missing");
requirePattern("repository", /authorizePointObjectAnalysis/, "request-scoped project authorization is not reused");
requirePattern("repository", /schema\("api"\)\.rpc\("put_point_object_project_artifact"/, "put RPC facade is missing");
requirePattern("repository", /schema\("api"\)\.rpc\("list_point_object_project_artifacts"/, "list RPC facade is missing");
rejectPattern("repository", /SUPABASE_SERVICE_ROLE_KEY|service_role|\.from\(["']point_object_project_artifacts/, "repository bypasses the caller-scoped RPC facade");

requirePattern("migration", /create table public\.point_object_project_artifacts/, "additive artifact table is missing");
requirePattern("migration", /unique \(project_id, created_by, artifact_id\)/, "artifact idempotency is not creator-scoped");
requirePattern("migration", /unique \(project_id, created_by, idempotency_key\)/, "operation idempotency is not creator-scoped");
requirePattern("migration", /alter table public\.point_object_project_artifacts force row level security/, "FORCE RLS is missing");
requirePattern("migration", /point_object_artifact_projections\(target_artifact jsonb\)[\s\S]*fixed_payload[\s\S]*immutable_json := jsonb_set/,
  "SQL does not derive the immutable projection from artifact JSON");
requirePattern("migration", /saved\.immutable_json <> incoming_immutable/, "CAS does not compare server-derived immutable JSON directly");
requirePattern("migration", /target_expected_cloud_revision is distinct from saved\.cloud_revision[\s\S]*incoming_view_revision <> saved\.view_revision \+ 1/,
  "CAS revision checks are incomplete");
requirePattern("migration", /saved\.payload_hash = incoming_payload_hash[\s\S]*outcome := 'replayed'/,
  "exact/lost-response replay path is missing");
requirePattern("migration", /pg_advisory_xact_lock[\s\S]*point-object-artifact:[\s\S]*pg_advisory_xact_lock[\s\S]*point-object-idempotency:/,
  "actor-scoped concurrent replay locks are missing");
requirePattern("migration", /least\(greatest\(coalesce\(target_limit, 4\), 1\), 4\)/, "database list page is not hard-bounded to four");
requirePattern("migration", /\(artifact\.created_at, artifact\.id\) < \(target_before_created_at, target_before_id\)/, "stable keyset cursor is missing");
requirePattern("migration", /revoke all on table public\.point_object_project_artifacts from public, anon, authenticated, service_role/, "direct table grants are not closed");
rejectPattern("migration", /target_immutable_hash|target_payload_hash/, "RPC trusts a caller-supplied invariant hash");
rejectPattern("migration", /delete\s+from\s+public\.|truncate\s+(?:table\s+)?public\./i, "migration contains destructive existing-data SQL");

requirePattern("personas", /select extensions\.plan\(30\)/, "pgTAP plan drifted");
requirePattern("personas", /second creator may reuse browser-local keys without collision/, "two-creator collision coverage is missing");
requirePattern("personas", /Analyse completed result is immutable/, "Analyse immutable-result negative is missing");
requirePattern("personas", /Find completed result mutation is detected inside SQL/, "Find immutable-result negative is missing");
requirePattern("personas", /Create generated result mutation is detected inside SQL/, "Create immutable-result negative is missing");
requirePattern("personas", /stale expected revision fails closed/, "stale CAS coverage is missing");

requirePattern("deactivation", /Intentionally retained[\s\S]*public\.point_object_project_artifacts[\s\S]*all existing rows/, "deactivation does not explicitly retain table data");
rejectPattern("deactivation", /delete\s+from|truncate\s+(?:table\s+)?public\.point_object_project_artifacts|drop table/i, "deactivation destroys retained artifact data");

const inventory = JSON.parse(source.inventory);
const declared = inventory.routes?.["/api/prototype/point-to-object/project-artifacts"];
if (declared?.GET?.action !== "analysis.read" || declared?.PUT?.action !== "analysis.run" || declared?.PUT?.preAuthMutation !== true) {
  failures.push("API route inventory does not declare read/run and pre-auth mutation behavior");
}

if (failures.length) {
  console.error("Point-object cloud persistence contract failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Point-object cloud persistence contract passed: Preview-gated, server-scoped, creator-private, CAS/replay bounded, SQL-derived immutable invariants, no direct table grants or destructive rollback.");
