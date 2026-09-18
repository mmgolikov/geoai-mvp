export type GeoAIRuntimeTarget =
  | "local_development"
  | "vercel_preview"
  | "vercel_production_demo"
  | "self_hosted_candidate";

export type RuntimeEnvironmentSource = Readonly<Record<string, string | undefined>>;

export type PortableRuntimeValidation =
  | {
      ok: true;
      target: "self_hosted_candidate";
      publicOrigin: string;
      releaseCommit: string;
      publicBuildFingerprint: string;
    }
  | {
      ok: false;
      target: GeoAIRuntimeTarget | "unknown";
      issues: string[];
    };

const exactTrue = (value: string | undefined) => value?.trim().toLowerCase() === "true";
const exactFalse = (value: string | undefined) => value?.trim().toLowerCase() === "false";
// Next.js replaces this direct NEXT_PUBLIC_* reference during the build. The
// runtime compares that embedded value with the operator-supplied expectation.
const embeddedPublicBuildFingerprint = process.env.NEXT_PUBLIC_GEOAI_BUILD_FINGERPRINT;

function isPresent(value: string | undefined) {
  return Boolean(value?.trim());
}

export function getPublicBuildFingerprintPayload(environment: RuntimeEnvironmentSource) {
  return JSON.stringify({
    authMode: environment.NEXT_PUBLIC_AUTH_MODE?.trim() ?? "",
    supabaseUrl: environment.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "",
    supabasePublishableKey: environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "",
    mapboxToken: environment.NEXT_PUBLIC_MAPBOX_TOKEN?.trim() ?? ""
  });
}

