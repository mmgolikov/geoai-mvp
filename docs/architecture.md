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
| Authorization | Exact role/action/capability matrix, SSR cookie transport/request identity context and AUTH-01B request-scoped read facade | Caller-bound project/source reads are implemented as a fail-closed contract, but all readiness flags are false, no route consumes it and real personas remain blocked |
| Persistence | Project-scoped browser-local public-demo state, local-development JSON fallback and Supabase repository adapters | Vercel `/tmp` fallback and public-demo server mutations are disabled; request repositories are not yet caller-JWT clients; durable user writes are not active |
| Database | Supabase/Postgres/PostGIS development foundation, 20 live public tables, 19 with RLS; exact ten-entry live ledger reconstructed; five-table SOURCE-01 custody model staged | Three pending containment/identity/source-custody migrations are review-only; exact-functional-content clean replay is evidenced, while upgrade/live replay is not certified; Production Supabase is not configured |
| Storage | Private-bucket/readiness/upload foundations plus narrow review-only role predicate and operation-aware object-read draft | Policies are unapplied; client binaries remain blocked pending live user-context policy, content validation and signed-URL evidence |
| AI | Browser-local deterministic analysis/scoring plus dormant OpenAI server code | Both server generation POST routes return 403 before parsing until AUTH-01; no key/flag can activate them now |
| Sources | Compact bundled public manifest, bounded operator source-pack contract, SOURCE-01 custody draft and provider-neutral SOURCE-02 planner/receipts | SOURCE-02 ships an empty registry and has no fetch/env/secrets/persistence; Production and unflagged/unapproved execution fail closed; no real geometry/assets/persistence or score impact |
| Operations | Successful exact-snapshot Quality Gate/artifact, CI `database-replay` clean start/reset/71-assertion pgTAP receipt, static custody checker and READY Vercel Preview with HTTP negative matrix | Upgrade replay, live JWT/Auth/RLS/Storage/source personas, browser evidence, distributed tracing and certified audit remain open |

## Request and trust boundaries

```text
Browser
  -> public-demo APIs (explicit allowlist)
  -> browser-local user artifacts + immutable seed reads
  -> protected/generate server APIs -> 403 before body parsing

Future authenticated request
  -> SSR cookie -> claims + canonical user -> api.current_profile()
  -> exact project key -> api.current_project_access(text)
  -> shared project-role action -> reviewed bounded api resource RPC

Operator-only future plane
  -> provisioning / migrations / controlled ingestion
  -> privileged credential (must never be imported by user-facing API routes)
```

The lower access decision is authoritative, public-demo server mutations/generation are denied, and affected ID routes resolve stored project scope before authorization. This closes the confirmed hard-mode/synthetic-membership bypass but does not activate real authentication. AUTH-01B stages a cookie-only request facade that rejects bearer/mixed transport and non-Auth modes, verifies the exact caller/project projection, reuses the same role/action kernel and maps source releases through an explicit DTO. `client_viewer`, malformed/cross-tenant rows, arbitrary source summary JSON, direct base-table reads, service-role clients and public caching are excluded. All readiness flags remain false, `requireProjectAccess` remains disconnected from that context, no route consumes the facade and application repositories stay disabled until real personas pass.

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

Public source DTOs enumerate approved fields and omit filesystem/storage paths by construction; new internal manifest fields do not flow through automatically. Pending SOURCE-01 replaces the nullable-project convention for future acquired releases with non-null organization/project scope and immutable custody metadata. Its project read RPC also omits arbitrary `quality_summary`/`lineage_summary` JSON, provider URI, object paths and secrets.

SOURCE-02 is a separate pure provider-neutral planning boundary, not a network or persistence adapter. Its immutable shipped registry is empty; it performs no DNS/provider request, implicit environment/secret read, credential injection or custody write and denies Production. Reviewed local/Preview planning requires explicit connector/rights evidence and canonical replay, custody/source-persona, authenticated worker, owner, exact-SHA, distributed-rate, cross-instance-circuit and credential-broker readiness, plus distribution/geometry/imagery evidence when applicable. Request plans bind tenant/project/actor, exact endpoint/query/body bounds, score impact `none` and deterministic idempotency; results can only describe non-persisted success candidates or stable quarantine/failure/duplicate outcomes. A future trusted executor and SOURCE-01 transactional writer remain separate mandatory boundaries.

## Supabase architecture status

The development project proves a schema foundation, not a deployable security boundary. Current blockers:

- fresh 2026-07-16 11:31 UTC read-only evidence for `pphdqkurxneyagvnnjdt` is `ACTIVE_HEALTHY` on PG `17.6.1.141`, with 20 public tables/19 RLS, ten applied migrations/zero of three candidate migrations, zero Auth users, four buckets/zero object policies, and 22 public-table `TRUNCATE` grants for each of `anon` and `authenticated`; advisors remain 14 security and 71 performance findings;
- owner action to expose only the dedicated minimal `api` schema (or disable the Data API), prove direct-`public` denial and record the change; see the [containment runbook](SUPABASE_DATA_API_CONTAINMENT_RUNBOOK_2026_07_16.md), which is not executed/apply-ready;
- request-scoped SSR cookie transport and an exact-project read facade are implemented, but all readiness flags, route integration and real HTTP/JWT evidence remain disabled;
- removal/rotation of the service-role credential observed in the existing public Preview environment; candidate code no longer reads or needs it, but external Vercel configuration remains owner-controlled ENV-01 work;
- the pending identity draft aligns global profiles, organization/project memberships, capabilities, Auth FK/uniqueness, non-null/composite tenant constraints and operation-specific RLS; execution evidence is missing;
- upgrade replay against a live-derived shadow database across the canonical ledger plus three pending migrations;
- positive/negative RLS persona tests and schema drift evidence;
- execution evidence for the staged source-custody model, real JWT source-read personas and a trusted worker write path;
- protected Storage upload/download/delete tests in user context.

