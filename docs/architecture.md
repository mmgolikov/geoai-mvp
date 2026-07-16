# GeoAI Implemented Architecture

Status: Active implementation baseline
Last verified: 2026-07-16
Verified release: `main` `2999e7e857989baf53ce58ecfed63550b5896be0` (PR #87)
Maturity: public demo prototype; not Production-ready or pilot-ready

This page describes implemented behavior. Target architecture remains a separate owner-review artifact and must not be treated as released merely because a draft exists.

## Runtime topology

| Layer | Implemented state | Current boundary |
| --- | --- | --- |
| Web | Next.js 15 App Router, React 19, TypeScript, Tailwind | Vercel Production is a public demo |
| Product UI | Mapbox workspace, criteria/map-first flows, dashboards, comparisons, print routes | Large client coordinators remain a maintainability/performance risk |
| API | 62 route files / 83 handlers | 51 project-scoped handlers are declared in `security/api-route-access.json`; public-demo handlers are explicitly allowlisted |
| Authorization | Demo/soft access decision scaffold | No request-scoped caller JWT/profile/membership kernel; protected Auth/RBAC is blocked |
| Persistence | Browser/local JSON fallback plus Supabase repository adapters | Public-demo reports, analysis runs and comparisons stay browser-local; request repositories use the publishable/anon key only; durable user writes are not active |
| Database | Supabase/Postgres/PostGIS development foundation, 20 public tables, 19 with RLS | Historical migration chain is not clean-replay certified; Production Supabase is not configured |
| Storage | Private-bucket/readiness/upload foundations | Client binaries are blocked pending user-context policies, content validation and signed-URL evidence |
| AI | Deterministic analysis/scoring plus OpenAI code paths | Upstream is disabled unless explicit gate + hard access + Supabase Auth; current request Auth kernel is not implemented |
| Sources | Local/sample manifests plus bounded runtime source-pack contract | Production source pack fails closed; no real geometry/assets/persistence or score impact |
| Operations | GitHub Actions quality gate, Vercel health/logs, Supabase advisors | No full E2E Auth/RLS persona suite, clean migration replay, tracing or certified audit |

## Request and trust boundaries

```text
Browser
  -> public-demo APIs (explicit allowlist)
  -> project APIs -> requireProjectAccess -> repository
                                         -> local fallback OR anon Supabase client

Operator-only future plane
  -> provisioning / migrations / controlled ingestion
  -> privileged credential (must never be imported by user-facing API routes)
```

The route guard now blocks before mutations and ID routes resolve stored project scope where implemented. This closes the known advisory-only bypasses, but it does not create real authentication. `requireProjectAccess` still uses demo membership scaffolding and cannot authenticate a Supabase user.

## Data and source behavior

The current release separates source metadata from evidence activation:

- NASA POWER: fixed historical point screening context in bounded Preview only.
- Copernicus: Sentinel-2 catalogue metadata only; no geometry, bbox, assets or imagery processing.
- OSM Overpass: bounded counts only; no features, coordinates or geometry.
- Open-Meteo: `permission_required`; excluded from Product evidence and AI payloads.
- DLD/Dubai Pulse: blocked without approved stable access/snapshot custody and reusable rights.
- Overture/OSM geometry, imagery and source-dependent scoring: deferred.
- Production `/api/external-data/source-connection-pack`: HTTP 503, disabled, zero sources.

Public source DTOs remove filesystem/storage paths. Real snapshots remain blocked until an explicit visibility/tenant model replaces the current nullable project convention.

## Supabase architecture status

The development project proves a schema foundation, not a deployable security boundary. Current blockers:

- request-scoped Supabase client carrying the caller session/JWT;
- profile-to-`auth.users` and membership uniqueness/consistency constraints;
- clean shadow-database replay across historical migrations;
- unique, upgrade-safe Supabase CLI migration versions (`20260618` is currently reused five times and `20260624` twice);
- positive/negative RLS persona tests and schema drift evidence;
- explicit public/demo/private snapshot visibility;
- protected Storage upload/download/delete tests in user context.

`20260716000000_geoai_pre_auth_security_containment_v1.sql` is prepared but not applied. It contains historical-table RLS containment, corrected Storage membership roles/joins and reduced direct EXECUTE grants. Applying it requires separate approval and clean-replay/rollback evidence.

## Security controls added by the audit branch

- explicit API route access manifest and CI contract;
- object-first checks for affected ID routes and immutable project scope;
- service-role exclusion from user-facing repository client selection;
- Auth/membership/RLS readiness cannot be promoted by boolean env flags;
- protected Storage and durable audit readiness require explicit user-context/runtime evidence and currently fail closed;
- bounded AI request bodies, upstream timeout/token caps and explicit upstream activation gate;
- public source-lineage path redaction;
- CSP, HSTS, frame, MIME, referrer and permissions headers;
- dependency patching and a PostCSS override removing the audited advisory.

These controls reduce exposure; they do not make the system Production-ready.

## Known architectural debt

- `components/workspace-shell.tsx`, `project-dashboard.tsx` and `map-workspace-client.tsx` are multi-thousand-line coordinators.
- Local fallback is a shared instance-level `/tmp` store and must never serve protected/confidential mode.
- Public-demo report, analysis-run and comparison state is deliberately browser-only so those objects cannot leak through the shared `/tmp` fallback; seeded reports remain immutable server authority.
- Upload input trusts caller metadata and declared MIME; malware/quarantine/checksum controls are incomplete.
- Audit writes are non-blocking and mostly unattributed.
- Public print pages need session-aware protection before protected reports exist.
- CI still needs an ephemeral Supabase replay and live Auth/RLS persona matrix.

## Required next architecture gates

1. Implement the request-scoped Auth/RBAC kernel and fail-closed demo namespace.
2. Reconcile migrations and prove clean replay/drift/RLS personas.
3. Build the protected evidence upload pipeline.
4. Add explicit source visibility, custody and public projection.
5. Add request IDs, structured telemetry, rate limits and incident/runbook evidence.
6. Split the largest UI coordinators and establish browser performance budgets.

Required caveat: **Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.**
