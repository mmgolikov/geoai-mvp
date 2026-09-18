import { createHash } from "node:crypto";
import { chmodSync, copyFileSync, existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const BUILD_TARGET = "self_hosted_candidate";
const BUILD_SEAL_SCHEMA_VERSION = 1;
const DEFAULT_SEAL_PATH = resolve(fileURLToPath(new URL(".", import.meta.url)), "self-host-build-seal.json");
const HASH_PATTERN = /^[0-9a-f]{64}$/;
const COMMIT_PATTERN = /^[0-9a-f]{40}$/;
const forbiddenPortableServerVariables = new Set([
  "DATABASE_URL",
  "DIRECT_URL",
  "POSTGRES_URL",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL_NON_POOLING",
  "SUPABASE_DB_URL",
  "SUPABASE_DATABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_SECRET_KEY",
  "OPENAI_API_KEY"
]);

function exactTrue(value) {
  return value?.trim().toLowerCase() === "true";
}

function exactFalse(value) {
  return value?.trim().toLowerCase() === "false";
}

function isPresent(value) {
  return Boolean(value?.trim());
}

function publicBuildPayload(environment) {
  return JSON.stringify({
    authMode: environment.NEXT_PUBLIC_AUTH_MODE?.trim() ?? "",
    supabaseUrl: environment.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "",
    supabasePublishableKey: environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "",
    mapboxToken: environment.NEXT_PUBLIC_MAPBOX_TOKEN?.trim() ?? ""
  });
}

function publicBuildFingerprint(environment) {
  return createHash("sha256").update(publicBuildPayload(environment)).digest("hex");
}

function validPublicOrigin(value) {
  if (!value?.trim()) return null;
  try {
    const parsed = new URL(value.trim());
    if (
      parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.port ||
      parsed.pathname !== "/" || parsed.search || parsed.hash ||
      parsed.hostname === "localhost" || parsed.hostname.endsWith(".localhost") ||
      /^(?:127\.|0\.|10\.|192\.168\.|169\.254\.)/.test(parsed.hostname) ||
      /^172\.(?:1[6-9]|2\d|3[01])\./.test(parsed.hostname) ||
      !parsed.hostname.includes(".") || /^\d+(?:\.\d+){3}$/.test(parsed.hostname) ||
      parsed.hostname.includes(":") || parsed.hostname === "[::1]" || parsed.hostname === "0.0.0.0"
    ) return null;
    return parsed.origin.toLowerCase();
  } catch {
    return null;
  }
}

function reject(issues) {
  const unique = [...new Set(issues)];
  throw new Error(`Portable runtime configuration rejected: ${unique.join(",")}`);
}

function parseSeal(sealPath) {
  let value;
  try {
    value = JSON.parse(readFileSync(sealPath, "utf8"));
  } catch {
    reject(["build_seal_missing_or_invalid"]);
  }
  if (
    !value || typeof value !== "object" || Array.isArray(value) ||
    Object.keys(value).sort().join(",") !== "buildTarget,publicBuildFingerprint,releaseCommit,schemaVersion" ||
    value.schemaVersion !== BUILD_SEAL_SCHEMA_VERSION || value.buildTarget !== BUILD_TARGET ||
    typeof value.publicBuildFingerprint !== "string" || !HASH_PATTERN.test(value.publicBuildFingerprint) ||
    typeof value.releaseCommit !== "string" || !COMMIT_PATTERN.test(value.releaseCommit)
  ) reject(["build_seal_missing_or_invalid"]);
  return value;
}

function validateRuntime(environment, seal) {
  const issues = [];
  const publicOrigin = validPublicOrigin(environment.GEOAI_PUBLIC_ORIGIN);
  const runtimeFingerprint = environment.GEOAI_PUBLIC_BUILD_FINGERPRINT?.trim().toLowerCase() ?? "";
  const computedFingerprint = publicBuildFingerprint(environment);
  const releaseCommit = environment.GEOAI_RELEASE_COMMIT_SHA?.trim().toLowerCase() ?? "";

  if (environment.GEOAI_BUILD_TARGET?.trim() !== BUILD_TARGET) issues.push("build_target_mismatch");
  if (environment.GEOAI_RUNTIME_TARGET?.trim() !== BUILD_TARGET) issues.push("runtime_target_missing_or_conflicting");
  if (!publicOrigin) issues.push("invalid_public_origin");
  if (!environment.GEOAI_PUBLIC_HOST?.trim() ||
      (publicOrigin && environment.GEOAI_PUBLIC_HOST.trim().toLowerCase() !== new URL(publicOrigin).hostname)) {
    issues.push("public_host_origin_mismatch");
  }
  if (!COMMIT_PATTERN.test(releaseCommit) || releaseCommit !== seal.releaseCommit) issues.push("release_commit_mismatch");
  if (!HASH_PATTERN.test(runtimeFingerprint) || runtimeFingerprint !== seal.publicBuildFingerprint ||
      computedFingerprint !== seal.publicBuildFingerprint) {
    issues.push("public_build_fingerprint_mismatch");
  }
  if (environment.NEXT_PUBLIC_AUTH_MODE?.trim() !== "supabase_auth") issues.push("auth_mode_not_supabase");
  if (environment.GEOAI_ACCESS_ENFORCEMENT_MODE?.trim() !== "hard") issues.push("access_enforcement_not_hard");
  if (!exactTrue(environment.GEOAI_REQUIRE_SUPABASE_READY)) issues.push("supabase_readiness_not_required");
  if (!exactFalse(environment.GEOAI_REQUIRE_STORAGE_READY)) issues.push("storage_readiness_must_be_false");
  if (!exactFalse(environment.GEOAI_ALLOW_DEMO_PUBLIC)) issues.push("demo_public_not_disabled");
  if (!exactFalse(environment.GEOAI_ALLOW_POINT_OBJECT_SELF_HOSTED_AI)) issues.push("self_hosted_ai_not_disabled");
  if (!exactFalse(environment.GEOAI_ALLOW_POINT_OBJECT_SELF_HOSTED_PERSISTENCE)) issues.push("self_hosted_persistence_not_disabled");
  if (!exactFalse(environment.GEOAI_ALLOW_OPENAI_UPSTREAM)) issues.push("general_upstream_not_disabled");
  if (exactTrue(environment.NEXT_PUBLIC_GEOAI_ALLOW_LOCAL_SUPABASE)) issues.push("local_supabase_enabled");
  if (environment.NEXT_PUBLIC_SUPABASE_URL?.trim() !== "https://pphdqkurxneyagvnnjdt.supabase.co") {
    issues.push("supabase_target_mismatch");
  }
  if (!/^sb_publishable_[A-Za-z0-9_-]{16,}$/.test(environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "")) {
    issues.push("publishable_key_missing_or_invalid");
  }
  if (!isPresent(environment.NEXT_PUBLIC_MAPBOX_TOKEN)) issues.push("mapbox_token_missing");
  for (const [name, value] of Object.entries(environment)) {
    if (!isPresent(value)) continue;
    if (name === "VERCEL" || name.startsWith("VERCEL_")) issues.push("vercel_identity_conflict");
    if (forbiddenPortableServerVariables.has(name) || name.startsWith("GEOAI_OPERATOR_")) {
      issues.push("privileged_server_variable_forbidden");
    }
  }
  if (exactTrue(environment.GEOAI_ALLOW_SUPABASE_MIGRATION_APPLY)) issues.push("migration_apply_forbidden");
  if (exactTrue(environment.GEOAI_ALLOW_STORAGE_WRITE_TEST)) issues.push("storage_write_test_forbidden");
  if (issues.length > 0) reject(issues);
}

function writeBuildSeal(outputPath, environment) {
  const fingerprint = publicBuildFingerprint(environment);
  const expectedFingerprint = environment.GEOAI_PUBLIC_BUILD_FINGERPRINT?.trim().toLowerCase() ?? "";
  const releaseCommit = environment.GEOAI_RELEASE_COMMIT_SHA?.trim().toLowerCase() ?? "";
  const issues = [];
  if (environment.GEOAI_BUILD_TARGET?.trim() !== BUILD_TARGET) issues.push("build_target_mismatch");
  if (!HASH_PATTERN.test(expectedFingerprint) || expectedFingerprint !== fingerprint) {
    issues.push("public_build_fingerprint_mismatch");
  }
  if (!COMMIT_PATTERN.test(releaseCommit)) issues.push("invalid_release_commit");
  if (issues.length > 0) reject(issues);
  writeFileSync(outputPath, `${JSON.stringify({
    schemaVersion: BUILD_SEAL_SCHEMA_VERSION,
    buildTarget: BUILD_TARGET,
    publicBuildFingerprint: fingerprint,
    releaseCommit
  })}\n`, { encoding: "utf8", mode: 0o444 });
}

function installStandalone(targetDirectory, environment) {
  const directory = resolve(targetDirectory);
  const generatedServer = resolve(directory, "server.js");
  const sealedServer = resolve(directory, "next-server.js");
  if (!existsSync(generatedServer) || existsSync(sealedServer)) reject(["standalone_install_state_invalid"]);
  writeBuildSeal(resolve(directory, "self-host-build-seal.json"), environment);
  renameSync(generatedServer, sealedServer);
  copyFileSync(fileURLToPath(import.meta.url), generatedServer);
  chmodSync(generatedServer, 0o444);
}

const [mode, modeValue, ...extra] = process.argv.slice(2);
if (extra.length > 0 || (mode && mode !== "--check-only" && mode !== "--install-standalone")) {
  console.error("Portable runtime configuration rejected: invalid_bootstrap_arguments");
  process.exit(64);
}

if (mode === "--install-standalone") {
  if (!modeValue) {
    console.error("Portable runtime configuration rejected: standalone_output_missing");
    process.exit(64);
  }
  try {
    installStandalone(modeValue, process.env);
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Portable runtime configuration rejected: build_seal_write_failed");
    process.exit(78);
  }
  process.exit(0);
}

if (modeValue) {
  console.error("Portable runtime configuration rejected: invalid_bootstrap_arguments");
  process.exit(64);
}

try {
  validateRuntime(process.env, parseSeal(DEFAULT_SEAL_PATH));
} catch (error) {
  console.error(error instanceof Error ? error.message : "Portable runtime configuration rejected: bootstrap_failed");
  process.exit(78);
}

if (mode === "--check-only") {
  console.log("Portable runtime preflight passed.");
  process.exit(0);
}

await import("./next-server.js");
