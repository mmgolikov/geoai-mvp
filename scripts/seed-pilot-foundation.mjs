// Canonical demo/project seed data is part of the immutable migration ledger.
// This former REST writer is quarantined because service/secret-key writes do
// not prove caller RLS and can bypass the intended identity plane.
console.log(JSON.stringify({
  ok: true,
  seeded: false,
  status: "operator_rest_seed_quarantined",
  blockers: [
    "Direct secret-key seed writes are disabled.",
    "Use clean migration replay for seed verification; use ADMIN-01 audited RPCs for future membership changes."
  ],
  nextActions: ["Run `supabase db reset` and `supabase test db` on a local/ephemeral target."],
  caveat: "No remote data was read or written."
}, null, 2));