`20260716000000_geoai_pre_auth_security_containment_v1.sql`, `20260716085854_geoai_identity_authorization_foundation_v1.sql` and `20260716113000_geoai_source_custody_foundation_v1.sql` are prepared but not applied. Containment revokes direct domain/health grants for `anon` and `authenticated`, removes detected policies and exposed security-definer helpers, and closes default privileges. Identity adds tenant constraints, account-state-aware private helpers, organization capabilities, exact RLS policy templates and four minimal identity/membership `api` RPCs while keeping direct `public` table grants closed. Because those callers cannot directly select protected identity/tenant tables, the Storage policy draft uses narrow `SECURITY DEFINER geoai_private.has_storage_project_role()` for one exact organization/project/role decision; object fetch/signing is operation-aware so listing and `client_viewer` raw-object access remain denied. Source custody adds five RLS-enabled/direct-grant-closed tables: catalog, immutable releases/artifacts/status events/ingestion receipts, with composite tenant/release and actor organization/project-membership FKs. Legacy registry backfill is `restricted`/`registered_unverified`; bounded `api.current_source_releases()` returns only an explicit `approved` caller-scoped projection for owner/admin/analyst/viewer, never arbitrary quality/lineage summary JSON, Storage paths, source URIs, secrets or `client_viewer` access. It connects no provider and grants no table/write path. Exact-functional-content ephemeral clean replay passes; apply remains blocked by upgrade replay, owner schema action, live containment/personas, rollback, trusted-worker design and real-persona evidence.

The reproducible local boundary in `supabase/config.toml` uses Postgres 17 with only `api` exposed through the Data API. Documentation/evidence head `f39dcee18c2601b88ae51e061627925037d1aa77` preserves functional content SHA `631d72e0ec1323554fae7274f4328f92e2445289`; GitHub run `29497314994`, CI `database-replay` job `87617248275`, completed clean start, deterministic reset and all 71 assertions with `Result: PASS`. Its 14 red-team additions cover exact source-release projection with ordered multi-event latest-status selection, explicit `revoked` and default-`sealed` projections, lower/upper pagination clamps, inactive organization/project denial, exact-project creator membership and artifact/status-event/ingestion-receipt update/delete immutability; its policy sweep spans all custody/audit tables for `public` or authenticated-applicable policies. Application job `87617248273` also succeeded, and artifact `8374954241` preserves the exact-snapshot evidence. Supabase CLI `2.109.1` is pinned, and the guarded operator check covers all three candidate migrations plus the source-custody checker. Local Docker remains unavailable. Upgrade replay, live apply/Data API containment, live HTTP/JWT/Storage/source personas and advisor parity remain separate evidence.

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
- The shared polygon validator now rejects non-finite/out-of-WGS84/wrong-arity vertices, unsupported antimeridian crossings, duplicate/self-intersecting and over-complex polygons and recomputes measurements; its 11-persona adversarial test is not authenticated server-route or durable-write evidence.
- `AnalysisPanel`'s legacy seven-request server fanout is disabled, but its unreachable state/effects/handlers remain as dead code. Project Hub still starts with six public requests.
- Old Preview external-data status/manifest responses duplicated roughly 133–158 KB. Exact-docs-head Preview `dpl_Gh5btUKs8yzySxvpxGnwXjMkYayK` implements `compact_public_v1` with remote UTF-8 sizes 5,164/4,411/18,284/5,164/8,221/4,292 B across data-sources/readiness, manifest, sources, status and source-lineage. Contract 1.3, manifest 1.6 and `liveRegistryIncluded:false` are verified. Hub request aggregation remains open.
- Anonymous report-package collection reads use a committed five-project compact summary catalog and do not construct full packages or read source manifests; verified/dynamic and generation paths lazy-load the heavy repository.
- Workspace comparison, express-result and report-preview surfaces are dynamically loaded. The same local production-build comparison reduced First Load JS from 252 kB to 218 kB (approximately 13.5% gzip). Preview HTTP evidence exists, but browser behavior and Core Web Vitals remain unclaimed because local headless launch is blocked by a system Unix-socket restriction.
- Map hover is animation-frame coalesced, uses one cached rendered-feature query and deduplicates GeoJSON hover writes; the mobile picker suspends the underlying map so only one WebGL instance remains active. Map/report capture still retains `preserveDrawingBuffer`; it should be scoped to explicit on-demand capture only.
- Upload input trusts caller metadata and declared MIME; malware/quarantine/checksum controls are incomplete.
- Audit writes are non-blocking and mostly unattributed.
- Report/package routes validate canonical raw IDs and the public package collection is summary-only/size-bounded; durable report/comparison identity round-trip evidence remains incomplete after Auth.
- CI has an exact-snapshot application and Supabase clean-replay/71-assertion pgTAP pass; upgrade replay and the live HTTP/JWT Auth/RLS/Storage/source persona matrix remain open.

## Required next architecture gates

1. Execute and evidence the selected live Data API/identity model, then prove upgrade replay, drift, full-chain privilege denial and RLS/API personas; ephemeral clean replay is evidenced.
2. Activate the staged request-scoped Auth/RBAC read facade only after DB/ENV gates and real personas, then bind it to exact route/resource decisions; never authorize users with service-role repositories.
3. Build the protected evidence upload pipeline.
4. Execute and verify SOURCE-01 custody, then build a separate trusted SOURCE-02 executor/credential broker without weakening the empty-registry/Production-denial/persistence boundary.
5. Add request IDs, structured telemetry, rate limits and incident/runbook evidence.
6. Split the largest UI coordinators and establish browser performance budgets.

Required caveat: **Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.**
