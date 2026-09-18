import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import {
  assertPortableRuntimeConfiguration,
  getPublicBuildFingerprintPayload,
  resolveRuntimeTarget,
  validatePortableRuntimeConfiguration,
  validatePortableRuntimeFingerprint
} from "../src/lib/platform/runtime-environment.ts";
import { evaluateApiMutationOrigin } from "../src/lib/auth/api-mutation-origin.ts";
import { resolvePointObjectRuntimePolicy } from "../src/lib/prototype/point-object-runtime-policy.ts";

const root = resolve(import.meta.dirname, "..");
const read = (path) => readFileSync(resolve(root, path), "utf8");

const computedFingerprint = createHash("sha256")
  .update(getPublicBuildFingerprintPayload(process.env))
  .digest("hex");
if (process.argv.includes("--print-public-fingerprint")) {
  console.log(computedFingerprint);
  process.exit(0);
}
if (process.argv.includes("--verify-public-fingerprint")) {
  assert.equal(
    process.env.GEOAI_PUBLIC_BUILD_FINGERPRINT?.trim().toLowerCase(),
    computedFingerprint,
    "GEOAI_PUBLIC_BUILD_FINGERPRINT must be the SHA-256 of the canonical public build configuration"
  );
  process.exit(0);
}

const fingerprint = "deb2fc1d3df562a3f9336d1ccd258c2dcf7f6788127cc7578b500627663a01ca";
const valid = {
  GEOAI_BUILD_TARGET: "self_hosted_candidate",
  GEOAI_RUNTIME_TARGET: "self_hosted_candidate",
  GEOAI_PUBLIC_ORIGIN: "https://candidate.geoai.example",
  GEOAI_PUBLIC_HOST: "candidate.geoai.example",
  GEOAI_RELEASE_COMMIT_SHA: "b".repeat(40),
  GEOAI_PUBLIC_BUILD_FINGERPRINT: fingerprint,
  NEXT_PUBLIC_GEOAI_BUILD_FINGERPRINT: fingerprint,
  NEXT_PUBLIC_AUTH_MODE: "supabase_auth",
  NEXT_PUBLIC_SUPABASE_URL: "https://pphdqkurxneyagvnnjdt.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ["sb", "publishable", "1234567890abcdef"].join("_"),
  NEXT_PUBLIC_MAPBOX_TOKEN: "pk.public-browser-token",
  NEXT_PUBLIC_GEOAI_ALLOW_LOCAL_SUPABASE: "false",
  GEOAI_ACCESS_ENFORCEMENT_MODE: "hard",
  GEOAI_REQUIRE_SUPABASE_READY: "true",
  GEOAI_REQUIRE_STORAGE_READY: "false",
  GEOAI_ALLOW_DEMO_PUBLIC: "false",
  GEOAI_ALLOW_OPENAI_UPSTREAM: "false",
  GEOAI_ALLOW_POINT_OBJECT_SELF_HOSTED_SURFACE: "true",
  GEOAI_ALLOW_POINT_OBJECT_SELF_HOSTED_AI: "false",
  GEOAI_ALLOW_POINT_OBJECT_SELF_HOSTED_PERSISTENCE: "false"
};

assert.equal(resolveRuntimeTarget(valid), "self_hosted_candidate");
assert.deepEqual(validatePortableRuntimeConfiguration(valid), {
  ok: true,
  target: "self_hosted_candidate",
  publicOrigin: "https://candidate.geoai.example",
  releaseCommit: "b".repeat(40),
  publicBuildFingerprint: fingerprint
});
assert.doesNotThrow(() => assertPortableRuntimeConfiguration(valid));
assert.equal(await validatePortableRuntimeFingerprint(valid), true);
assert.equal(await validatePortableRuntimeFingerprint({ ...valid, NEXT_PUBLIC_MAPBOX_TOKEN: "pk.changed" }), false);

