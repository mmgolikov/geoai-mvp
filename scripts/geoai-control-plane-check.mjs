#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const EXACT_CAVEAT =
  "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";
const REQUIRED_EXTERNAL_SYSTEMS = [
  "github",
  "vercel",
  "supabase",
  "figma",
  "confluence",
  "google_drive",
];
const REQUIRED_FIGMA_NODES = [
  "1797:2",
  "1482:2",
  "1749:21157",
  "1819:11",
  "1825:11",
];
const FORBIDDEN_FIGMA_NODES = ["1670:2", "1673:2"];
const MOSCOW_M0_SHA = "bd90887c8de10b5ffa85ed6b8adfa1d93f70d316";
const MOSCOW_DEV_SHA = "722e5166f37168ddaa8ccb7bf83bfcb6c9681b4e";

const files = {
  registry: path.join(ROOT, "docs/GEOAI_PROJECT_REGISTRY_V1.json"),
  snapshot: path.join(ROOT, "docs/LAST_VERIFIED_RELEASE_SNAPSHOT.json"),
  current: path.join(ROOT, "docs/CURRENT_RELEASE_STATE.md"),
  policy: path.join(ROOT, "docs/RELEASE_AUTHORITY_POLICY.json"),
};

const errors = [];
const warnings = [];
const passes = [];

function fail(message) {
  errors.push(message);
}

function warn(message) {
  warnings.push(message);
}

function pass(message) {
  passes.push(message);
}

function readText(file, label) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch (error) {
    fail(`${label} is missing or unreadable: ${error.message}`);
    return "";
  }
}

function readJson(file, label) {
  const text = readText(file, label);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (error) {
    fail(`${label} contains invalid JSON: ${error.message}`);
    return null;
  }
}

function requireString(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    fail(`${label} must be a non-empty string`);
    return false;
  }
  return true;
}

