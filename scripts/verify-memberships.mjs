const strict = process.env.GEOAI_REQUIRE_SUPABASE_READY?.trim().toLowerCase() === "true";

console.log(JSON.stringify({
  ok: !strict,
  verified: false,
  status: "real_jwt_persona_evidence_required",
  blockers: [
    "Secret/service-role reads bypass RLS and are not membership authorization evidence.",
    "DB-01 requires the local/ephemeral SQL persona suite plus PostgREST tests with real caller JWTs."
  ],
  nextActions: ["Run `supabase test db` after clean replay, then execute the AUTH-01C HTTP persona matrix."],
  caveat: "No Supabase credential was loaded and no remote request was made."
}, null, 2));

process.exit(strict ? 1 : 0);
