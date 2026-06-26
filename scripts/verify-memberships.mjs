import { createClient } from "@supabase/supabase-js";

const strict = process.env.GEOAI_REQUIRE_SUPABASE_READY?.trim().toLowerCase() === "true";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
const requiredTables = ["organizations", "profiles", "projects", "project_memberships"];
const demoProjectKeys = [
  "dubai-investment-screening-demo",
  "developer-land-pipeline-demo",
  "bank-asset-review-demo"
];

function blocked(blockers) {
  console.log(JSON.stringify({
    ok: !strict,
    verified: false,
    status: "blocked",
    blockers,
    nextActions: [
      "Configure Supabase env, apply the v2.3 migration, seed pilot foundation, then re-run membership verification."
    ],
    caveat: "Demo access is not production authentication."
  }, null, 2));
  process.exit(strict ? 1 : 0);
}

if (!url || !key) blocked(["Supabase URL/key env is missing."]);

const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const tableChecks = await Promise.all(requiredTables.map(async (table) => {
  const { error } = await client.from(table).select("id", { head: true, count: "exact" });
  return { table, ready: !error };
}));
const missingTables = tableChecks.filter((item) => !item.ready).map((item) => item.table);
if (missingTables.length > 0) blocked([`Missing or unreachable membership table(s): ${missingTables.join(", ")}`]);

const membershipChecks = await Promise.all(demoProjectKeys.map(async (projectKey) => {
  const { data, error } = await client
    .from("project_memberships")
    .select("id, role, status")
    .eq("project_key", projectKey)
    .in("role", ["owner", "admin"])
    .eq("status", "active");
  return { projectKey, ready: !error && Array.isArray(data) && data.length > 0, count: Array.isArray(data) ? data.length : 0 };
}));
const missingMemberships = membershipChecks.filter((item) => !item.ready).map((item) => item.projectKey);
if (missingMemberships.length > 0) {
  blocked([`No active owner/admin membership found for: ${missingMemberships.join(", ")}`]);
}

console.log(JSON.stringify({
  ok: true,
  verified: true,
  status: "memberships_verified",
  checkedTables: requiredTables,
  projectKeys: demoProjectKeys,
  membershipCounts: membershipChecks,
  caveat: "Membership readiness is technical verification only; production route enforcement still requires deployment governance."
}, null, 2));
