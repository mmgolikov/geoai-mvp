const strict = process.env.GEOAI_REQUIRE_SUPABASE_READY?.trim().toLowerCase() === "true";

console.log(JSON.stringify({
  ok: !strict,
  verified: false,
  status: "transactional_audit_evidence_required",
  blockers: [
    "Direct secret-key audit inserts can forge actor/scope metadata and are not trustworthy evidence.",
    "AUDIT-01 must derive actor from auth.uid() and commit critical mutation plus audit atomically."
  ],
  nextActions: ["Implement and test the narrow audited mutation RPCs before enabling this verifier."],
  caveat: "No Supabase credential was loaded and no audit row was read, written or deleted."
}, null, 2));

process.exit(strict ? 1 : 0);
