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
requirePattern("route", /reason: receipt\.conflictReason[\s\S]*current: receipt\.id === null \? null/,
  "PUT conflict does not distinguish a missing/split current row from a real current row");
rejectPattern("route", /searchParams\.get\(["']projectKey["']\)/, "route accepts client-selected authorization scope");

requirePattern("contract", /parseSavedPointObjectArtifact/, "current artifact parser is not reused");
requirePattern("contract", /artifact\.payloadHash !== await hashPointObjectCloudFullArtifact/, "full local artifact hash is not recomputed and matched");
requirePattern("contract", /delete session\.shortlist[\s\S]*delete session\.comparisonOpen[\s\S]*delete session\.comparisonView[\s\S]*delete session\.analysisTargetSourceFeatureId/,
  "Find mutable view projection is incomplete");
requirePattern("contract", /delete payload\.activeAlternativeId/, "Create mutable view projection is incomplete");
requirePattern("contract", /POINT_OBJECT_CLOUD_BODY_BYTES = 832 \* 1024/, "request body limit drifted");
requirePattern("contract", /POINT_OBJECT_CLOUD_OPERATION_BYTES = 768 \* 1024[\s\S]*TextEncoder[\s\S]*JSON\.stringify\(operation\)/,
  "browser operation and raw-body byte limits are not independently enforced");
requirePattern("contract", /PointObjectCloudConflictReason[\s\S]*split_key[\s\S]*stale_view_revision/,
  "bounded conflict reasons are not frozen in the receipt contract");
requirePattern("contract", /const absentCurrent = value\.id === null[\s\S]*value\.clientPayloadHash === null/,
  "receipt parser accepts an invented current row for a missing/split conflict");
requirePattern("contract", /reasonHasNoCurrent = value\.conflictReason === "split_key" \|\| value\.conflictReason === "missing"[\s\S]*reasonHasNoCurrent \? absentCurrent : validCurrent/,
  "receipt parser does not bind no-current conflict reasons to an absent current row");

requirePattern("repository", /GEOAI_POINT_OBJECT_PREVIEW_PROJECT_KEY/, "server-owned Preview project key is missing");
requirePattern("repository", /VERCEL_ENV\?\.trim\(\) === "production"[\s\S]*GEOAI_POINT_OBJECT_PRODUCTION_PROJECT_KEY[\s\S]*GEOAI_POINT_OBJECT_PREVIEW_PROJECT_KEY/, "Production must select its own server scope without Preview fallback");
requirePattern("repository", /authorizePointObjectAnalysis/, "request-scoped project authorization is not reused");
requirePattern("repository", /schema\("api"\)\.rpc\("put_point_object_project_artifact"/, "put RPC facade is missing");
requirePattern("repository", /schema\("api"\)\.rpc\("list_point_object_project_artifacts"/, "list RPC facade is missing");
requirePattern("repository", /error\?\.code === "54000"[\s\S]*storage capacity/, "bounded-capacity SQL error is not mapped safely");
rejectPattern("repository", /SUPABASE_SERVICE_ROLE_KEY|service_role|\.from\(["']point_object_project_artifacts/, "repository bypasses the caller-scoped RPC facade");

requirePattern("migration", /create table public\.point_object_project_artifacts/, "additive artifact table is missing");
requirePattern("migration", /unique \(project_id, created_by, artifact_id\)/, "artifact idempotency is not creator-scoped");
requirePattern("migration", /unique \(project_id, created_by, idempotency_key\)/, "operation idempotency is not creator-scoped");
requirePattern("migration", /alter table public\.point_object_project_artifacts force row level security/, "FORCE RLS is missing");
requirePattern("migration", /create table geoai_private\.point_object_artifact_scope_config[\s\S]*enabled boolean not null default false/,
  "private default-disabled rollout scope is missing");
requirePattern("migration", /force row level security;[\s\S]*revoke all on table geoai_private\.point_object_artifact_scope_config[\s\S]*service_role/,
  "rollout scope is exposed to a browser-capable role");
requirePattern("migration", /point_object_artifact_scope_config_postgres_all[\s\S]*for all to postgres[\s\S]*with check \(true\)/,
  "rollout scope does not have an explicit postgres-only RLS operator path");
requirePattern("migration", /function geoai_private\.put_point_object_project_artifact[\s\S]*point object artifact scope unavailable[\s\S]*function geoai_private\.list_point_object_project_artifacts[\s\S]*point object artifact scope unavailable/,
  "both RPC implementations must fail closed on a disabled or wrong rollout scope");
requirePattern("migration", /point_object_artifact_projections\(target_artifact jsonb\)[\s\S]*fixed_payload[\s\S]*immutable_json := jsonb_set/,
  "SQL does not derive the immutable projection from artifact JSON");
requirePattern("migration", /saved\.immutable_json <> incoming_immutable/, "CAS does not compare server-derived immutable JSON directly");
requirePattern("migration", /target_expected_cloud_revision is distinct from saved\.cloud_revision[\s\S]*incoming_view_revision > saved\.view_revision/,
  "CAS does not require the exact expected cloud revision and a monotonic view successor");
requirePattern("migration", /saved\.payload_hash = incoming_payload_hash[\s\S]*saved\.artifact_json = target_artifact_json[\s\S]*saved\.local_project = target_local_project[\s\S]*outcome := 'replayed'/,
  "exact/lost-response replay path is missing");
requirePattern("migration", /point-object-actor-quota:[\s\S]*point-object-artifact:[\s\S]*point-object-idempotency:/,
  "actor quota and key locks are missing or ordered inconsistently");
requirePattern("migration", /actor_artifact_count >= 600[\s\S]*local_project_artifact_count >= 30[\s\S]*actor_local_project_count >= 20[\s\S]*8388608/,
  "transactional actor/project count and byte quotas are incomplete");
requirePattern("migration", /octet_length\(target_artifact_json::text\) > 917504/,
  "SQL JSONB envelope limit is not explicit and representation-aware");
requirePattern("migration", /jsonb_typeof\(mutable_payload -> 'selection'\)[\s\S]*jsonb_typeof\(mutable_payload -> 'session'\)[\s\S]*jsonb_typeof\(mutable_payload -> 'generated'\)/,
  "SQL does not enforce security-critical per-kind payload shape");
requirePattern("migration", /'conflictReason', 'split_key'[\s\S]*'payloadHash', null/,
  "split-key conflict still fabricates a current row or hash");
requirePattern("migration", /least\(greatest\(coalesce\(target_limit, 4\), 1\), 4\)/, "database list page is not hard-bounded to four");
requirePattern("migration", /\(artifact\.created_at, artifact\.id\) < \(target_before_created_at, target_before_id\)/, "stable keyset cursor is missing");
requirePattern("migration", /revoke all on table public\.point_object_project_artifacts from public, anon, authenticated, service_role/, "direct table grants are not closed");
rejectPattern("migration", /target_immutable_hash|target_payload_hash/, "RPC trusts a caller-supplied invariant hash");
rejectPattern("migration", /delete\s+from\s+public\.|truncate\s+(?:table\s+)?public\./i, "migration contains destructive existing-data SQL");

requirePattern("personas", /select extensions\.plan\(62\)/, "pgTAP plan drifted");
requirePattern("personas", /second creator may reuse browser-local keys without collision/, "two-creator collision coverage is missing");
requirePattern("personas", /Analyse completed result is immutable/, "Analyse immutable-result negative is missing");
requirePattern("personas", /Find completed result mutation is detected inside SQL/, "Find immutable-result negative is missing");
requirePattern("personas", /Create generated result mutation is detected inside SQL/, "Create immutable-result negative is missing");
requirePattern("personas", /stale expected revision fails closed/, "stale CAS coverage is missing");
requirePattern("personas", /disabled scope denies list[\s\S]*wrong project cannot select another scope/, "disabled/wrong-scope coverage is missing");
requirePattern("personas", /changed local project name is not misclassified as replay/, "renamed local-project replay coverage is missing");
requirePattern("personas", /split-key conflict does not invent a current row id/, "split-key no-current coverage is missing");
requirePattern("personas", /created-at-only cursor is rejected[\s\S]*adjacent keyset pages do not overlap/, "cursor and pagination coverage is incomplete");
requirePattern("personas", /exact SQL JSONB byte ceiling is accepted[\s\S]*one byte over the SQL JSONB ceiling is rejected/, "true SQL size-boundary fixtures are missing");
requirePattern("personas", /thirty-first artifact[\s\S]*twenty-first local project[\s\S]*bounded-byte quota/, "count and byte quota coverage is incomplete");
requirePattern("personas", /old JWT cannot list[\s\S]*old JWT cannot put/, "banned-account old-JWT coverage is missing");

requirePattern("deactivation", /Intentionally retained[\s\S]*public\.point_object_project_artifacts[\s\S]*all existing rows/, "deactivation does not explicitly retain table data");
requirePattern("deactivation", /update geoai_private\.point_object_artifact_scope_config[\s\S]*enabled = false[\s\S]*drop function if exists/,
  "deactivation does not idempotently close the private rollout scope first");
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

console.log("Point-object cloud persistence contract passed: environment-gated, server-scoped, creator-private, CAS/replay bounded, SQL-derived immutable invariants, no direct table grants or destructive rollback.");
