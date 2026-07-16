import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import process from "node:process";

const root = process.cwd();
const exactMain = "2999e7e857989baf53ce58ecfed63550b5896be0";
const productionDeployment = "dpl_EAXREH31JKznnGbQYEU8bNqTqagN";

const activeDocs = [
  "README.md",
  "CHANGELOG.md",
  "docs/DOCUMENTATION_INDEX.md",
  "docs/CURRENT_RELEASE_STATE.md",
  "docs/FULL_SYSTEM_AUDIT_2026_07_16.md",
  "docs/CODEX_BACKLOG_2026_07_16.md",
  "docs/architecture.md",
  "docs/data-strategy.md",
  "docs/roadmap.md",
  "docs/qa-checklist.md",
  "AGENTS.md",
  "docs/SUPABASE_DATA_API_CONTAINMENT_RUNBOOK_2026_07_16.md"
];

const releaseFactDocs = [
  "docs/DOCUMENTATION_INDEX.md",
  "docs/CURRENT_RELEASE_STATE.md",
  "docs/FULL_SYSTEM_AUDIT_2026_07_16.md",
  "docs/roadmap.md",
  "README.md",
  "AGENTS.md"
];

const supersededOperationalDocs = [
  "docs/SUPABASE_PILOT_ACTIVATION.md",
  "docs/PILOT_INFRASTRUCTURE_ACTIVATION_V24.md",
  "docs/PILOT_BACKEND_ACTIVATION_HARDENING_V29.md",
  "docs/SUPABASE_POSTGIS_DURABLE_PERSISTENCE_V23.md",
  "docs/SUPABASE_POSTGIS_V01.md",
  "docs/PERSISTENCE_V01.md",
  "docs/SECURE_FILE_STORAGE_EVIDENCE_UPLOADS_V26.md",
  "docs/EVIDENCE_REVIEW_SIGNED_URL_VERIFICATION_V27.md",
  "docs/AUTH_PROJECT_ACCESS_FOUNDATION_V22.md"
];

const activeDocForbiddenClaims = [
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "publishable/legacy anon key",
  "supabase/migrations/20260624_geoai_pilot_persistence_foundation.sql",
  "supabase/migrations/20260624_geoai_storage_buckets_policies.sql",
  "supabase/migrations/20260618_0004_projects_workspaces.sql",
  "78 performance findings (60",
  "76 performance findings (58",
  "caller-JWT kernel is intentionally not implemented",
  "code still lacks the user-context kernel"
];

const failures = [];

function read(relativePath) {
  const absolutePath = resolve(root, relativePath);
  if (!existsSync(absolutePath)) {
    failures.push(`${relativePath}: required file is missing`);
    return "";
  }
  return readFileSync(absolutePath, "utf8");
}

function githubHeadingSlug(value) {
  return value
    .replace(/<[^>]+>/g, "")
    .replace(/!?(?:\[([^\]]*)\])\([^)]+\)/g, "$1")
    .replace(/[`*_~]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .replace(/\s/g, "-");
}

function markdownAnchors(content) {
  const anchors = new Set();
  const occurrences = new Map();
  for (const line of content.split(/\r?\n/)) {
    const heading = line.match(/^#{1,6}\s+(.+?)\s*#*\s*$/)?.[1];
    if (heading) {
      const base = githubHeadingSlug(heading);
      if (base) {
        const count = occurrences.get(base) ?? 0;
        occurrences.set(base, count + 1);
        anchors.add(count === 0 ? base : `${base}-${count}`);
      }
    }
    for (const explicit of line.matchAll(/<(?:a\s+[^>]*?(?:id|name)|[^>]+\s+id)=["']([^"']+)["'][^>]*>/gi)) {
      anchors.add(explicit[1]);
    }
  }
  return anchors;
}

function decodedFragment(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

for (const relativePath of activeDocs) {
  const content = read(relativePath);
  if (!/^Status:\s+/m.test(content)) {
    failures.push(`${relativePath}: active document has no Status field`);
  }
  if (!/^Last verified:\s+2026-07-16\s*$/m.test(content)) {
    failures.push(`${relativePath}: active document is not explicitly verified on 2026-07-16`);
  }
  for (const field of ["Owner", "Authority", "Successor"]) {
    if (!new RegExp(`^${field}:\\s+\\S`, "m").test(content)) {
      failures.push(`${relativePath}: active document has no ${field} field`);
    }
  }
  if (relativePath !== "CHANGELOG.md" && /PR #(?:81|83)\b/.test(content)) {
    failures.push(`${relativePath}: stale PR #81/#83 appears in current authority`);
  }
  for (const forbidden of activeDocForbiddenClaims) {
    if (content.includes(forbidden)) {
      failures.push(`${relativePath}: prohibited current operational claim remains: ${forbidden}`);
    }
  }

  for (const match of content.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    const target = match[1].trim();
    if (/^(?:https?:|mailto:)/.test(target)) continue;
    const hashIndex = target.indexOf("#");
    const fileTarget = hashIndex >= 0 ? target.slice(0, hashIndex) : target;
    const fragment = hashIndex >= 0 ? decodedFragment(target.slice(hashIndex + 1)) : "";
    const linkedPath = fileTarget
      ? resolve(root, dirname(relativePath), fileTarget)
      : resolve(root, relativePath);
    if (!existsSync(linkedPath)) {
      failures.push(`${relativePath}: broken local link ${target}`);
      continue;
    }
    if (fragment) {
      const linkedContent = readFileSync(linkedPath, "utf8");
      if (!markdownAnchors(linkedContent).has(fragment)) {
        failures.push(`${relativePath}: broken local anchor ${target}`);
      }
    }
  }
}

