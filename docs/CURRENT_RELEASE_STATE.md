# GeoAI Current Release State

Status: Canonical repository release snapshot
Last verified: 2026-07-16
Operational dashboard: [Confluence Project Hub](https://geoaimvp.atlassian.net/wiki/spaces/PH/overview)

## Released authority

| Item | Verified state |
| --- | --- |
| GitHub release | PR [#87](https://github.com/mmgolikov/geoai-mvp/pull/87), merged |
| `main` SHA | `2999e7e857989baf53ce58ecfed63550b5896be0` |
| Exact-main Quality | Run `29456624801`, 18/18 steps passed |
| Evidence artifact | `8359607780` |
| Vercel Production | `dpl_EAXREH31JKznnGbQYEU8bNqTqagN`, READY on exact SHA |
| Production mode | Public demo, `demo_only`, `local_fallback`, soft access |
| Production Supabase | Not configured |
| Production source pack | HTTP 503, disabled, activation not allowed, zero sources |
| Product maturity | Not Production-ready; not pilot-ready |

## Released source scope

- Fixed, low-volume Preview context only: NASA POWER historical point context, Copernicus catalogue metadata without geometry/assets and OSM counts without features/geometry.
- Open-Meteo is permission-gated and excluded from evidence and AI payloads.
- DLD/Dubai Pulse live use remains blocked pending approved stable access/snapshot custody and reusable rights.
- Overture/OSM geometry, imagery, persistence and source-dependent scoring are not activated.

## Development Supabase evidence

Project `pphdqkurxneyagvnnjdt` is a development foundation, separate from Production. Read-only verification found 20 public tables, RLS on 19 (`spatial_ref_sys` is the PostGIS exception), ten applied migrations and zero Auth users. The repository migration filenames are not a portable canonical chain: version `20260618` is reused five times and `20260624` twice. Security advisors still flag direct EXECUTE on GeoAI `SECURITY DEFINER` helpers plus PostGIS/public-schema notices. This is not proof of working Auth/RBAC, user-context RLS or protected Storage.

## Current audit branch

The 2026-07-16 full-system audit is an unreleased candidate. It adds containment and regression controls but does not change Production, apply Supabase migrations or activate providers. See the repository [Full System Audit](FULL_SYSTEM_AUDIT_2026_07_16.md), [Confluence authority](https://geoaimvp.atlassian.net/wiki/spaces/PH/pages/12320972) and GitHub [execution program #96](https://github.com/mmgolikov/geoai-mvp/issues/96).

## Technical gates before protected or real data

1. Request-scoped Auth/RBAC and real membership enforcement.
2. Clean canonical migration replay and live RLS persona evidence.
3. Protected Storage pipeline and user-context signed URL tests.
4. Explicit source visibility/custody and public projection.
5. AI quotas/privacy/rate limiting and observability.
6. Owner decision for any Production or source activation.

Independent reviewer approvals are not required in the current phase. This does not waive the technical/evidence gates above.

Required caveat: **Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.**