function requireEqual(actual, expected, label) {
  if (actual !== expected) {
    fail(`${label} mismatch: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
    return false;
  }
  pass(`${label} is internally consistent`);
  return true;
}

function requireMarkdownValue(markdown, label, value) {
  if (!markdown.includes(String(value))) {
    fail(`CURRENT_RELEASE_STATE.md does not contain ${label}: ${value}`);
  } else {
    pass(`CURRENT_RELEASE_STATE.md contains ${label}`);
  }
}

function sorted(values) {
  return [...values].sort();
}

const registry = readJson(files.registry, "project registry");
const snapshot = readJson(files.snapshot, "verified release snapshot");
const current = readText(files.current, "current release state");
const policy = readJson(files.policy, "release authority policy");

if (registry && snapshot) {
  const production = registry.environments?.production;
  const github = production?.github;
  const vercel = production?.vercel;

  requireString(registry.schema_version, "registry.schema_version");
  requireString(registry.verified_at, "registry.verified_at");
  requireString(github?.repository, "registry production repository");
  requireString(github?.commit_sha, "registry production commit SHA");
  requireString(vercel?.deployment_id, "registry production deployment ID");

  requireEqual(snapshot.mainSha, github?.commit_sha, "production commit SHA");
  requireEqual(snapshot.mergedPullRequest, github?.merged_pull_request, "production pull request");
  requireEqual(snapshot.productionDeploymentId, vercel?.deployment_id, "production deployment ID");
  requireEqual(snapshot.productionStatus, vercel?.deployment_state, "production deployment state");
  requireEqual(snapshot.currentOperationalAuthority, false, "historical snapshot current-authority boundary");
  requireEqual(snapshot.realSourcesActive, false, "historical snapshot real-source boundary");

  requireMarkdownValue(current, "production commit SHA", github?.commit_sha);
  requireMarkdownValue(current, "production pull request", `#${github?.merged_pull_request}`);
  requireMarkdownValue(current, "production deployment ID", vercel?.deployment_id);

  if (registry.data_honesty?.mandatory_statement !== EXACT_CAVEAT) {
    fail("Registry mandatory data-honesty statement is missing or altered");
  } else {
    pass("Registry mandatory data-honesty statement is exact");
  }
  if (!current.includes(EXACT_CAVEAT)) {
    fail("CURRENT_RELEASE_STATE.md is missing the exact data-honesty statement");
  } else {
    pass("Current release state contains the exact data-honesty statement");
  }

  const candidates = registry.active_candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) {
    fail("Registry must contain active_candidates");
  } else {
    for (const [index, candidate] of candidates.entries()) {
      requireString(candidate.name, `active_candidates[${index}].name`);
      requireString(candidate.classification, `active_candidates[${index}].classification`);
      if (!candidate.classification.includes("not_production")) {
        fail(`Candidate ${candidate.name} is not explicitly classified as not_production`);
      }
      if (candidate.classification === "released") {
        fail(`Candidate ${candidate.name} is incorrectly marked released`);
      }
    }
    pass("All active candidates are separated from Production");
  }

  const moscow = candidates?.find((candidate) => candidate.name.includes("Rosimushchestvo"));
  requireEqual(moscow?.m0_authority?.branch, "pilot/rosimushchestvo-moscow-v1", "Moscow M0 branch");
  requireEqual(moscow?.m0_authority?.head_sha, MOSCOW_M0_SHA, "Moscow M0 head");
  requireEqual(moscow?.implementation_prototype?.branch, "pilot/rosimushchestvo-moscow-v1-dev", "Moscow implementation branch");
  requireEqual(moscow?.implementation_prototype?.head_sha, MOSCOW_DEV_SHA, "Moscow implementation head");
  requireEqual(moscow?.implementation_prototype?.base_sha, MOSCOW_M0_SHA, "Moscow implementation base");
  requireEqual(moscow?.implementation_prototype?.ahead_by, 2, "Moscow branch ahead count");
  requireEqual(moscow?.implementation_prototype?.behind_by, 0, "Moscow branch behind count");
  requireEqual(moscow?.implementation_prototype?.merged, false, "Moscow merge boundary");
  requireEqual(moscow?.implementation_prototype?.production, false, "Moscow Production boundary");

  const protectedActions = registry.protected_actions ?? {};
  for (const [action, authorised] of Object.entries(protectedActions)) {
    if (authorised !== false) fail(`Protected action ${action} must remain false in this CR`);
  }
  pass("Protected actions remain disabled");

  const figma = registry.design_authority;
  requireString(figma?.file_key, "Figma file key");
  const verifiedFigmaNodes = Object.values(figma?.verified_nodes ?? {});
  requireEqual(
    JSON.stringify(sorted(verifiedFigmaNodes)),
    JSON.stringify(sorted(REQUIRED_FIGMA_NODES)),
    "Figma verified authority allow-list",
  );
  requireEqual(
    JSON.stringify(sorted(figma?.absent_nodes ?? [])),
    JSON.stringify(sorted(FORBIDDEN_FIGMA_NODES)),
    "Figma absent-node deny-list",
  );
  requireEqual(figma?.metrics?.prototype_screens?.value, 68, "Figma prototype-screen metric");
  requireEqual(figma?.metrics?.component_sets?.value, 35, "Figma component-set metric");
  requireEqual(figma?.metrics?.component_variants?.value, 368, "Figma component-variant metric");
  requireEqual(figma?.metrics?.authored_reactions?.value, 114, "Figma authored-reaction metric");
  requireEqual(figma?.metrics?.component_sets?.authority_page, "68:3", "Figma component metric authority page");
  requireEqual(figma?.runtime_implementation_proven_by_figma, false, "Figma/runtime proof boundary");

  const confluencePages = registry.confluence_authority?.pages ?? {};
  for (const key of [
    "project_home",
    "current_delivery_state",
    "governance",
    "change_log",
    "artifact_registry",
    "agent_operating_mode",
    "control_plane_change_request",
    "integrated_operating_baseline",
    "core_mvp_boundary",
  ]) {
    requireString(confluencePages[key], `Confluence page ${key}`);
  }
  if (!registry.confluence_authority?.search_snippet_rule?.includes("Discovery only")) {
    fail("Confluence search-snippet safety rule is missing");
  } else {
    pass("Confluence direct-page authority rule is present");
  }

  const supabase = registry.environments?.supabase_development;
  const snapshotSupabase = snapshot.hostedSupabaseState?.development;
  if ((supabase?.migration_count ?? 0) < 1) fail("Supabase migration_count must be positive");
  if ((supabase?.source_registry_snapshot_count ?? 0) < 1) fail("Supabase source registry must not be empty");
  if ((supabase?.external_data_snapshot_count ?? 0) < 1) fail("Supabase external snapshot registry must not be empty");

  requireEqual(snapshotSupabase?.migrationLedgerEntries, supabase?.migration_count, "Supabase migration count");
  requireEqual(snapshotSupabase?.latestMigration, supabase?.latest_migration, "Supabase latest migration");
  requireEqual(snapshotSupabase?.publicBaseTables, supabase?.public_base_table_count, "Supabase public table count");
  requireEqual(snapshotSupabase?.confirmedAuthUsers, supabase?.auth_user_count, "Supabase Auth user count");
  requireEqual(snapshotSupabase?.sourceRegistrySnapshotRows, supabase?.source_registry_snapshot_count, "Supabase source-registry count");
  requireEqual(snapshotSupabase?.externalDataSnapshotRows, supabase?.external_data_snapshot_count, "Supabase external-snapshot count");
  requireEqual(snapshotSupabase?.dldFoundationTables, supabase?.dld_foundation?.tables?.length, "DLD table count");
  requireEqual(snapshotSupabase?.dldRlsEnabledOnAllTables, supabase?.dld_foundation?.rls_enabled_on_all_tables, "DLD RLS boundary");
  requireEqual(snapshotSupabase?.dldPolicyCountPerTable, supabase?.dld_foundation?.policy_count_per_table, "DLD policy-count boundary");
  requireEqual(snapshotSupabase?.dldEstimatedPayloadRows, supabase?.dld_foundation?.estimated_payload_rows, "DLD payload row boundary");
  requireEqual(snapshotSupabase?.dldOfficialOrLiveIntegration, supabase?.dld_foundation?.official_or_live_integration, "DLD official/live integration boundary");

  requireMarkdownValue(current, "Supabase latest migration", supabase?.latest_migration);
  requireMarkdownValue(current, "Supabase source-registry count", supabase?.source_registry_snapshot_count);
  requireMarkdownValue(current, "Supabase external-snapshot count", supabase?.external_data_snapshot_count);
  requireMarkdownValue(current, "Supabase Auth user count", supabase?.auth_user_count);
  requireMarkdownValue(current, "DLD zero-policy boundary", "zero policies");
  requireMarkdownValue(current, "DLD zero-payload boundary", "zero payload rows");

  requireEqual(registry.google_drive?.decision_authority, false, "Google Drive decision-authority boundary");
  requireEqual(registry.google_drive?.duplicate_authority_detected, false, "Google Drive duplicate-authority boundary");
  requireEqual(registry.internal_validation?.queries_live_external_systems, false, "internal validator live-query boundary");
  requireEqual(registry.internal_validation?.proves_external_truth, false, "internal validator external-truth boundary");
  requireEqual(registry.internal_validation?.automatic_merge_recommendation, false, "internal validator merge-recommendation boundary");
  requireEqual(registry.external_truth_gate?.green_internal_check_satisfies_gate, false, "external Truth Gate independence");
  requireEqual(registry.external_truth_gate?.required_before_founder_merge_review, true, "external Truth Gate merge-review boundary");
  requireEqual(
    JSON.stringify(sorted(registry.external_truth_gate?.required_systems ?? [])),
    JSON.stringify(sorted(REQUIRED_EXTERNAL_SYSTEMS)),
    "external Truth Gate system set",
  );

  const verifiedAtMs = Date.parse(registry.verified_at);
  if (Number.isNaN(verifiedAtMs)) {
    fail("registry.verified_at must be an ISO-8601 timestamp");
  } else {
    const ageHours = (Date.now() - verifiedAtMs) / 3_600_000;
    const ttl = registry.freshness_policy?.production_and_open_prs_ttl_hours ?? 24;
    if (ageHours > ttl) {
      warn(`Registry production/open-PR evidence is ${Math.floor(ageHours)} hours old; refresh primary sources before any decision`);
    } else {
      pass("Registry is within the production/open-PR freshness TTL");
    }
  }
}

if (policy) {
  requireEqual(policy.schemaVersion, "1.0", "release policy schema version");
  requireEqual(policy.repositoryRole, "policy_schema_and_historical_evidence", "release policy repository role");
  requireEqual(policy.currentOperationalAuthority, "external_post_release_evidence", "release policy current authority boundary");
  requireEqual(policy.repositoryCiCapabilities?.validatesExternalTruth, false, "repository CI external-truth boundary");
  requireEqual(policy.repositoryCiCapabilities?.mayRecommendMergeAutomatically, false, "repository CI merge-recommendation boundary");
  requireEqual(policy.externalTruthGate?.greenRepositoryCiSatisfiesGate, false, "policy external Truth Gate independence");
  requireEqual(policy.externalTruthGate?.requiredBeforeFounderMergeReview, true, "policy founder merge-review gate");
  requireEqual(policy.confluenceReadSafety?.searchSnippetsAreDiscoveryOnly, true, "Rovo search discovery boundary");
  requireEqual(policy.confluenceReadSafety?.directCurrentPageVersionAndBodyAreAuthoritative, true, "Confluence direct-read authority");
  if (policy.productionActionRequiresExplicitApproval !== true) {
    fail("Release policy must require explicit Production action approval");
  } else {
    pass("Release policy preserves explicit Production approval");
  }
  if (policy.requiredCaveat !== EXACT_CAVEAT) {
    fail("Release policy required caveat is missing or altered");
  } else {
    pass("Release policy caveat is exact");
  }
}

console.log("GeoAI control-plane internal consistency audit");
console.log("SCOPE: repository schema, boundary and cross-file consistency only");
console.log("EXTERNAL TRUTH: UNVERIFIED until fresh direct read-back receipts exist for GitHub, Vercel, Supabase, Figma, Confluence and Google Drive");
console.log("MERGE: no automatic recommendation or authorisation");
console.log(`PASS: ${passes.length}`);
for (const message of passes) console.log(`  ✓ ${message}`);
console.log(`WARN: ${warnings.length}`);
for (const message of warnings) console.warn(`  ! ${message}`);
console.log(`FAIL: ${errors.length}`);
for (const message of errors) console.error(`  ✗ ${message}`);

if (errors.length > 0) process.exit(1);
