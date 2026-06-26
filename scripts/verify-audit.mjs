import { createClient } from "@supabase/supabase-js";

const strict = process.env.GEOAI_REQUIRE_SUPABASE_READY?.trim().toLowerCase() === "true";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
const qaId = `audit-verify-${Date.now()}`;

function blocked(blockers) {
  console.log(JSON.stringify({
    ok: !strict,
    verified: false,
    status: "blocked",
    blockers,
    nextActions: ["Configure Supabase env, apply migration, then re-run audit verification."],
    caveat: "Audit events are a foundation only, not a certified audit trail."
  }, null, 2));
  process.exit(strict ? 1 : 0);
}

if (!url || !key) blocked(["Supabase URL/key env is missing."]);

const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const tableCheck = await client.from("audit_events").select("id", { head: true, count: "exact" });
if (tableCheck.error) blocked(["audit_events table is missing or unreachable."]);

try {
  const insert = await client.from("audit_events").insert({
    project_key: "dubai-investment-screening-demo",
    event_type: "project_updated",
    entity_type: "audit_verification",
    entity_id: qaId,
    action: "Verified audit write/read path",
    metadata: { qa: true, script: "audit:verify" }
  }).select("id").single();
  if (insert.error) throw new Error(insert.error.message);

  const read = await client.from("audit_events").select("id").eq("entity_id", qaId).single();
  if (read.error) throw new Error(read.error.message);

  await client.from("audit_events").delete().eq("entity_id", qaId);
  console.log(JSON.stringify({
    ok: true,
    verified: true,
    status: "audit_write_read_verified",
    cleanup: "complete",
    caveat: "Audit write/read verification is not a certified audit trail."
  }, null, 2));
} catch (error) {
  await client.from("audit_events").delete().eq("entity_id", qaId);
  console.log(JSON.stringify({
    ok: false,
    verified: false,
    status: "verification_failed",
    blocker: error instanceof Error ? error.message : "Unknown audit verification failure.",
    cleanup: "attempted",
    caveat: "Audit events are a foundation only, not a certified audit trail."
  }, null, 2));
  process.exit(1);
}
