import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
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
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_1234567890abcdef",
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
assert(instrumentation.indexOf("assertNoPrivilegedPortableEnvironment()") < instrumentation.indexOf("assertPortableRuntimeConfiguration()"));

console.log(`self-host runtime contract passed: ${rejectedCases.length} fail-closed configuration personas plus origin, proxy, image and Vercel-regression checks`);
