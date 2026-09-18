#!/usr/bin/env node

import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { validateRuntimeConfig } from "./sprint10-hosted-auth-probe.mjs";

const operator = await readFile(new URL("./sprint10-hosted-auth-probe.mjs", import.meta.url), "utf8");
const handoff = await readFile(new URL("../docs/sprint10/HOSTED_AUTH_PROBE_HANDOFF.md", import.meta.url), "utf8");
const packageJson = await readFile(new URL("../package.json", import.meta.url), "utf8");
const workflowDirectory = new URL("../.github/workflows/", import.meta.url);
const workflowNames = (await readdir(workflowDirectory)).filter((name) => name.endsWith(".yml") || name.endsWith(".yaml"));
const workflows = await Promise.all(workflowNames.map((name) => readFile(new URL(name, workflowDirectory), "utf8")));

const head = "a".repeat(40);
const publishable = ["sb", "publishable", "offline"].join("_") + "x".repeat(32);
const secret = ["sb", "secret", "offline"].join("_") + "y".repeat(32);
const baseEnv = {
  GEOAI_HOSTED_AUTH_PROBE_EXPLICIT_RUN: "create-two-synthetic-password-personas",
  GEOAI_HOSTED_AUTH_PROBE_PROJECT_REF: "pphdqkurxneyagvnnjdt",
  GEOAI_HOSTED_AUTH_PROBE_SUPABASE_URL: "https://pphdqkurxneyagvnnjdt.supabase.co",
  GEOAI_HOSTED_AUTH_PROBE_PUBLISHABLE_KEY: publishable,
  GEOAI_HOSTED_AUTH_PROBE_ADMIN_SECRET_KEY: secret,
  GEOAI_HOSTED_AUTH_PROBE_EXPECTED_COMMIT_SHA: head,
  GEOAI_HOSTED_AUTH_PROBE_RUN_APPROVAL: `hosted-auth-probe:pphdqkurxneyagvnnjdt:${head}`,
  GEOAI_HOSTED_AUTH_PROBE_PREVIEW_SEAM: "disabled"
};

assert.equal(validateRuntimeConfig(baseEnv, ["node", "operator"], head, 22).projectRef, "pphdqkurxneyagvnnjdt");

const negativeFixtures = [
  ["wrong project", { GEOAI_HOSTED_AUTH_PROBE_PROJECT_REF: "bkmfcjzalcvdsdvyxpgi" }, ["node", "operator"], head, 22],
  ["wrong origin", { GEOAI_HOSTED_AUTH_PROBE_SUPABASE_URL: "https://example.invalid" }, ["node", "operator"], head, 22],
  ["wrong opt-in", { GEOAI_HOSTED_AUTH_PROBE_EXPLICIT_RUN: "yes" }, ["node", "operator"], head, 22],
  ["wrong head", {}, ["node", "operator"], "b".repeat(40), 22],
  ["legacy publishable key", { GEOAI_HOSTED_AUTH_PROBE_PUBLISHABLE_KEY: "legacy" }, ["node", "operator"], head, 22],
  ["legacy Admin key", { GEOAI_HOSTED_AUTH_PROBE_ADMIN_SECRET_KEY: "legacy" }, ["node", "operator"], head, 22],
  ["command-line secret", {}, ["node", "operator", "unexpected"], head, 22],
  ["unsupported Node", {}, ["node", "operator"], head, 20],
  ["Preview seam missing receipt", { GEOAI_HOSTED_AUTH_PROBE_PREVIEW_SEAM: "run-existing-real-password-preview-harness" }, ["node", "operator"], head, 22]
];
for (const [name, delta, argv, fixtureHead, nodeMajor] of negativeFixtures) {
  assert.throws(
    () => validateRuntimeConfig({ ...baseEnv, ...delta }, argv, fixtureHead, nodeMajor),
    undefined,
    `${name} fixture must fail closed offline`
  );
}

