# GeoAI Implemented Architecture

Status: Active implementation baseline
Last verified: 2026-07-16
Owner: GeoAI Engineering
Authority: Current implemented architecture and trust boundaries
Successor: None; any replacement must update `DOCUMENTATION_INDEX.md`
Released baseline: `main` `2999e7e857989baf53ce58ecfed63550b5896be0` (PR #87)
Unreleased implementation scope: audit worktree / Draft PR #97 candidate; candidate statements do not describe Production until merge and deploy
Maturity: public demo prototype; not Production-ready or pilot-ready
Navigation: [Confluence Hub](https://geoaimvp.atlassian.net/wiki/spaces/PH/overview) · [Documentation Index](DOCUMENTATION_INDEX.md) · [Current Release State](CURRENT_RELEASE_STATE.md) · [Full System Audit](FULL_SYSTEM_AUDIT_2026_07_16.md) · [Data Strategy](data-strategy.md) · [Roadmap](roadmap.md) · [Codex Backlog](CODEX_BACKLOG_2026_07_16.md)

This page describes the current audit candidate implementation. Production remains on the released baseline above and retains the release warnings in [Current Release State](CURRENT_RELEASE_STATE.md) until the candidate is merged and deployed. Target architecture remains a separate owner-review artifact and must not be treated as released merely because a draft exists.

## Runtime topology

| Layer | Implemented state | Current boundary |
| --- | --- | --- |
| Web | Next.js 15 App Router, React 19, TypeScript, Tailwind | Vercel Production is a public demo |
| Product UI | Mapbox workspace, criteria/map-first flows, dashboards, comparisons, print routes | Large client coordinators remain a maintainability/performance risk |
| API | 62 route files / 83 handlers | 51 project-scoped handlers are declared in `security/api-route-access.json`; public-demo handlers are explicitly allowlisted |
| Authorization | Demo/soft access decision scaffold | No request-scoped caller JWT/profile/membership kernel; protected Auth/RBAC is blocked |
| Persistence | Project-scoped browser-local public-demo state, local-development JSON fallback and Supabase repository adapters | Vercel `/tmp` fallback and public-demo server mutations are disabled; request repositories are not yet caller-JWT clients; durable user writes are not active |
| Database | Supabase/Postgres/PostGIS development foundation, 20 public tables, 19 with RLS | Historical migration chain is not clean-replay certified; Production Supabase is not configured |
| Storage | Private-bucket/readiness/upload foundations | Client binaries are blocked pending user-context policies, content validation and signed-URL evidence |
| AI | Browser-local deterministic analysis/scoring plus dormant OpenAI server code | Both server generation POST routes return 403 before parsing until AUTH-01; no key/flag can activate them now |
| Sources | Compact bundled public manifest plus bounded operator source-pack contract | Anonymous routes statically import only reviewed compact metadata; Production and unflagged Preview/local source packs fail closed; no real geometry/assets/persistence or score impact |
| Operations | GitHub Actions quality gate, Vercel output-trace budgets, health/logs, Supabase advisors | No full E2E Auth/RLS persona suite, clean migration replay, distributed tracing or certified audit |

## Request and trust boundaries

```text
Browser
  -> public-demo APIs (explicit allowlist)
  -> browser-local user artifacts + immutable seed reads
  -> protected/generate server APIs -> 403 before body parsing

Future authenticated request
  -> request-scoped caller JWT -> project authorization -> RLS repository

Operator-only future plane
  -> provisioning / migrations / controlled ingestion
  -> privileged credential (must never be imported by user-facing API routes)
```

The lower access decision is authoritative, public-demo server mutations/generation are denied, and affected ID routes resolve stored project scope before authorization. This closes the confirmed hard-mode/synthetic-membership bypass but does not create real authentication. Public application Supabase repositories are disabled before AUTH-01; `requireProjectAccess` cannot authenticate a Supabase user.

Candidate browser state is keyed by project for uploads, AOIs, analysis history, report summaries and comparisons. Data Room/report/API lookups fail closed for unknown explicit project keys rather than substituting `demoProjects[0]`; an invalid Workspace URL key is explicitly cleared and visibly reset to the default public demo. Legacy uploads without `projectKey` are deliberately not assigned. Raw uploads, AOI geometry and their derived target coordinates remain local; user-provided targets skip market/climate calls. Protected controls are disabled with a capability reason before any request, while browser-safe demo actions remain usable. `/demo` is a 307 redirect to `/workspace`.

## Data and source behavior

The current release separates source metadata from evidence activation:

- NASA POWER: fixed historical point screening context in bounded Preview only.
- Copernicus: Sentinel-2 catalogue metadata only; no geometry, bbox, assets or imagery processing.
- OSM Overpass: bounded counts only; no features, coordinates or geometry.
- Open-Meteo: `permission_required`; excluded from Product evidence and AI payloads.
- DLD/Dubai Pulse: blocked without approved stable access/snapshot custody and reusable rights.
- Overture/OSM geometry, imagery and source-dependent scoring: deferred.
- Production `/api/external-data/source-connection-pack`: HTTP 503, disabled, zero sources.
- Preview/local provider execution: requires the explicit flag, a server-only operator token of at least 32 characters and a matching request Bearer/header; Production stays disabled. Upstream fetches use fixed HTTPS hosts, reject redirects, cancel non-success/oversized bodies and enforce strict NASA date/value, Copernicus collection/timestamp/cloud and Overpass count contracts; the pack remains non-persistent and non-scoring.
- Public data-sources/readiness/manifest/sources/status/lineage routes: reviewed `compact_public_v1`, `liveRegistryIncluded:false`, diagnostics withheld and no Supabase query. They statically import one manifest plus three aggregate-quality records; per-source DLD/OSM/Overture truth is not inferred from group totals and deep snapshots stay outside anonymous function traces.

Public source DTOs enumerate approved fields and omit filesystem/storage paths by construction; new internal manifest fields do not flow through automatically. Real snapshots remain blocked until an explicit visibility/tenant model replaces the current nullable project convention.

## Supabase architecture status

The development project proves a schema foundation, not a deployable security boundary. Current blockers:

- live Data API exposure remains on `pphdqkurxneyagvnnjdt`: anon-readable domain/source/audit rows, full mutation privileges on `spatial_ref_sys` and 748 executable `public` RPCs (79 volatile, six `SECURITY DEFINER`); the candidate containment ledger count is zero;
- owner decision to disable the Data API or expose a dedicated minimal `api` schema with minimum grants plus RLS; see the [draft containment runbook](SUPABASE_DATA_API_CONTAINMENT_RUNBOOK_2026_07_16.md), which is not executed/apply-ready;
- request-scoped Supabase client carrying the caller session/JWT;
- removal/rotation of the service-role credential observed in the existing public Preview environment; candidate code no longer reads or needs it, but external Vercel configuration remains owner-controlled ENV-01 work;
- one explicit identity model aligned across schema, TS/session and RLS. Recommended baseline is a global profile plus organization and project memberships; `profiles.auth_user_id` unique/FK, membership/org nullability, `UNIQUE(project_id,user_id)` and organization/project consistency are not closed;
- replacement of the legacy authenticated AOI `FOR ALL` policy with operation/role-specific write policies;
- clean shadow-database replay across historical migrations;
- unique, upgrade-safe Supabase CLI migration versions (`20260618` is currently reused five times and `20260624` twice);
- positive/negative RLS persona tests and schema drift evidence;
- explicit public/demo/private snapshot visibility;
- protected Storage upload/download/delete tests in user context.

`20260716000000_geoai_pre_auth_security_containment_v1.sql` is prepared but not applied. It retires every detected historical anonymous Preview policy/grant except the public healthcheck, limits explicit demo snapshot policies to authenticated callers, contains historical tables, corrects Storage membership roles/joins and reduces helper EXECUTE grants. The static test scans the full historical surface; applying it still requires separate approval and clean-replay/rollback/live-persona evidence.

Supabase's supported boundary requires both minimum grants and RLS for exposed tables, explicit function `EXECUTE` grants, caller JWT validation and owner-created `storage.objects` policies. Service-role credentials bypass RLS and are restricted to an operator/worker plane; they are never user authorization.

## Security controls added by the audit branch

- explicit API route access manifest and CI contract;
- object-first checks for affected ID routes and immutable project scope;
- strict profile/membership status checks, a seven-key demo allowlist, fail-closed Auth misconfiguration and visible early denial in the six identity-gated handlers;
- environment/Auth/demo-bypass access matrix with authoritative hard-mode denial and browser-only public-demo mutation policy;
- invalid environment values fail closed (Auth disabled, hard enforcement, demo bypass false, readiness requirements true);
- service-role exclusion from user-facing repository client selection;
- Auth/membership/RLS readiness cannot be promoted by boolean env flags;
- protected Storage and durable audit readiness require explicit user-context/runtime evidence and currently fail closed;
- screening review, client attestation and official attestation are distinct capabilities; the two attestation paths remain disabled until server authority exists;
- caller report JSON cannot establish evidence use; report persistence requires a future server-authoritative analysis/evidence receipt;
- every manifest-classified project/identity GET uses the shared private/no-store response boundary and varies on Authorization/Cookie; public caching is restricted to explicit immutable seed projections;
- bounded AI request bodies, upstream timeout/token caps and explicit upstream activation gate;
- public source-lineage path redaction;
- static/sanitized public DB, Storage, platform, pilot, RLS and limitations responses with live infrastructure diagnostics withheld;
- server-resolved `/workspace` and `/explore` source environment plus explicit Preview provider opt-in;
- Vercel local-fallback disablement and browser-local upload/AOI handling;
- CSP, HSTS, frame, MIME, referrer and permissions headers;
- dependency patching and a PostCSS override removing the audited advisory.

These controls reduce exposure; they do not make the system Production-ready.

## Known architectural debt

- `components/workspace-shell.tsx`, `project-dashboard.tsx` and `map-workspace-client.tsx` are multi-thousand-line coordinators.
- Local JSON fallback is development-only, non-durable and disabled on Vercel/hard access; it is not multi-user storage.
- Public-demo uploads, AOIs, reports, analysis runs and comparisons are deliberately browser-only; seeded reports remain immutable server authority.
- Browser parsing has strict file/data-row/header/quote/coordinate/property bounds, per-project upload/AOI caps, read-time revalidation, 1,000-vertex pre-topology AOI limit and a visible no-confidential-data warning. Persistence uses a versioned public-demo-only namespace with Auth-transition/legacy cleanup, but still needs TTL, verified subject/organization scoping, a worker/off-main-thread path and tighter CSP.
- `AnalysisPanel`'s legacy seven-request server fanout is disabled, but its unreachable state/effects/handlers remain as dead code. Project Hub still starts with six public requests.
- Old Preview external-data status/manifest responses duplicated roughly 133–158 KB. The candidate implements `compact_public_v1` across data-sources/readiness, manifest, sources, status and source-lineage with 64 KB route budgets (48 KB on the other data-foundation routes); the final local production build measured 5,063/4,467/19,448/5,063/8,158/4,352 B respectively. Exact remote Preview evidence and Hub request aggregation remain open.
- Anonymous report-package collection reads use a committed five-project compact summary catalog and do not construct full packages or read source manifests; verified/dynamic and generation paths lazy-load the heavy repository.
- Map hover is animation-frame coalesced, uses one cached rendered-feature query and deduplicates GeoJSON hover writes; the mobile picker suspends the underlying map so only one WebGL instance remains active. Map/report capture still retains `preserveDrawingBuffer`; it should be scoped to explicit on-demand capture only.
- Upload input trusts caller metadata and declared MIME; malware/quarantine/checksum controls are incomplete.
- Audit writes are non-blocking and mostly unattributed.
- Report/package routes validate canonical raw IDs and the public package collection is summary-only/size-bounded; durable report/comparison identity round-trip evidence remains incomplete after Auth.
- CI still needs an ephemeral Supabase replay and live Auth/RLS persona matrix.

## Required next architecture gates

1. Choose the Data API/identity model, reconcile migrations and prove clean replay/drift/full-chain privileges/RLS personas.
2. Implement the request-scoped caller-JWT Auth/RBAC kernel and fail-closed protected namespace; never authorize users with service-role repositories.
3. Build the protected evidence upload pipeline.
4. Add explicit source visibility, custody and public projection.
5. Add request IDs, structured telemetry, rate limits and incident/runbook evidence.
6. Split the largest UI coordinators and establish browser performance budgets.

Required caveat: **Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.**
