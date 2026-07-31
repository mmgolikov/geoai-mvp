#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const EXACT_CAVEAT =
  "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.";

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
  pass(`${label} is consistent`);
  return true;
}

function requireMarkdownValue(markdown, label, value) {
  if (!markdown.includes(String(value))) {
    fail(`CURRENT_RELEASE_STATE.md does not contain ${label}: ${value}`);
  } else {
    pass(`CURRENT_RELEASE_STATE.md contains ${label}`);
  }
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
      requireString(candidate.branch, `active_candidates[${index}].branch`);
      requireString(candidate.classification, `active_candidates[${index}].classification`);
      if (candidate.branch === github?.default_branch) {
        fail(`Candidate ${candidate.name} uses the production/default branch`);
      }
      if (!candidate.classification.includes("not_production")) {
        fail(`Candidate ${candidate.name} is not explicitly classified as not_production`);
      }
      if (candidate.classification === "released") {
        fail(`Candidate ${candidate.name} is incorrectly marked released`);
      }
    }
    pass("All active candidates are separated from Production");
  }

  const protectedActions = registry.protected_actions ?? {};
  for (const [action, authorised] of Object.entries(protectedActions)) {
    if (authorised !== false) fail(`Protected action ${action} must remain false in this CR`);
  }
  pass("Protected actions remain disabled");

  const figma = registry.design_authority;
  requireString(figma?.file_key, "Figma file key");
  for (const key of [
    "executable_start_here",
    "executable_prototype",
    "runtime_alignment",
    "delivery_cockpit",
  ]) {
    requireString(figma?.nodes?.[key], `Figma node ${key}`);
  }

  const confluencePages = registry.confluence_authority?.pages ?? {};
  for (const key of [
    "project_home",
    "current_delivery_state",
    "governance",
    "change_log",
    "artifact_registry",
    "agent_operating_mode",
    "control_plane_change_request",
  ]) {
    requireString(confluencePages[key], `Confluence page ${key}`);
  }

  const supabase = registry.environments?.supabase_development;
  if ((supabase?.migration_count ?? 0) < 1) fail("Supabase migration_count must be positive");
  if ((supabase?.source_registry_snapshot_count ?? 0) < 1) fail("Supabase source registry must not be empty");
  if ((supabase?.external_data_snapshot_count ?? 0) < 1) fail("Supabase external snapshot registry must not be empty");
  requireEqual(supabase?.dld_foundation?.estimated_payload_rows, 0, "DLD payload row boundary");
  requireEqual(supabase?.dld_foundation?.official_or_live_integration, false, "DLD official/live integration boundary");

  const verifiedAtMs = Date.parse(registry.verified_at);
  if (Number.isNaN(verifiedAtMs)) {
    fail("registry.verified_at must be an ISO-8601 timestamp");
  } else {
    const ageHours = (Date.now() - verifiedAtMs) / 3_600_000;
    const ttl = registry.freshness_policy?.production_and_open_prs_ttl_hours ?? 24;
    if (ageHours > ttl) {
      warn(`Registry production/open-PR evidence is ${Math.floor(ageHours)} hours old; refresh primary sources before a protected action`);
    } else {
      pass("Registry is within the production/open-PR freshness TTL");
    }
  }
}

if (policy) {
  requireEqual(policy.schemaVersion, "1.0", "release policy schema version");
  requireEqual(policy.repositoryRole, "policy_schema_and_historical_evidence", "release policy repository role");
  requireEqual(policy.currentOperationalAuthority, "external_post_release_evidence", "release policy current authority boundary");
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

console.log("GeoAI control-plane audit");
console.log(`PASS: ${passes.length}`);
for (const message of passes) console.log(`  ✓ ${message}`);
console.log(`WARN: ${warnings.length}`);
for (const message of warnings) console.warn(`  ! ${message}`);
console.log(`FAIL: ${errors.length}`);
for (const message of errors) console.error(`  ✗ ${message}`);

if (errors.length > 0) process.exit(1);
