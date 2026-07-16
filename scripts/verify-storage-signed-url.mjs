import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const allowWriteTest = process.env.GEOAI_ALLOW_STORAGE_WRITE_TEST?.trim().toLowerCase() === "true";
const bucket = "geoai-validation-evidence";
const objectPath = `qa/signed-url-verify-${Date.now()}.txt`;
const projectRef = url?.match(/^https:\/\/([a-z0-9-]+)\.supabase\.co/i)?.[1] ?? null;
const deploymentSha = (process.env.GEOAI_EVIDENCE_DEPLOYMENT_SHA || process.env.VERCEL_GIT_COMMIT_SHA || "").trim();

function blocked(blockers) {
  console.log(JSON.stringify({
    ok: true,
    verified: false,
    status: "dry_run_blocked",
    writeTestAllowed: allowWriteTest,
    blockers,
    nextActions: [
      "Configure Supabase service-role env in a trusted server runtime.",
      "Create required private buckets and policies.",
      "Set GEOAI_ALLOW_STORAGE_WRITE_TEST=true only when a temporary write/delete test is safe."
    ],
    caveat: "Storage readiness is not secure enterprise storage until buckets, policies, signed URL flows and access enforcement are configured and verified."
  }, null, 2));
  process.exit(0);
}

if (!url || !key) blocked(["Supabase URL/service role env is missing."]);
if (!allowWriteTest) blocked(["GEOAI_ALLOW_STORAGE_WRITE_TEST=true is required before writing a temporary object."]);
if (!projectRef || !/^[a-f0-9]{40}$/i.test(deploymentSha)) blocked(["Exact 40-character GEOAI_EVIDENCE_DEPLOYMENT_SHA and a valid Supabase project URL are required."]);

const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const bucketCheck = await client.storage.getBucket(bucket);
if (bucketCheck.error) blocked([`Required bucket is missing or unreachable: ${bucket}`]);

try {
  const upload = await client.storage.from(bucket).upload(objectPath, new Blob(["GeoAI signed URL verification"]), {
    contentType: "text/plain",
    upsert: true
  });
  if (upload.error) throw new Error(upload.error.message);

  const signed = await client.storage.from(bucket).createSignedUrl(objectPath, 60);
  if (signed.error || !signed.data?.signedUrl) throw new Error(signed.error?.message ?? "Signed URL was not returned.");

  const response = await fetch(signed.data.signedUrl);
  if (!response.ok) throw new Error(`Signed URL download returned HTTP ${response.status}.`);

  await client.storage.from(bucket).remove([objectPath]);
  console.log(JSON.stringify({
    ok: true,
    verified: true,
    status: "signed_url_verified",
    bucket,
    cleanup: "temporary object removed",
    projectRef,
    deploymentSha,
    nextActions: ["Capture this exact-SHA artifact, then run real authenticated upload/download/delete, no-session, wrong-tenant and revocation tests before protected use. Runtime readiness intentionally remains blocked until that evidence kernel exists."],
    caveat: "Signed URL verification is technical readiness only; protected client use still requires hard access enforcement."
  }, null, 2));
} catch (error) {
  await client.storage.from(bucket).remove([objectPath]).catch?.(() => undefined);
  console.log(JSON.stringify({
    ok: false,
    verified: false,
    status: "verification_failed",
    blocker: error instanceof Error ? error.message : "Unknown signed URL verification failure.",
    cleanup: "attempted"
  }, null, 2));
  process.exit(1);
}
