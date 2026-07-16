const requiredBuckets = [
  "geoai-data-room-assets",
  "geoai-validation-evidence",
  "geoai-report-exports",
  "geoai-aoi-imports"
];

const allowedMimeTypes = [
  "application/pdf",
  "text/csv",
  "application/json",
  "application/geo+json",
  "image/png",
  "image/jpeg",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
];

const hasSupabaseUrl = Boolean(process.env.GEOAI_OPERATOR_SUPABASE_URL?.trim());
const hasOperatorSecret = Boolean(process.env.GEOAI_OPERATOR_SUPABASE_SECRET_KEY?.trim());
const writeTestAllowed = process.env.GEOAI_ALLOW_STORAGE_WRITE_TEST?.trim().toLowerCase() === "true";
const signedUrlVerified = process.env.GEOAI_STORAGE_SIGNED_URL_VERIFIED?.trim().toLowerCase() === "true";

console.log("GeoAI storage readiness check");
console.log("=============================");
console.log(`provider: ${hasSupabaseUrl && hasOperatorSecret ? "supabase_storage_operator" : "local_metadata_only"}`);
console.log(`operator Supabase URL configured: ${hasSupabaseUrl ? "yes" : "no"}`);
console.log(`operator secret configured: ${hasOperatorSecret ? "yes" : "no"}`);
console.log(`write test allowed: ${writeTestAllowed ? "yes" : "no"}`);
console.log(`signed URL verified flag: ${signedUrlVerified ? "yes" : "no"}`);
console.log(`required buckets: ${requiredBuckets.join(", ")}`);
console.log(`max file size: 5 MB`);
console.log(`allowed MIME types: ${allowedMimeTypes.join(", ")}`);
console.log("caveat: Storage readiness is not secure enterprise storage until buckets, policies, signed URL flows and access enforcement are configured and verified.");

if (!hasSupabaseUrl || !hasOperatorSecret) {
  console.log("status: local metadata-only fallback; binary storage is not configured.");
  process.exit(0);
}

console.log("status: Supabase env appears configured. Verify buckets through /api/storage/health and run npm run storage:verify:signed-url from a trusted runtime if write testing is allowed.");