for (const relativePath of supersededOperationalDocs) {
  const content = read(relativePath);
  if (!content.includes("**Superseded — do not use operationally.**")) {
    failures.push(`${relativePath}: dangerous historical operational guidance has no superseded banner`);
  }
  if (!content.includes("CURRENT_RELEASE_STATE.md") && !content.includes("SUPABASE_DATA_API_CONTAINMENT_RUNBOOK_2026_07_16.md") && !content.includes("CODEX_BACKLOG_2026_07_16.md")) {
    failures.push(`${relativePath}: superseded operational guidance has no current successor link`);
  }
}

const dbBaseline = read("docs/SUPABASE_DB_BASELINE_V1.md");
for (const required of ["Historical ledger correction", "20260708132308", "20260708132343", "migration-ledger-baseline.json"]) {
  if (!dbBaseline.includes(required)) failures.push(`docs/SUPABASE_DB_BASELINE_V1.md: missing ledger correction evidence: ${required}`);
}

const storageBaseline = read("docs/SUPABASE_STORAGE_READINESS_V1.md");
for (const required of ["Historical ledger correction", "20260708142250", "20260708142802", "20260708143337", "migration-ledger-baseline.json"]) {
  if (!storageBaseline.includes(required)) failures.push(`docs/SUPABASE_STORAGE_READINESS_V1.md: missing ledger correction evidence: ${required}`);
}

const artifactRegistry = read("docs/artifacts/README.md");
for (const required of [
  "**Non-authoritative target drafts.**",
  "[Implemented Architecture](../architecture.md)",
  "[Current Release State](../CURRENT_RELEASE_STATE.md)",
  "](bpmn/BPMN-001-core-analysis-flow.md)",
  "](erd/ERD-001-core-data-model.mmd)"
]) {
  if (!artifactRegistry.includes(required)) failures.push(`docs/artifacts/README.md: missing target-draft/navigation contract: ${required}`);
}

const semanticContracts = [
  {
    path: "README.md",
    required: [
      "Public-demo analysis and decision scoring run deterministically in the browser.",
      "return 403 before body parsing until AUTH-01",
      "The current migration chain is not apply-ready.",
      "Supabase CLI `2.109.1`",
      "57-assertion pgTAP",
      "User-uploaded and user-drawn targets skip market/climate network calls"
    ],
    forbidden: [
      "Mock fallback works when",
      "returns snapshot-backed context",
      "Decision score POST returns `deterministic_fallback`"
    ]
  },
  {
    path: "docs/architecture.md",
    required: [
      "Both server generation POST routes return 403 before parsing until AUTH-01",
      "deep snapshots stay outside anonymous function traces",
      "CI `database-replay`",
      "existing public Preview environment"
    ],
    forbidden: ["local fallback OR anon Supabase client"]
  },
  {
    path: "docs/qa-checklist.md",
    required: [
      "Invalid environment values fail closed",
      "DLD valuations/brokers/developers and OSM buildings remain zero-record/not-used",
      "57-assertion pgTAP",
      "returns seed-only context"
    ],
    forbidden: [
      "Mock fallback works when",
      "returns snapshot-backed context",
      "Decision score POST returns `deterministic_fallback`"
    ]
  },
  {
    path: "docs/DOCUMENTATION_INDEX.md",
    required: [
      "CONFLUENCE_SYNC_MAP.json",
      "Independent reviewer approvals are not required in the current phase",
      "old independent-review prerequisite is historical exact-hash evidence"
    ],
    forbidden: ["Stable layout rules: [UI Layout Guardrails]"]
  },
  {
    path: "AGENTS.md",
    required: ["Mapbox GL JS", "Public analysis is browser-local deterministic"],
    forbidden: ["Mapbox/MapLibre"]
  }
];