export async function computePublicBuildFingerprint(environment: RuntimeEnvironmentSource) {
  const bytes = new TextEncoder().encode(getPublicBuildFingerprintPayload(environment));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function parsePublicOrigin(value: string | undefined) {
  if (!value?.trim()) return null;
  try {
    const parsed = new URL(value.trim());
    if (
      parsed.protocol !== "https:" ||
      parsed.username ||
      parsed.password ||
      parsed.port ||
      parsed.pathname !== "/" ||
      parsed.search ||
      parsed.hash ||
      parsed.hostname === "localhost" ||
      parsed.hostname.endsWith(".localhost") ||
      /^(?:127\.|0\.|10\.|192\.168\.|169\.254\.)/.test(parsed.hostname) ||
      /^172\.(?:1[6-9]|2\d|3[01])\./.test(parsed.hostname) ||
      !parsed.hostname.includes(".") ||
      /^\d+(?:\.\d+){3}$/.test(parsed.hostname) ||
      parsed.hostname.includes(":") ||
      parsed.hostname === "[::1]" ||
      parsed.hostname === "0.0.0.0"
    ) {
      return null;
    }
    return parsed.origin.toLowerCase();
  } catch {
    return null;
  }
}

export function resolveRuntimeTarget(
  environment: RuntimeEnvironmentSource = process.env
): GeoAIRuntimeTarget | "unknown" {
  const vercelEnvironment = environment.VERCEL_ENV?.trim();
  const requestedTarget = environment.GEOAI_RUNTIME_TARGET?.trim();
  if (vercelEnvironment === "production") return "vercel_production_demo";
  if (vercelEnvironment === "preview") return "vercel_preview";
  if (requestedTarget === "self_hosted_candidate") return "self_hosted_candidate";
  if (requestedTarget) return "unknown";
  return "local_development";
}

export function getSelfHostedPublicOrigin(
  environment: RuntimeEnvironmentSource = process.env
): string | null {
  if (resolveRuntimeTarget(environment) !== "self_hosted_candidate") return null;
  return parsePublicOrigin(environment.GEOAI_PUBLIC_ORIGIN);
}

export function validatePortableRuntimeConfiguration(
  environment: RuntimeEnvironmentSource = process.env
): PortableRuntimeValidation {
  const target = resolveRuntimeTarget(environment);
  if (target !== "self_hosted_candidate") {
    return { ok: false, target, issues: [target === "unknown" ? "unknown_runtime_target" : "not_self_hosted_candidate"] };
  }

  const issues: string[] = [];
  const publicOrigin = parsePublicOrigin(environment.GEOAI_PUBLIC_ORIGIN);
  const releaseCommit = environment.GEOAI_RELEASE_COMMIT_SHA?.trim().toLowerCase() ?? "";
  const buildFingerprint = (environment === process.env
    ? embeddedPublicBuildFingerprint
    : environment.NEXT_PUBLIC_GEOAI_BUILD_FINGERPRINT)?.trim().toLowerCase() ?? "";
  const runtimeFingerprint = environment.GEOAI_PUBLIC_BUILD_FINGERPRINT?.trim().toLowerCase() ?? "";

  if (!publicOrigin) issues.push("invalid_public_origin");
  if (
    !environment.GEOAI_PUBLIC_HOST?.trim() ||
    (publicOrigin && environment.GEOAI_PUBLIC_HOST.trim().toLowerCase() !== new URL(publicOrigin).hostname)
  ) {
    issues.push("public_host_origin_mismatch");
  }
  if (!/^[0-9a-f]{40}$/.test(releaseCommit)) issues.push("invalid_release_commit");
  if (!/^[0-9a-f]{64}$/.test(buildFingerprint) || buildFingerprint !== runtimeFingerprint) {
    issues.push("public_build_fingerprint_mismatch");
  }
  if (environment.GEOAI_BUILD_TARGET?.trim() !== "self_hosted_candidate") issues.push("build_target_mismatch");
  if (environment.NEXT_PUBLIC_AUTH_MODE?.trim() !== "supabase_auth") issues.push("auth_mode_not_supabase");
  if (environment.GEOAI_ACCESS_ENFORCEMENT_MODE?.trim() !== "hard") issues.push("access_enforcement_not_hard");
  if (!exactTrue(environment.GEOAI_REQUIRE_SUPABASE_READY)) issues.push("supabase_readiness_not_required");
  if (!exactFalse(environment.GEOAI_REQUIRE_STORAGE_READY)) issues.push("storage_readiness_must_be_false");
  if (!exactFalse(environment.GEOAI_ALLOW_DEMO_PUBLIC)) issues.push("demo_public_not_disabled");
  if (!exactFalse(environment.GEOAI_ALLOW_POINT_OBJECT_SELF_HOSTED_AI)) issues.push("self_hosted_ai_not_disabled");
  if (!exactFalse(environment.GEOAI_ALLOW_POINT_OBJECT_SELF_HOSTED_PERSISTENCE)) {
    issues.push("self_hosted_persistence_not_disabled");
  }
  if (!exactFalse(environment.GEOAI_ALLOW_OPENAI_UPSTREAM)) issues.push("general_upstream_not_disabled");
  if (exactTrue(environment.NEXT_PUBLIC_GEOAI_ALLOW_LOCAL_SUPABASE)) issues.push("local_supabase_enabled");

  const supabaseUrl = environment.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  if (supabaseUrl !== "https://pphdqkurxneyagvnnjdt.supabase.co") issues.push("supabase_target_mismatch");
  if (!/^sb_publishable_[A-Za-z0-9_-]{16,}$/.test(environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "")) {
    issues.push("publishable_key_missing_or_invalid");
  }
  if (!isPresent(environment.NEXT_PUBLIC_MAPBOX_TOKEN)) issues.push("mapbox_token_missing");

  for (const [name, value] of Object.entries(environment)) {
    if (!isPresent(value)) continue;
    if (name === "VERCEL" || name.startsWith("VERCEL_")) issues.push("vercel_identity_conflict");
  }
  if (exactTrue(environment.GEOAI_ALLOW_SUPABASE_MIGRATION_APPLY)) issues.push("migration_apply_forbidden");
  if (exactTrue(environment.GEOAI_ALLOW_STORAGE_WRITE_TEST)) issues.push("storage_write_test_forbidden");

  const uniqueIssues = [...new Set(issues)];
  if (uniqueIssues.length > 0 || !publicOrigin) return { ok: false, target, issues: uniqueIssues };
  return {
    ok: true,
    target,
    publicOrigin,
    releaseCommit,
    publicBuildFingerprint: buildFingerprint
  };
}

export async function validatePortableRuntimeFingerprint(environment: RuntimeEnvironmentSource = process.env) {
  const validation = validatePortableRuntimeConfiguration(environment);
  if (!validation.ok) return false;
  return await computePublicBuildFingerprint(environment) === validation.publicBuildFingerprint;
}

export function assertPortableRuntimeConfiguration(environment: RuntimeEnvironmentSource = process.env) {
  const requestedTarget = environment.GEOAI_RUNTIME_TARGET?.trim();
  const buildTarget = environment.GEOAI_BUILD_TARGET?.trim();
  if (buildTarget && buildTarget !== "self_hosted_candidate") {
    throw new Error("Portable runtime configuration rejected: unknown_build_target");
  }
  if (buildTarget === "self_hosted_candidate" && requestedTarget !== "self_hosted_candidate") {
    throw new Error("Portable runtime configuration rejected: runtime_target_missing_or_conflicting");
  }
  if (requestedTarget && requestedTarget !== "self_hosted_candidate") {
    throw new Error("Portable runtime configuration rejected: unknown_runtime_target");
  }
  if (requestedTarget === "self_hosted_candidate") {
    const validation = validatePortableRuntimeConfiguration(environment);
    if (!validation.ok) {
      throw new Error(`Portable runtime configuration rejected: ${validation.issues.join(",")}`);
    }
    return;
  }
  const target = resolveRuntimeTarget(environment);
  if (target === "local_development" || target === "vercel_preview" || target === "vercel_production_demo") return;
  const validation = validatePortableRuntimeConfiguration(environment);
  if (!validation.ok) {
    throw new Error(`Portable runtime configuration rejected: ${validation.issues.join(",")}`);
  }
}
