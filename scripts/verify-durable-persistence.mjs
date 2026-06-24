import { createClient } from "@supabase/supabase-js";

const strict = process.env.GEOAI_REQUIRE_SUPABASE_READY?.trim().toLowerCase() === "true";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
const projectKey = "dubai-investment-screening-demo";
const qaId = "00000000-0000-4000-8000-000000009901";

function blocked(blockers) {
  console.log(JSON.stringify({
    ok: !strict,
    verified: false,
    status: "local_fallback_only",
    blockers,
    nextActions: ["Configure Supabase env, apply migration, seed pilot foundation, then re-run this verifier."],
    caveat: "Local/API fallback is not durable production storage."
  }, null, 2));
  process.exit(strict ? 1 : 0);
}

if (!url || !key) blocked(["Supabase URL/key env is missing."]);

const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const tableCheck = await client.from("projects").select("id", { head: true, count: "exact" });
if (tableCheck.error) blocked(["Supabase schema readiness failed; projects table is missing or unreachable."]);

async function assertOk(label, response) {
  if (response.error) throw new Error(`${label}: ${response.error.message}`);
  return response.data ?? null;
}

const cleanup = async () => {
  await client.from("audit_events").delete().eq("entity_id", qaId);
  await client.from("pilot_workflows").delete().eq("id", qaId);
  await client.from("data_room_assets").delete().eq("id", qaId);
  await client.from("reports").delete().eq("report_key", "qa-persistence-report-v24");
  await client.from("analysis_runs").delete().eq("run_key", "qa-persistence-run-v24");
  await client.from("aois").delete().eq("id", qaId);
};

try {
  await cleanup();
  await assertOk("create aoi", await client.from("aois").insert({
    id: qaId,
    project_key: projectKey,
    name: "QA persistence AOI",
    geometry_type: "Polygon",
    source_type: "qa",
    data_mode: "test",
    validation_status: "validation_required",
    measurements: { areaSqM: 1000 },
    properties: { qa: true },
    caveat: "QA test geometry only."
  }));
  await assertOk("read aoi", await client.from("aois").select("id").eq("id", qaId).single());
  await assertOk("create analysis", await client.from("analysis_runs").insert({
    project_key: projectKey,
    run_key: "qa-persistence-run-v24",
    scenario_id: "qa",
    selected_name: "QA persistence AOI",
    selected_type: "aoi",
    result_json: { qa: true },
    result_payload: { qa: true },
    analysis_mode: "deterministic_fallback"
  }));
  await assertOk("create report", await client.from("reports").insert({
    project_key: projectKey,
    report_key: "qa-persistence-report-v24",
    report_type: "analysis",
    title: "QA persistence report",
    report_json: { qa: true }
  }));
  await assertOk("create data room asset", await client.from("data_room_assets").insert({
    id: qaId,
    project_key: projectKey,
    name: "QA data room asset",
    asset_type: "validation_note",
    source_type: "generated_by_geoai",
    validation_status: "validation_required",
    metadata: { qa: true }
  }));
  await assertOk("create pilot workflow", await client.from("pilot_workflows").insert({
    id: qaId,
    project_key: projectKey,
    title: "QA pilot workflow",
    decision_question: "Verify durable persistence?",
    metadata: { qa: true }
  }));
  await assertOk("create audit", await client.from("audit_events").insert({
    project_key: projectKey,
    event_type: "project_updated",
    entity_type: "qa_persistence",
    entity_id: qaId,
    action: "Verified durable persistence",
    metadata: { qa: true }
  }));
  await cleanup();

  console.log(JSON.stringify({
    ok: true,
    verified: true,
    status: "durable_persistence_verified",
    tested: ["aois", "analysis_runs", "reports", "data_room_assets", "pilot_workflows", "audit_events"],
    cleanup: "complete"
  }, null, 2));
} catch (error) {
  await cleanup();
  console.log(JSON.stringify({
    ok: false,
    verified: false,
    status: "verification_failed",
    blocker: error instanceof Error ? error.message : "Unknown verification failure.",
    cleanup: "attempted"
  }, null, 2));
  process.exit(1);
}
