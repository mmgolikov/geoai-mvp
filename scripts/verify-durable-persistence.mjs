const strict = process.env.GEOAI_REQUIRE_SUPABASE_READY?.trim().toLowerCase() === "true";

console.log(JSON.stringify({
  ok: !strict,
  verified: false,
  status: "caller_scoped_persistence_evidence_required",
  blockers: [
    "Direct secret/service-key mutation tests are quarantined because they bypass caller authorization.",
    "Durability must be proven with real authenticated personas after DB-01 clean/upgrade replay."
  ],
  nextActions: ["Run the SQL persona suite and AUTH-01C route tests on the approved ephemeral target."],
  caveat: "No Supabase credential was loaded and no remote row was read, written or deleted."
}, null, 2));

process.exit(strict ? 1 : 0);
