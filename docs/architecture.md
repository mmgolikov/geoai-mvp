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
| Authorization | Exact role/action/capability matrix plus staged SSR cookie transport and request identity context | Claims/user/profile verification exists through `api.current_profile()`, but activation flags, membership repositories and real personas remain blocked |
| Persistence | Project-scoped browser-local public-demo state, local-development JSON fallback and Supabase repository adapters | Vercel `/tmp` fallback and public-demo server mutations are disabled; request repositories are not yet caller-JWT clients; durable user writes are not active |
| Database | Supabase/Postgres/PostGIS development foundation, 20 live public tables, 19 with RLS; exact ten-entry live ledger reconstructed; five-table SOURCE-01 custody model staged | Three pending containment/identity/source-custody migrations are review-only; clean/upgrade replay is not certified; Production Supabase is not configured |
| Storage | Private-bucket/readiness/upload foundations plus narrow review-only role predicate and operation-aware object-read draft | Policies are unapplied; client binaries remain blocked pending live user-context policy, content validation and signed-URL evidence |
| AI | Browser-local deterministic analysis/scoring plus dormant OpenAI server code | Both server generation POST routes return 403 before parsing until AUTH-01; no key/flag can activate them now |
| Sources | Compact bundled public manifest plus bounded operator source-pack contract | Anonymous routes statically import only reviewed compact metadata; Production and unflagged Preview/local source packs fail closed; no real geometry/assets/persistence or score impact |
| Operations | GitHub Actions quality gate, static custody checker, Vercel output-trace budgets, health/logs, Supabase advisors, configured database replay job | CI replay/checker has not run on the exact candidate SHA; no full HTTP Auth/RLS/source persona suite, distributed tracing or certified audit |

## Request and trust boundaries

```text
Browser
  -> public-demo APIs (explicit allowlist)
  -> browser-local user artifacts + immutable seed reads
  -> protected/generate server APIs -> 403 before body parsing

Future authenticated request
  -> SSR cookie -> claims + canonical user -> api.current_profile()
  -> api.current_project_access(text) -> exact project action -> reviewed api resource RPC

Operator-only future plane
  -> provisioning / migrations / controlled ingestion
  -> privileged credential (must never be imported by user-facing API routes)
```

The lower access decision is authoritative, public-demo server mutations/generation are denied, and affected ID routes resolve stored project scope before authorization. This closes the confirmed hard-mode/synthetic-membership bypass but does not activate real authentication. SSR transport can verify a caller/profile through the staged `api` RPC, while `requireProjectAccess` remains disconnected from that context and application repositories stay disabled until AUTH-01B and real personas pass.

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

Public source DTOs enumerate approved fields and omit filesystem/storage paths by construction; new internal manifest fields do not flow through automatically. Pending SOURCE-01 replaces the nullable-project convention for future acquired releases with non-null organization/project scope and immutable custody metadata. It is not live or replay-certified, so real snapshots and all provider writes remain blocked.

## Supabase architecture status

The development project proves a schema foundation, not a deployable security boundary. Current blockers:

- live Data API exposure remains on `pphdqkurxneyagvnnjdt`: anon-readable domain/source/audit rows, full mutation privileges on `spatial_ref_sys` and 748 executable `public` RPCs (79 volatile, six `SECURITY DEFINER`); the candidate containment ledger count is zero;
- owner action to expose only the dedicated minimal `api` schema (or disable the Data API), prove direct-`public` denial and record the change; see the [containment runbook](SUPABASE_DATA_API_CONTAINMENT_RUNBOOK_2026_07_16.md), which is not executed/apply-ready;
- request-scoped SSR cookie transport is implemented, but project membership/resource RPC integration and real HTTP/JWT evidence remain disabled;
- removal/rotation of the service-role credential observed in the existing public Preview environment; candidate code no longer reads or needs it, but external Vercel configuration remains owner-controlled ENV-01 work;
- the pending identity draft aligns global profiles, organization/project memberships, capabilities, Auth FK/uniqueness, non-null/composite tenant constraints and operation-specific RLS; execution evidence is missing;
- clean shadow-database and upgrade replay across the canonical ledger plus three pending migrations;
- positive/negative RLS persona tests and schema drift evidence;
- execution evidence for the staged source-custody model, real JWT source-read personas and a trusted worker write path;
- protected Storage upload/download/delete tests in user context.

`20260716000000_geoai_pre_auth_security_containment_v1.sql`, `20260716085854_geoai_identity_authorization_foundation_v1.sql` and `20260716113000_geoai_source_custody_foundation_v1.sql` are prepared but not applied. Containment revokes direct domain/health grants for `anon` and `authenticated`, removes detected policies and exposed security-definer helpers, and closes default privileges. Identity adds tenant constraints, account-state-aware private helpers, organization capabilities, exact RLS policy templates and four minimal identity/membership `api` RPCs while keeping direct `public` table grants closed. Because those callers cannot directly select protected identity/tenant tables, the Storage policy draft uses narrow `SECURITY DEFINER geoai_private.has_storage_project_role()` for one exact organization/project/role decision; object fetch/signing is operation-aware so listing and `client_viewer` raw-object access remain denied. Source custody adds five RLS-enabled/direct-grant-closed tables: catalog, immutable releases/artifacts/status events/ingestion receipts, with composite tenant/release and actor organization/project-membership FKs. Legacy registry backfill is `restricted`/`registered_unverified`; bounded `api.current_source_releases()` returns only `approved` caller-scoped metadata for owner/admin/analyst/viewer, never Storage paths, source URIs, secrets or `client_viewer` access. It connects no provider and grants no table/write path. Static contracts pass; apply remains blocked by clean/upgrade replay, owner schema action, rollback, trusted-worker design and real-persona evidence.

The repository now stages a reproducible local boundary in `supabase/config.toml`: Postgres 17 with only `api` exposed through the Data API. Supabase CLI `2.109.1` is pinned, the guarded operator migration check enumerates all three pending migrations and requires the source-custody checker, and CI `database-replay` is configured to start/reset the stack and execute the 57-assertion pgTAP database/source/Storage-helper persona suite, including negative source actor-membership and artifact/release tenant-scope FK cases. This is not a successful replay receipt: local Docker is unavailable and the controls have not run on the exact candidate SHA. Upgrade replay, live HTTP/JWT/source personas and advisor parity remain separate evidence.

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
- CI has a configured ephemeral Supabase clean-replay/pgTAP job but still needs an exact-head pass, upgrade replay and the live HTTP/JWT Auth/RLS persona matrix.

## Required next architecture gates

1. Execute and evidence the selected Data API/identity model, then prove clean/upgrade replay, drift, full-chain privilege denial and RLS/API personas.
2. Complete the staged request-scoped Auth/RBAC kernel by binding verified caller/profile/membership to exact route decisions and reviewed resource RPCs; never authorize users with service-role repositories.
3. Build the protected evidence upload pipeline.
4. Add explicit source visibility, custody and public projection.
5. Add request IDs, structured telemetry, rate limits and incident/runbook evidence.
6. Split the largest UI coordinators and establish browser performance budgets.

Required caveat: **Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.**