const rejectedCases = [
  ["unknown target", { ...valid, GEOAI_RUNTIME_TARGET: "preview" }, "unknown_runtime_target"],
  ["Vercel conflict", { ...valid, VERCEL_ENV: "preview" }, "not_self_hosted_candidate"],
  ["demo mode", { ...valid, NEXT_PUBLIC_AUTH_MODE: "demo_public" }, "auth_mode_not_supabase"],
  ["soft access", { ...valid, GEOAI_ACCESS_ENFORCEMENT_MODE: "soft" }, "access_enforcement_not_hard"],
  ["local Supabase", { ...valid, NEXT_PUBLIC_GEOAI_ALLOW_LOCAL_SUPABASE: "true" }, "local_supabase_enabled"],
  ["AI flag", { ...valid, GEOAI_ALLOW_POINT_OBJECT_SELF_HOSTED_AI: "true" }, "self_hosted_ai_not_disabled"],
  ["persistence flag", { ...valid, GEOAI_ALLOW_POINT_OBJECT_SELF_HOSTED_PERSISTENCE: "true" }, "self_hosted_persistence_not_disabled"],
  ["fingerprint", { ...valid, GEOAI_PUBLIC_BUILD_FINGERPRINT: "c".repeat(64) }, "public_build_fingerprint_mismatch"],
  ["private origin", { ...valid, GEOAI_PUBLIC_ORIGIN: "https://127.0.0.1" }, "invalid_public_origin"],
  ["host mismatch", { ...valid, GEOAI_PUBLIC_HOST: "other.geoai.example" }, "public_host_origin_mismatch"],
  ["wrong managed target", { ...valid, NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co" }, "supabase_target_mismatch"]
];
for (const [label, environment, expectedIssue] of rejectedCases) {
  const result = validatePortableRuntimeConfiguration(environment);
  assert.equal(result.ok, false, `${label} must fail`);
  assert(result.issues.includes(expectedIssue), `${label} must report ${expectedIssue}`);
  assert.throws(() => assertPortableRuntimeConfiguration(environment), /Portable runtime configuration rejected/);
}
assert.throws(
  () => assertPortableRuntimeConfiguration({ GEOAI_BUILD_TARGET: "self_hosted_candidate" }),
  /runtime_target_missing_or_conflicting/
);

assert.equal(resolveRuntimeTarget({ VERCEL_ENV: "preview" }), "vercel_preview");
assert.equal(resolveRuntimeTarget({ VERCEL_ENV: "production" }), "vercel_production_demo");
assert.doesNotThrow(() => assertPortableRuntimeConfiguration({ VERCEL_ENV: "preview" }));
assert.doesNotThrow(() => assertPortableRuntimeConfiguration({ VERCEL_ENV: "production" }));

const previewPolicy = resolvePointObjectRuntimePolicy(
  { VERCEL_ENV: "preview", GEOAI_ALLOW_POINT_OBJECT_PREVIEW_AI: "true" },
  { openAiKeyConfigured: true, generalUpstreamEnabled: false }
);
assert.equal(previewPolicy.environment, "preview");
assert.equal(previewPolicy.ai.scope, "isolated_point_object_preview");
const selfHostedPolicy = resolvePointObjectRuntimePolicy(valid, {
  openAiKeyConfigured: false,
  generalUpstreamEnabled: false
});
assert.equal(selfHostedPolicy.environment, "self_hosted_candidate");
assert.equal(selfHostedPolicy.surface.enabled, true);
assert.deepEqual(selfHostedPolicy.ai, {
  enabled: false,
  reason: "self_hosted_ai_flag_disabled",
  scope: "disabled"
});

const mutationBase = {
  method: "POST",
  pathname: "/api/prototype/point-to-object/find",
  requestUrl: "http://0.0.0.0:3000/api/prototype/point-to-object/find",
  origin: "https://candidate.geoai.example",
  secFetchSite: "same-origin",
  host: "candidate.geoai.example",
  forwardedHost: "candidate.geoai.example",
  forwardedProto: "https",
  canonicalPublicOrigin: "https://candidate.geoai.example"
};
assert.deepEqual(evaluateApiMutationOrigin(mutationBase), { allowed: true, reason: "same_origin" });
for (const patch of [
  { origin: "https://evil.example" },
  { host: "app:3000" },
  { forwardedHost: "evil.example" },
  { forwardedProto: "http" },
  { canonicalPublicOrigin: "http://candidate.geoai.example" }
]) {
  assert.equal(evaluateApiMutationOrigin({ ...mutationBase, ...patch }).allowed, false);
}
assert.deepEqual(evaluateApiMutationOrigin({
  ...mutationBase,
  requestUrl: "https://preview.example/api/prototype/point-to-object/find",
  host: "preview.example",
  forwardedHost: "preview.example",
  canonicalPublicOrigin: null,
  origin: "https://preview.example"
}), { allowed: true, reason: "same_origin" });
const callbackRoute = read("app/auth/callback/route.ts");
assert(callbackRoute.includes("getPublicRequestOrigin(requestUrl.href)"));
assert(!callbackRoute.includes("new URL(path, requestUrl.origin)"));

const dockerfile = read("Dockerfile");
assert(dockerfile.includes("node:22.20.0-bookworm-slim@sha256:"), "Node base must be pinned by version and digest");
assert(dockerfile.includes("USER 1001:1001"), "runtime must be non-root");
assert(dockerfile.includes(".next/standalone"), "standalone output must be copied");
assert(dockerfile.includes("self-host-runtime-bootstrap.mjs --install-standalone"), "builder must seal and wrap the standalone server");
assert(dockerfile.includes('CMD ["node", "server.js"]'), "runtime must execute the sealed pre-server wrapper");
const compose = read("compose.self-host.yml");
assert(compose.includes("read_only: true"), "containers must use read-only roots");
assert(!compose.match(/app:[\s\S]*?ports:\s*\n\s*-\s*["']?3000/), "application port must not be published");
const caddyfile = read("ops/self-host/Caddyfile");
assert(caddyfile.includes("lb_retries 0"), "proxy retries must remain disabled");
assert(caddyfile.includes("response_header_timeout 130s"), "proxy timeout must exceed application maximum");
for (const key of ["code", "token", "invitation", "access_token", "refresh_token"]) {
  assert(caddyfile.includes(`delete ${key}`), `proxy logs must redact ${key}`);
}
const nextConfig = read("next.config.ts");
assert(nextConfig.includes('process.env.GEOAI_BUILD_TARGET === "self_hosted_candidate"'));
assert(nextConfig.includes('{ output: "standalone" as const }'));
const readiness = read("app/api/runtime/readiness/route.ts");
assert(readiness.includes("probeSupabaseApiHealth"));
assert(!readiness.includes("NEXT_PUBLIC_SUPABASE_URL"));
assert(!readiness.includes("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"));
const middleware = read("middleware.ts");
assert(middleware.includes('"/api/health"'));
assert(middleware.includes('"/api/runtime/readiness"'));
assert(middleware.indexOf("dependencyProbePaths.has") < middleware.indexOf("updateSupabaseSession(request)"));
const instrumentation = read("instrumentation.ts");
for (const name of ["OPENAI_API_KEY", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_DB_URL", "GEOAI_OPERATOR_"]) {
  assert(instrumentation.includes(name), `startup hook must reject ${name}`);
}

const bootstrapDirectory = mkdtempSync(resolve(tmpdir(), "geoai-portable-bootstrap-"));
try {
  const bootstrapPath = resolve(bootstrapDirectory, "self-host-runtime-bootstrap.mjs");
  copyFileSync(resolve(root, "scripts/self-host-runtime-bootstrap.mjs"), bootstrapPath);
  writeFileSync(resolve(bootstrapDirectory, "self-host-build-seal.json"), `${JSON.stringify({
    schemaVersion: 1,
    buildTarget: "self_hosted_candidate",
    publicBuildFingerprint: fingerprint,
    releaseCommit: valid.GEOAI_RELEASE_COMMIT_SHA
  })}\n`);
  const serverMarker = resolve(bootstrapDirectory, "server-imported.marker");
  writeFileSync(resolve(bootstrapDirectory, "next-server.js"),
    'require("node:fs").writeFileSync("server-imported.marker", "imported\\n");\n');
  const bootstrapEnvironment = {
    PATH: process.env.PATH ?? "",
    NODE_ENV: "production",
    ...valid
  };
  const runBootstrap = (patch = {}, argumentsList = ["--check-only"]) => {
    const environment = { ...bootstrapEnvironment, ...patch };
    for (const [name, value] of Object.entries(environment)) {
      if (value === undefined) delete environment[name];
    }
    return spawnSync(process.execPath, [bootstrapPath, ...argumentsList], {
      cwd: bootstrapDirectory,
      env: environment,
      encoding: "utf8",
      timeout: 5_000
    });
  };
  const accepted = runBootstrap();
  assert.equal(accepted.status, 0, accepted.stderr);
  assert.match(accepted.stdout, /Portable runtime preflight passed/);
  const acceptedStartup = runBootstrap({}, []);
  assert.equal(acceptedStartup.status, 0, acceptedStartup.stderr);
  assert.equal(readFileSync(serverMarker, "utf8"), "imported\n", "valid startup must import the server after preflight");
  rmSync(serverMarker);
  const processRejectedCases = [
    ["changed public key", { NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ["sb", "publishable", "changedSynthetic1234567890"].join("_") }],
    ["missing runtime target", { GEOAI_RUNTIME_TARGET: undefined }],
    ["Vercel conflict", { VERCEL_ENV: "preview" }],
    ["demo enabled", { NEXT_PUBLIC_AUTH_MODE: "demo_public" }],
    ["AI enabled", { GEOAI_ALLOW_POINT_OBJECT_SELF_HOSTED_AI: "true" }],
    ["privileged key", { SUPABASE_SECRET_KEY: "synthetic-not-a-credential" }]
  ];
  for (const [label, patch] of processRejectedCases) {
    const rejected = runBootstrap(patch, []);
    assert.equal(rejected.status, 78, `${label}: ${rejected.stdout}\n${rejected.stderr}`);
    assert.match(rejected.stderr, /Portable runtime configuration rejected/, label);
    assert.equal(existsSync(serverMarker), false, `${label}: server imported before rejection`);
    rmSync(serverMarker, { force: true });
  }
} finally {
  rmSync(bootstrapDirectory, { recursive: true, force: true });
}

console.log(`self-host runtime contract passed: ${rejectedCases.length} pure configuration personas and 6 isolated fail-before-server subprocess personas plus origin, proxy, image and Vercel-regression checks`);