for (const requiredName of [
  "GEOAI_HOSTED_AUTH_PROBE_EXPLICIT_RUN",
  "GEOAI_HOSTED_AUTH_PROBE_PROJECT_REF",
  "GEOAI_HOSTED_AUTH_PROBE_SUPABASE_URL",
  "GEOAI_HOSTED_AUTH_PROBE_PUBLISHABLE_KEY",
  "GEOAI_HOSTED_AUTH_PROBE_ADMIN_SECRET_KEY",
  "GEOAI_HOSTED_AUTH_PROBE_EXPECTED_COMMIT_SHA",
  "GEOAI_HOSTED_AUTH_PROBE_RUN_APPROVAL",
  "GEOAI_HOSTED_AUTH_PROBE_PREVIEW_SEAM"
]) {
  assert.match(operator, new RegExp(`\\b${requiredName}\\b`));
  assert.match(handoff, new RegExp(`\\b${requiredName}\\b`));
}

assert.match(operator, /const exactProjectRef = "pphdqkurxneyagvnnjdt"/);
assert.match(operator, /const exactSupabaseOrigin = `https:\/\/\$\{exactProjectRef\}[.]supabase[.]co`/);
assert.match(operator, /admin[.]auth[.]admin[.]createUser/);
assert.match(operator, /email_confirm: true/);
assert.match(operator, /auth[.]signInWithPassword/);
assert.match(operator, /auth[.]getClaims/);
assert.match(operator, /auth[.]getUser/);
assert.match(operator, /[.]schema\("api"\)[.]rpc\("current_profile"\)/);
assert.match(operator, /anonymousCurrentProfileDenied: true/);
assert.match(operator, /assert[.]notEqual\(personas\[0\][.]profileId, personas\[1\][.]profileId/);
assert.match(operator, /signOut\(\{ scope: "global" \}\)/);
assert.match(operator, /admin[.]auth[.]admin[.]updateUserById/);
assert.match(operator, /ban_duration: permanentBanDuration/);
assert.match(operator, /auth[.]refreshSession/);
assert.match(operator, /admin[.]auth[.]admin[.]getUserById/);
assert.match(operator, /scripts\/sprint10-real-password-auth-run[.]mjs/);
assert.match(operator, /secret-bearing output was suppressed/);
assert.match(operator, /A non-allowlisted hosted Auth probe request was blocked before dispatch/);
assert.doesNotMatch(operator.slice(
  operator.indexOf("function runExistingPreviewHarness"),
  operator.indexOf("async function retirePersona")
), /\.\.\.process[.]env/,
"The optional child must not inherit the root process environment or Admin secret wholesale.");

for (const prohibited of [
  /inviteUserByEmail/,
  /signInWithOtp/,
  /verifyOtp/,
  /resetPasswordForEmail/,
  /deleteUser/,
  /auth[.]users/i,
  /session_replication_role/i,
  /from\(["'](?:public|private|source|storage)/i,
  /fetch\(["'][^"']*(?:ai|source|product)/i,
  /writeFile|appendFile|createWriteStream/,
  /console[.](?:log|error)\([^\n]*(?:password|accessToken|refreshToken|publishableKey|adminSecretKey)/
]) {
  assert.doesNotMatch(operator, prohibited);
}

assert.doesNotMatch(packageJson, /sprint10-hosted-auth-probe/,
  "The live operator must not be included in default package scripts.");
for (const workflow of workflows) {
  assert.doesNotMatch(workflow, /sprint10-hosted-auth-probe/,
    "The live operator must not be included in repository workflows.");
}
assert.match(handoff, /No hosted call was executed during implementation/i);
assert.match(handoff, /root-only executor/i);
assert.match(handoff, /transactional email.*deferred/i);
assert.match(handoff, /profile rows.*preserved/i);
assert.match(handoff, /Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion[.]/);

console.log(`Sprint 10 hosted Auth probe offline contract passed: 1 positive and ${negativeFixtures.length} negative preflight fixtures.`);
