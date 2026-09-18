import {
  assertPortableRuntimeConfiguration,
  resolveRuntimeTarget,
  validatePortableRuntimeFingerprint
} from "@/src/lib/platform/runtime-environment";

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

function assertNoPrivilegedPortableEnvironment() {
  const portableRequested = process.env.GEOAI_RUNTIME_TARGET?.trim() === "self_hosted_candidate" ||
    process.env.GEOAI_BUILD_TARGET?.trim() === "self_hosted_candidate";
  if (!portableRequested) return;
  for (const [name, value] of Object.entries(process.env)) {
    if (!value?.trim()) continue;
    if (forbiddenPortableServerVariables.has(name) || name.startsWith("GEOAI_OPERATOR_")) {
      throw new Error("Portable runtime configuration rejected: privileged_server_variable_forbidden");
    }
  }
}

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    assertNoPrivilegedPortableEnvironment();
    assertPortableRuntimeConfiguration();
    if (resolveRuntimeTarget() === "self_hosted_candidate" && !await validatePortableRuntimeFingerprint()) {
      throw new Error("Portable runtime configuration rejected: public_build_fingerprint_invalid");
    }
  }
}