for (const contract of semanticContracts) {
  const content = read(contract.path);
  for (const required of contract.required) {
    if (!content.includes(required)) failures.push(`${contract.path}: missing semantic current-truth invariant: ${required}`);
  }
  for (const forbidden of contract.forbidden) {
    if (content.includes(forbidden)) failures.push(`${contract.path}: stale semantic claim remains: ${forbidden}`);
  }
}

const confluenceSyncMapPath = "docs/CONFLUENCE_SYNC_MAP.json";
const confluenceSyncMapContent = read(confluenceSyncMapPath);
try {
  const syncMap = JSON.parse(confluenceSyncMapContent);
  if (syncMap.hubPageId !== "98425") failures.push(`${confluenceSyncMapPath}: canonical Hub page ID mismatch`);
  if (!Array.isArray(syncMap.pages) || syncMap.pages.length !== 25) {
    failures.push(`${confluenceSyncMapPath}: expected 25 mapped operational pages`);
  } else {
    const pageIds = new Set();
    for (const page of syncMap.pages) {
      if (!page?.pageId || !page?.title || !page?.role || !page?.authority || !("successorPageId" in page)) {
        failures.push(`${confluenceSyncMapPath}: every page requires pageId/title/role/authority/successorPageId`);
        break;
      }
      pageIds.add(page.pageId);
    }
    if (pageIds.size !== syncMap.pages.length) failures.push(`${confluenceSyncMapPath}: duplicate page IDs`);
    for (const requiredPageId of ["98425", "98509", "2097153", "12320972", "1966084", "2490398", "12320810"]) {
      if (!pageIds.has(requiredPageId)) failures.push(`${confluenceSyncMapPath}: missing required page ${requiredPageId}`);
    }
  }
} catch {
  failures.push(`${confluenceSyncMapPath}: invalid JSON`);
}

for (const relativePath of releaseFactDocs) {
  const content = read(relativePath);
  if (!content.includes(exactMain)) {
    failures.push(`${relativePath}: exact released main SHA is missing`);
  }
  if (!content.includes(productionDeployment)) {
    failures.push(`${relativePath}: current Production deployment is missing`);
  }
}

const index = read("docs/DOCUMENTATION_INDEX.md");
for (const requiredLink of activeDocs.filter((path) => path !== "docs/DOCUMENTATION_INDEX.md")) {
  const relativeLink = requiredLink.startsWith("docs/") ? requiredLink.replace(/^docs\//, "") : `../${requiredLink}`;
  if (!index.includes(`(${relativeLink})`) && !index.includes(`(${relativeLink}#`)) {
    failures.push(`docs/DOCUMENTATION_INDEX.md: missing navigation link to ${relativeLink}`);
  }
}

const changeRequest = read("docs/CR_DEV8_001_CONTROLLED_OPEN_CONTEXT_SOURCE_CONNECTION_PACK_V1.md");
if (!changeRequest.includes(exactMain) || /Actual merge .*not performed/i.test(changeRequest) || /Status \| Owner-accepted for merge/.test(changeRequest)) {
  failures.push("docs/CR_DEV8_001_CONTROLLED_OPEN_CONTEXT_SOURCE_CONNECTION_PACK_V1.md: release disposition is stale");
}

const changeQa = read("docs/CR_DEV8_001_QA_CHECKLIST.md");
if (!changeQa.includes(exactMain) || /PR may be marked Ready/i.test(changeQa)) {
  failures.push("docs/CR_DEV8_001_QA_CHECKLIST.md: post-merge evidence is stale");
}

const supersededSnapshot = read("docs/CURRENT_RELEASE_STATE_2026_07_15.md");
if (!supersededSnapshot.includes("CURRENT_RELEASE_STATE.md")) {
  failures.push("docs/CURRENT_RELEASE_STATE_2026_07_15.md: superseded snapshot does not link its successor");
}

if (failures.length > 0) {
  console.error("Documentation current-truth contract failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Documentation current-truth contract passed: ${activeDocs.length} active authorities, release SHA/deployment aligned, local links resolved.`);
