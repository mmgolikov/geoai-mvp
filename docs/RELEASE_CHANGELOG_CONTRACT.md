# GeoAI Release and Changelog Contract

Status: Active release-governance authority
Last verified: 2026-08-18
Owner: GeoAI Release Engineering
Authority: Required evidence and lifecycle rules for release and change records
Successor: None; any replacement must update `DOCUMENTATION_INDEX.md`
Navigation: [Documentation Index](DOCUMENTATION_INDEX.md) · [Current Release State](CURRENT_RELEASE_STATE.md) · [Changelog](../CHANGELOG.md) · [Release Policy](RELEASE_AUTHORITY_POLICY.json)

## Change record

Every implementation starts with an approved Change Request that states the problem, business reason, users, affected surfaces, data/design/engineering impact, risks, acceptance criteria, rollback and non-authorizations. Scope expansion requires a new or amended approval before implementation.

## Release record

A release entry is complete only when it records:

- merged PR and exact `main` SHA;
- `release/production` SHA;
- Quality Gate run and whether every required job actually executed;
- Vercel deployment ID, immutable URL, Production alias, target and READY state;
- route/API smoke and runtime-log scope;
- product stage, runtime/data/source/Auth/Storage boundaries and S0 blockers;
- rollback status, including `unverified` when no target was re-certified;
- the mandatory data-honesty caveat.

An old successful CI run cannot neutralize a newer exact-SHA failure. A combined commit status that omits check runs is not a sufficient gate. Repository copies are time-boxed evidence; live GitHub/Vercel authority supersedes them. Every current external claim must declare `observedAt`, `validUntil` and an expiry action. The documentation gate must fail or emit the declared warning after expiry; the active registry uses `fail`. Refreshing one evidence class must not refresh unrelated GitHub, Vercel, runtime, Supabase, Figma or Confluence claims.

Supabase management status and physical database evidence are separate classes. A project lifecycle label such as `INACTIVE` or `ACTIVE_HEALTHY` cannot establish schema, migration, Auth/user rows, advisors, RLS, policies, PostgREST, Storage or source-row truth. Physical values require a fresh target-bound readback receipt.

## Changelog states

Use exactly one state per entry:

- `Unreleased` — local or branch work; no merge/deployment claim.
- `Released` — exact Git/Vercel production evidence exists.
- `Historical` — preserved point-in-time evidence superseded by a newer release.
- `Rejected` — explicitly not accepted as release evidence.

Every entry must distinguish code merged from runtime promoted. Preview is never Production. A design or database receipt must not be promoted to runtime authority by implication.

## External systems

GitHub, Vercel, Figma, Confluence and Supabase writes require their own explicit authorization. Read-only inspection does not authorize mutation. Secrets, credentials and identifying user data must never be recorded in release evidence.

## Rollback

Rollback instructions must name an exact reversible change or explicitly state that the rollback target is unverified. Do not invent a deployment ID. Local-only changes roll back by reverting the bounded change set; Production remains untouched until a separately authorized promotion.

Required caveat: **Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.**
