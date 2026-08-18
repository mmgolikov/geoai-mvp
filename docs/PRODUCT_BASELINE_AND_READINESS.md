# GeoAI Product Baseline and Readiness

Status: Active product and readiness authority
Last verified: 2026-08-18
Owner: GeoAI Product / Engineering
Authority: Current released product baseline, scope and readiness matrix
Successor: None; any replacement must update `DOCUMENTATION_INDEX.md`
Released baseline: PR #113 / `7f323c4227f2409f3fe2d4d68be48a30176f4e2a` / `dpl_4yBHCo1eZ7N6GYQWGAg1EdQGwFTE` / https://geoai-mvp.vercel.app
Navigation: [Documentation Index](DOCUMENTATION_INDEX.md) · [Current Release State](CURRENT_RELEASE_STATE.md) · [Authority Registry](EXTERNAL_AUTHORITY_REGISTRY.json) · [Roadmap](roadmap.md)

## Product direction

GeoAI is a B2B/B2G/B2B2G spatial decision intelligence platform for deciding where to build, buy, invest, monitor, insure, reconstruct or optimize land, real estate, infrastructure and other spatial assets.

The first geographic priority is MENA/GCC: UAE first, followed by Saudi Arabia, Qatar, Oman, Bahrain and Kuwait. Phase two covers Asia, beginning with Singapore, Hong Kong and other fast-growing major cities. Current product focus is real estate/development, construction monitoring and source-backed site screening.

The canonical decision flow is:

```text
role/scenario
  -> map-first or criteria-first
  -> candidates
  -> ranked shortlist/comparison
  -> individual dashboard
  -> source lineage/evidence
  -> report/export
  -> Project Hub/data room
```

Each output must make the situation, change, risk, business impact, next action and source/evidence basis explicit.

## Visual and interaction baseline

The active visual/product reference is the released Production runtime at the exact tuple above, including the PR #113 Product System v3.2.2 correction. Preserve its light enterprise presentation, navigation, route bodies and responsive behavior.

Historical v3.2.1 Figma/CR receipts remain provenance, not current release authority. Live Figma parity for the released v3.2.2 correction is only partially verified, so Production is the visual baseline until a separate owner-approved design Change Request says otherwise. PR #143 is `excluded_non_authority` and must not be used as a design or implementation source.

## Stage and readiness matrix

| Dimension | Current state | Evidence status | Activation boundary |
| --- | --- | --- | --- |
| Product stage | `public_demo_prototype` | Confirmed live | No Production-ready or pilot-ready claim |
| Runtime mode | `public_demo_only`, `browser_local`, `demo_public`, soft access | Confirmed live | Use synthetic/sample/browser-local data only |
| Public workflow | Map-first and criteria-first demo, comparison, dashboards, reports and Project Hub | Confirmed released; browser smoke is bounded | Not protected multi-user operation |
| Production database | Supabase not configured | Confirmed public runtime boundary | DB-01 and owner-controlled activation required |
| Non-Production Supabase | Management metadata only: `geoai-dev` `INACTIVE`; `geoai-auth-rehearsal` `ACTIVE_HEALTHY` | Partial and time-boxed | Physical schema/ledger/rows/advisors/RLS/policies/PostgREST/Storage/source state unverified |
| Auth/RBAC | Browser-local demo; protected request-scoped personas not activated | Partial/static | AUTH-01 required |
| Protected Storage | Not active | Blocked | STORAGE-01 required |
| Real-source custody | Not active | Blocked | SOURCE-01 required |
| Confidential pilot | Blocked | Confirmed live | All S0 gates plus owner release decision required |

## S0 blockers

| ID | Required outcome | Current status |
| --- | --- | --- |
| DB-01 | Canonical live-derived replay, contained Data API and full RLS persona evidence | Blocked |
| AUTH-01 | Request-scoped identity, membership and negative IDOR/persona evidence | Blocked |
| STORAGE-01 | Protected evidence pipeline, validation/quarantine and user-context object policies | Blocked |
| SOURCE-01 | Rights, custody, visibility, trusted worker and transactional source receipts | Blocked |

## Source readiness

| Source group | Current mode | Allowed use |
| --- | --- | --- |
| Synthetic/seed fixtures | `sample_fallback` | Public-demo workflow only |
| User CSV/GeoJSON | Browser-local, non-confidential, validation required | User-provided screening context only |
| DLD / Dubai Pulse | `manual_import_ready` or sample fallback | Readiness/manual-import planning; no live official claim |
| OSM / Overture | Sample/open context or planned | Non-authoritative context; no official geometry claim |
| NASA POWER | Fixed historical point context | Bounded screening context only |
| Copernicus | Catalogue metadata only | Availability metadata; no imagery/geometry acquisition claim |
| Open-Meteo | `permission_required` | Limitation only; excluded from evidence/scoring |
| Protected/live providers | `planned` or blocked | No Product use until SOURCE-01 closes |

No current real source establishes official parcel, zoning, cadastral, ownership, planning, legal or valuation truth.

## Non-authorizations

This baseline does not authorize a merge, deployment, Production promotion, Supabase change, Auth enforcement, Storage activation, secret/environment change, provider activation, Figma/Confluence write or confidential data use.

Required caveat: **Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.**
