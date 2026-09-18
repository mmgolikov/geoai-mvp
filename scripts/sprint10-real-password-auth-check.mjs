import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const spec = readFileSync(new URL("../tests/e2e/sprint10-real-password-auth.spec.ts", import.meta.url), "utf8");
const handoff = readFileSync(new URL("../docs/sprint10/REAL_PASSWORD_AUTH_TEST_HANDOFF.md", import.meta.url), "utf8");

const requiredEnvironmentNames = [
  "GEOAI_E2E_BASE_URL",
  "GEOAI_REAL_PASSWORD_AUTH_PREVIEW_URL",
  "GEOAI_REAL_PASSWORD_AUTH_EXPECTED_COMMIT_SHA",
  "GEOAI_REAL_PASSWORD_AUTH_SUPABASE_PROJECT_REF",
  "GEOAI_REAL_PASSWORD_AUTH_PREVIEW_BYPASS_SECRET",
  "GEOAI_REAL_PASSWORD_AUTH_RUN_APPROVAL",
  "GEOAI_REAL_PASSWORD_AUTH_PRIMARY_EMAIL",
  "GEOAI_REAL_PASSWORD_AUTH_PRIMARY_PASSWORD",
  "GEOAI_REAL_PASSWORD_AUTH_PRIMARY_USER_ID",
  "GEOAI_REAL_PASSWORD_AUTH_SECONDARY_EMAIL",
  "GEOAI_REAL_PASSWORD_AUTH_SECONDARY_PASSWORD",
  "GEOAI_REAL_PASSWORD_AUTH_SECONDARY_USER_ID"
];

for (const name of requiredEnvironmentNames) {
  assert.match(spec, new RegExp(`process\\.env\\.${name}\\b`), `${name} must be runtime-only in the test.`);
  assert.match(handoff, new RegExp(`\\b${name}\\b`), `${name} must be documented by name.`);
}

assert.match(spec, /const exactDevelopmentProjectRef = "pphdqkurxneyagvnnjdt"/);
assert.doesNotMatch(spec, /bkmfcjzalcvdsdvyxpgi/, "The new harness must not target the old rehearsal project.");
assert.match(spec, /body\.environment === "vercel_preview"/);
assert.match(spec, /body\.releaseCommit === expectedCommitSha/);
assert.match(spec, /deployment\.deploymentHost === new URL\(previewUrl\)\.hostname/);
assert.match(spec, /forbiddenProductionHosts\.has\(target\.hostname\)/);
assert.match(spec, /existing-password-only:/);

assert.match(spec, /trace: "off", screenshot: "off", video: "off"/,
  "Credential-bearing tests must not retain traces, screenshots or video.");
assert.match(spec, /x-vercel-protection-bypass/);
assert.match(spec, /route\.continue/);
assert.doesNotMatch(spec, /route\.fulfill|storageState|console\.(?:log|info|debug)|page\.screenshot/,
  "The harness must not mock Auth, persist browser state or emit credential-bearing diagnostics.");

assert.match(spec, /getByLabel\("Email or phone"\)\.fill\(persona\.email\)/);
assert.match(spec, /getByLabel\("Password"\)\.fill\(persona\.password\)/);
assert.match(spec, /body\?\.sessionStatus === "supabase_user_with_profile"/);
assert.match(spec, /fetch\("\/api\/prototype\/point-to-object\/ai"/);
assert.match(spec, /method: "GET"/);
assert.match(spec, /AI_RUNTIME_DISABLED/);
assert.match(spec, /authentication_required/);
assert.match(spec, /localSampleIsUnchanged/);
assert.match(spec, /keeps two existing-user browser cookie sessions isolated/);

for (const prohibitedOperation of [
  "signInWithOtp",
  "verifyOtp",
  "signUp",
  "updateUser",
  "requestEmailChange",
  "changePassword",
  "resetPasswordForEmail",
  "inviteUserByEmail"
]) {
  assert.doesNotMatch(spec, new RegExp(`\\b${prohibitedOperation}\\b`),
    `The harness must not contain ${prohibitedOperation}.`);
}

assert.match(handoff, /No live test was executed/i);
assert.match(handoff, /browser-cookie isolation/i);
assert.match(handoff, /project membership authorization remains unproven/i);
assert.match(handoff, /Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion\./);

console.log("Sprint 10 real-password Auth harness static preflight passed.");
