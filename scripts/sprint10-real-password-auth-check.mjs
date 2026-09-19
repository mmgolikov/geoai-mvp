import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";

const spec = readFileSync(new URL("../tests/e2e/sprint10-real-password-auth.spec.ts", import.meta.url), "utf8");
const handoff = readFileSync(new URL("../docs/sprint10/REAL_PASSWORD_AUTH_TEST_HANDOFF.md", import.meta.url), "utf8");
const runner = readFileSync(new URL("./sprint10-real-password-auth-run.mjs", import.meta.url), "utf8");
const diagnostics = readFileSync(new URL("./sprint10-real-password-auth-diagnostics.mjs", import.meta.url), "utf8");
const packageJson = readFileSync(new URL("../package.json", import.meta.url), "utf8");
const workflowDirectory = new URL("../.github/workflows/", import.meta.url);
const workflows = readdirSync(workflowDirectory, { withFileTypes: true })
  .filter((entry) => entry.isFile())
  .map((entry) => readFileSync(new URL(entry.name, workflowDirectory), "utf8"))
  .join("\n");

const requiredEnvironmentNames = [
  "GEOAI_E2E_BASE_URL",
  "GEOAI_REAL_PASSWORD_AUTH_PREVIEW_URL",
  "GEOAI_REAL_PASSWORD_AUTH_EXPECTED_COMMIT_SHA",
  "GEOAI_REAL_PASSWORD_AUTH_SUPABASE_PROJECT_REF",
  "GEOAI_REAL_PASSWORD_AUTH_PREVIEW_BYPASS_SECRET",
  "GEOAI_REAL_PASSWORD_AUTH_RUN_APPROVAL",
  "GEOAI_REAL_PASSWORD_AUTH_EXPLICIT_RUN",
  "GEOAI_REAL_PASSWORD_AUTH_SCOPE",
  "GEOAI_REAL_PASSWORD_AUTH_DEPLOYMENT_RECEIPT_PATH",
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
  if (!name.startsWith("GEOAI_REAL_PASSWORD_AUTH_PRIMARY_")) {
    assert.match(runner, new RegExp(`\\b${name}\\b`), `${name} must be preflighted by the explicit runner.`);
  }
}
assert.match(runner, /validatePersona\("GEOAI_REAL_PASSWORD_AUTH_PRIMARY", "primary"\)/,
  "The explicit runner must preflight the complete primary persona tuple.");

assert.match(spec, /const exactDevelopmentProjectRef = "pphdqkurxneyagvnnjdt"/);
assert.doesNotMatch(spec, /bkmfcjzalcvdsdvyxpgi/, "The new harness must not target the old rehearsal project.");
assert.match(spec, /body\.environment === "vercel_preview"/);
assert.match(spec, /body\.releaseCommit === expectedCommitSha/);
assert.match(spec, /deployment\.deploymentHost === new URL\(previewUrl\)\.hostname/);
assert.match(spec, /forbiddenProductionHosts\.has\(target\.hostname\)/);
assert.match(spec, /geoai-a71p4fxnr-geoaidev\.vercel\.app/,
  "The authoritative immutable Production host must be denied.");
assert.match(spec, /existing-password-only:/);
assert.match(spec, /explicitRunApproval !== "existing-password-only-live-acceptance"/,
  "Default Playwright discovery must skip the live harness without exact opt-in.");
