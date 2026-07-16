import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import process from "node:process";

const root = process.cwd();
const exactMain = "2999e7e857989baf53ce58ecfed63550b5896be0";
const productionDeployment = "dpl_EAXREH31JKznnGbQYEU8bNqTqagN";

const activeDocs = [
  "docs/DOCUMENTATION_INDEX.md",
  "docs/CURRENT_RELEASE_STATE.md",
  "docs/FULL_SYSTEM_AUDIT_2026_07_16.md",
  "docs/CODEX_BACKLOG_2026_07_16.md",
  "docs/architecture.md",
  "docs/data-strategy.md",
  "docs/roadmap.md",
  "docs/qa-checklist.md"
];

const releaseFactDocs = [
  "docs/DOCUMENTATION_INDEX.md",
  "docs/CURRENT_RELEASE_STATE.md",
  "docs/FULL_SYSTEM_AUDIT_2026_07_16.md",
  "docs/roadmap.md",
  "README.md",
  "AGENTS.md"
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

for (const relativePath of activeDocs) {
  const content = read(relativePath);
  if (!/^Status:\s+/m.test(content)) {
    failures.push(`${relativePath}: active document has no Status field`);
  }
  if (!/^Last (verified|reconciled):\s+2026-07-16\s*$/m.test(content)) {
    failures.push(`${relativePath}: active document is not verified/reconciled on 2026-07-16`);
  }
  if (/PR #(?:81|83)\b/.test(content)) {
    failures.push(`${relativePath}: stale PR #81/#83 appears in current authority`);
  }

  for (const match of content.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    const target = match[1].trim();
    if (/^(?:https?:|mailto:|#)/.test(target)) continue;
    const fileTarget = target.split("#", 1)[0];
    if (!fileTarget) continue;
    const linkedPath = resolve(root, dirname(relativePath), fileTarget);
    if (!existsSync(linkedPath)) {
      failures.push(`${relativePath}: broken local link ${target}`);
    }
  }
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
  const relativeLink = requiredLink.replace(/^docs\//, "");
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
