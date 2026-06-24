import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
const organizationId = "00000000-0000-4000-8000-000000000101";
const profileId = "00000000-0000-4000-8000-000000000102";
const projects = [
  { id: "00000000-0000-4000-8000-000000000201", project_key: "dubai-investment-screening-demo", name: "Dubai Investment Screening Demo", client_type: "investor", primary_scenario: "investment-site-selection" },
  { id: "00000000-0000-4000-8000-000000000202", project_key: "developer-land-pipeline-demo", name: "Developer Land Pipeline Demo", client_type: "developer", primary_scenario: "real-estate-development" },
  { id: "00000000-0000-4000-8000-000000000203", project_key: "bank-asset-review-demo", name: "Bank Asset Review Demo", client_type: "bank", primary_scenario: "climate-risk" }
];

function exitBlocked(blockers) {
  console.log(JSON.stringify({
    ok: true,
    seeded: false,
    status: "blocked",
    blockers,
    nextActions: ["Configure Supabase env, apply the v2.3 migration, then re-run this seed script."],
    caveat: "No seed data was written."
  }, null, 2));
  process.exit(0);
}

if (!url || !key) {
  exitBlocked(["Supabase URL/key env is missing."]);
}

const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const tableCheck = await client.from("projects").select("id", { head: true, count: "exact" });
if (tableCheck.error) {
  exitBlocked(["Supabase schema readiness failed; projects table is missing or unreachable."]);
}

function assertOk(label, response) {
  if (response.error) {
    throw new Error(`${label}: ${response.error.message}`);
  }
}

assertOk("organization", await client.from("organizations").upsert({
  id: organizationId,
  name: "GeoAI Demo Organization",
  slug: "geoai-demo-organization",
  status: "active",
  metadata: { seed: "pilot-foundation-v2.4" }
}));

assertOk("profile", await client.from("profiles").upsert({
  id: profileId,
  email: "demo@geoai.local",
  full_name: "GeoAI Demo User",
  metadata: { seed: "pilot-foundation-v2.4", caveat: "Demo profile only; not production authentication." }
}));

for (const project of projects) {
  assertOk(`project ${project.project_key}`, await client.from("projects").upsert({
    ...project,
    organization_id: organizationId,
    geography: "Dubai / UAE",
    status: "demo",
    data_mode: "demo_normalized",
    description: "Seeded GeoAI pilot foundation demo project.",
    created_by: profileId,
    metadata: { seed: "pilot-foundation-v2.4", caveat: "Screening hypothesis; official validation required." }
  }, { onConflict: "project_key" }));

  const membership = await client
    .from("project_memberships")
    .select("id")
    .eq("project_key", project.project_key)
    .eq("user_id", profileId)
    .maybeSingle();

  if (!membership.data) {
    assertOk(`membership ${project.project_key}`, await client.from("project_memberships").insert({
      organization_id: organizationId,
      project_id: project.id,
      project_key: project.project_key,
      user_id: profileId,
      role: "owner",
      status: "active"
    }));
  }
}

const sourceRows = [
  { source_id: "dld-dubai-pulse-snapshot", source_name: "DLD / Dubai Pulse snapshot", source_mode: "public_snapshot", connection_status: "snapshot_available", record_count: 5 },
  { source_id: "osm-geofabrik-open-snapshot", source_name: "OSM / Geofabrik open snapshot", source_mode: "open_snapshot", connection_status: "snapshot_available", record_count: 3 },
  { source_id: "geodubai-municipality-validation", source_name: "GeoDubai / Dubai Municipality validation", source_mode: "planned_validation", connection_status: "planned", record_count: 0 }
];

for (const source of sourceRows) {
  const existing = await client
    .from("source_registry_snapshots")
    .select("id")
    .eq("source_id", source.source_id)
    .is("project_key", null)
    .maybeSingle();

  if (!existing.data) {
    assertOk(`source ${source.source_id}`, await client.from("source_registry_snapshots").insert({
      organization_id: organizationId,
      ...source,
      category: "pilot_foundation",
      data_quality_tier: "screening",
      quality: { confidence: source.record_count > 0 ? "medium" : "planned" },
      lineage: { seed: "pilot-foundation-v2.4" },
      caveat: "Screening context only; official validation required."
    }));
  }
}

await client.from("audit_events").insert({
  organization_id: organizationId,
  actor_user_id: profileId,
  event_type: "project_updated",
  entity_type: "pilot_seed",
  entity_id: "pilot-foundation-v2.4",
  action: "Seeded pilot foundation",
  metadata: { projectCount: projects.length }
});

console.log(JSON.stringify({
  ok: true,
  seeded: true,
  organization: "GeoAI Demo Organization",
  projectKeys: projects.map((project) => project.project_key),
  caveat: "Seed data is demo/pilot foundation metadata; it is not official validation."
}, null, 2));