assert.match(spec, /guard\(runnerActive,/,
  "An explicit run must fail unless it was started through the bounded runner.");

assert.match(spec, /trace: "off", screenshot: "off", video: "off"/,
  "Credential-bearing tests must not retain traces, screenshots or video.");
assert.match(spec, /x-vercel-protection-bypass/);
assert.match(spec, /route\.continue/);
assert.doesNotMatch(spec, /page\.on\("request"/,
  "Safety must be enforced before dispatch, not only observed by a request listener.");
assert.match(spec, /page\.route\("\*\*\/\*"/,
  "One pre-dispatch route must enforce the complete browser network policy.");
assert.match(spec, /const allowedApplicationReadPaths = new Set\(\[/,
  "Preview reads must use a named path allowlist rather than any-origin safe-method continuation.");
assert.match(spec, /allowedApplicationReadPaths\.has\(url\.pathname\) \|\| url\.pathname\.startsWith\("\/_next\/"\)/);
assert.match(spec, /"\/brand\/geoai-identity-symbol-32[.]svg"/,
  "The observed same-origin identity symbol must be allowed as one exact GET/HEAD path.");
assert.doesNotMatch(spec, /startsWith\("\/brand\/"\)|\/brand\/[*]/,
  "The identity-symbol correction must not widen the policy to a brand path family.");
assert.match(spec, /\["password", "refresh_token"\]\.includes/,
  "Supabase token traffic must be limited to existing-password and refresh grants.");
assert.match(spec, /method === "GET" && url\.pathname === "\/auth\/v1\/user"/);
assert.match(spec, /method === "POST" && url\.pathname === "\/auth\/v1\/logout"/);
for (const counter of ["disallowedApplicationMutations", "disallowedSupabaseOperations", "unexpectedExternalRequests"]) {
  const counterIndex = spec.indexOf(`${counter} += 1;`);
  const abortIndex = spec.indexOf('await route.abort("blockedbyclient");', counterIndex);
  assert.ok(counterIndex >= 0 && abortIndex > counterIndex,
    `${counter} must abort the request before any dispatch.`);
}
assert.doesNotMatch(spec, /route\.fulfill|storageState|console\.(?:log|info|debug)|page\.screenshot/,
  "The harness must not mock Auth, persist browser state or emit credential-bearing diagnostics.");

assert.match(spec, /schemaVersion === "geoai\.sprint10\.real-password-preview-receipt\.v1"/);
assert.match(spec, /state === "READY"/);
assert.match(spec, /target === "preview"/);
assert.match(spec, /commitSha === expectedCommitSha/);
assert.match(spec, /redirect: "manual"/,
  "Anonymous protection verification must not follow the Preview redirect.");
assert.match(spec, /credentials: "omit"/,
  "Anonymous protection verification must explicitly omit credentials.");
assert.match(spec, /headers: \{ Accept: "text\/html" \}/,
  "Anonymous protection verification must not attach the bypass header.");
assert.match(spec, /location\.origin === "https:\/\/vercel\.com" && location\.pathname === "\/sso-api"/);
const anonymousCheck = spec.slice(
  spec.indexOf("async function verifyAnonymousPreviewProtection"),
  spec.indexOf("async function verifyExactPreview")
);
assert.doesNotMatch(anonymousCheck, /protection-bypass|previewBypassSecret/,
  "The anonymous protection challenge must not carry or reference the bypass credential.");

assert.match(spec, /getByLabel\("Email or phone"\)\.fill\(persona\.email\)/);
assert.match(spec, /getByLabel\("Password"\)\.fill\(persona\.password\)/);
assert.match(spec, /body\?\.sessionStatus === "supabase_user_with_profile"/);
assert.match(spec, /fetch\("\/api\/prototype\/point-to-object\/ai"/);
assert.match(spec, /method: "GET"/);
assert.match(spec, /AI_RUNTIME_DISABLED/);
assert.match(spec, /authentication_required/);
assert.match(spec, /localSampleIsUnchanged/);
assert.match(spec, /keeps two existing-user browser cookie sessions isolated/);

assert.match(runner, /GEOAI_REAL_PASSWORD_AUTH_RUNNER_ACTIVE: "1"/);
assert.match(runner, /"--reporter=json"/);
assert.match(runner, /"--retries=0"/);
assert.match(runner, /preserveOutput: "never"/,
  "The bounded runner must not retain failure output or DOM error-context files.");
assert.match(runner, /projects: \[\{ name:/);
assert.match(runner, /`--project=\$\{projectName\}`/,
  "The live command must select exactly the runner-owned Playwright project.");
assert.match(runner, /"--list"/);
assert.match(runner, /const discoveryTimeoutMs = 30_000/);
assert.match(runner, /const browserTimeoutMs = 390_000/,
  "The browser child must cover two sequential 180-second tests plus bounded teardown.");
assert.match(runner, /discoveredProjects\.length !== 1/);
assert.match(runner, /discoveredTestCount !== expectedTestCount/,
  "Offline discovery must reconcile the selected scope before network execution.");
assert.match(runner, /rmSync\(temporaryDirectory, \{ recursive: true, force: true \}\)/,
  "The ephemeral config and any test output must be deleted on every outcome.");
assert.match(runner, /counts\.passed !== expectedTestCount \|\| counts\.skipped !== 0/);
assert.match(runner, /counts\.unexpected !== 0 \|\| counts\.flaky !== 0/,
  "The explicit runner must reject missing, skipped, failed or flaky selected-scope evidence.");
assert.match(runner, /console\.log\(JSON\.stringify\(diagnostic\)\)/,
  "The runner must emit only its strict sanitized diagnostic receipt.");
assert.doesNotMatch(runner, /console[.](?:error|warn)|error[.]message|error[.]stack|result[.]stderr/,
  "The runner must never forward raw child errors, stacks or stderr.");
assert.match(diagnostics, /const STAGES = new Set/);
assert.match(diagnostics, /const LANES = new Set/);
assert.doesNotMatch(diagnostics, /["'](?:headers|cookies|password|authorization|requestUrl|responseBody)["']\s*:/i,
  "The sanitized diagnostic schema must not contain credential or raw transport fields.");
assert.match(spec, /page\.close\(\{ runBeforeUnload: false \}\)/,
  "Credential-bearing pages must close before Playwright failure-context collection.");
assert.doesNotMatch(packageJson, /sprint10-real-password-auth-(?:run|check)|sprint10-real-password-auth\.spec/,
  "Default package scripts must not invoke the live real-password harness.");
assert.doesNotMatch(workflows, /sprint10-real-password-auth-(?:run|check)|sprint10-real-password-auth\.spec/,
  "Repository workflows must not invoke the live real-password harness.");

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
assert.match(handoff, /root-owned exact-deployment receipt/i);
assert.match(handoff, /zero skipped/i);
assert.match(handoff, /browser-cookie isolation/i);
assert.match(handoff, /project membership authorization remains unproven/i);
assert.match(handoff, /Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion\./);

console.log("Sprint 10 real-password Auth harness static preflight passed.");
