import { readFile } from "node:fs/promises";

const files = [
  "src/lib/platform/pilot-backend-activation.ts",
  "src/lib/supabase/runtime-readiness.ts",
  "src/lib/storage/storage-readiness.ts",
  "src/lib/storage/storage-security-evidence.ts",
  "src/lib/audit/audit-evidence-kernel.ts"
];
const source = (await Promise.all(files.map((file) => readFile(file, "utf8")))).join("\n");
const forbidden = [
  "boolEnv(\"GEOAI_AUTH_SESSION_VERIFIED\")",
  "boolEnv(\"GEOAI_PROJECT_MEMBERSHIP_TESTS_VERIFIED\")",
  "boolEnv(\"GEOAI_RLS_POLICY_TESTS_VERIFIED\")",
  "process.env.GEOAI_AUTH_SESSION_VERIFIED",
  "process.env.GEOAI_PROJECT_MEMBERSHIP_TESTS_VERIFIED",
  "process.env.GEOAI_RLS_POLICY_TESTS_VERIFIED",
  "process.env.GEOAI_STORAGE_SIGNED_URL_VERIFIED",
  "process.env.GEOAI_STORAGE_LAST_VERIFIED_AT",
  "process.env.GEOAI_AUDIT_WRITE_READ_VERIFIED"
];
const findings = forbidden.filter((value) => source.includes(value));

if (findings.length > 0) {
  console.error("Readiness evidence contract failed: boolean environment claims can promote security readiness.");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}
if (!source.includes("requestAuthKernelStatus")) {
  console.error("Readiness evidence contract failed: request-auth kernel status is not part of readiness derivation.");
  process.exit(1);
}
if (!source.includes("storageSecurityEvidenceStatus") || !source.includes("auditEvidenceKernelStatus")) {
  console.error("Readiness evidence contract failed: Storage/audit evidence kernels are not part of readiness derivation.");
  process.exit(1);
}

console.log("Readiness evidence contract passed: Auth/membership/RLS/Storage/audit readiness cannot be promoted by boolean env claims or bucket reachability.");
