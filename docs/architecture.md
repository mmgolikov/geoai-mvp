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
| API | 66 route patterns / 88 handlers | 51 project-scoped handlers plus identity-mutation and verified-identity organization-admin handlers are declared in `security/api-route-access.json`; public-demo handlers are explicitly allowlisted |
| Authorization | Exact role/action/capability matrix; unified email/phone Supabase Auth; browser-only mock demo; exact-target SSR/PKCE/session/logout; verified-identity Admin/Onboarding APIs; AUTH-01B request-scoped Product read facade | MFA is not part of the current product flow. Auth routes consume the permanent-user boundary locally; Product repositories and all runtime persona-readiness flags remain false, and real hosted personas are blocked |
| Persistence | Project-scoped browser-local public-demo state, local-development JSON fallback and Supabase repository adapters | Vercel `/tmp` fallback and public-demo server mutations are disabled; request repositories are not yet caller-JWT clients; durable user writes are not active |
| Database | Supabase/Postgres/PostGIS development foundation; exact ten-entry development ledger reconstructed; isolated Free rehearsal carries the first six containment/identity/source/Auth/FK/lifecycle candidates | Those six migrations are rehearsal-only and pass hosted SQL `183/183`; the seventh verified-identity/no-MFA compatibility migration is unapplied everywhere. API-only PostgREST and rollback-only table-level invitation concurrency are proven; real email/phone/Admin/Storage personas, development apply and Production remain blocked |
| Storage | Private-bucket/readiness/upload foundations plus narrow review-only role predicate and operation-aware object-read draft | Policies are unapplied; client binaries remain blocked pending live user-context policy, content validation and signed-URL evidence |
| AI | Browser-local deterministic analysis/scoring plus dormant OpenAI server code | Both server generation POST routes return 403 before parsing until AUTH-01; no key/flag can activate them now |
| Sources | Compact bundled public manifest, bounded operator source-pack contract, SOURCE-01 custody draft and provider-neutral SOURCE-02 `reserve_or_replay` claim v1 | SOURCE-02 ships an empty registry and has no fetch/env/secrets/persistence or atomic pre-fetch reservation writer; its unsigned claim authorizes nothing, Production is denied and no real geometry/assets/persistence or score impact exists |
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

The lower access decision is authoritative, public-demo server mutations/generation are denied, and affected ID routes resolve stored project scope before authorization. The permanent-user boundary requires UUID `claims.sub` exactly equal to canonical `auth.getUser().id` plus explicit claims/user `is_anonymous === false` before profile RPC; mismatch is 401, anonymous identity 403 and ambiguity fails closed. `/api/auth/session`, onboarding and Admin APIs consume that boundary; MFA is not required by the current product flow. PKCE callback and local logout retain private no-store cookie semantics. The login UI accepts email or E.164 phone; email uses a sign-in link, phone uses SMS OTP only after an owner configures a supported SMS provider. The exact mock credentials `demo@geoai.space` / `111111` create browser-only sample state and never establish server authorization. Every Supabase browser/server client also requires the effective `supabase_auth` mode, while Auth-cookie mutations retain exact same-origin enforcement even when that mode is off. Invitation fragments are staged automatically into a short-lived HttpOnly same-site cookie for the sign-in round trip and cleared after successful acceptance; the user is never asked to paste a token, and only its SHA-256 hash reaches the RPC. AUTH-01B separately verifies exact caller/project scope and maps explicit source DTOs. `client_viewer`, malformed/cross-tenant rows, base-table reads, service-role clients and public caching are excluded. Product repositories and all runtime persona-readiness flags stay disabled until hosted personas pass.

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

SOURCE-02 is a separate pure `reserve_or_replay` claim boundary, not a network, authorization, reservation or persistence adapter. Execution/idempotency hashes bind exact environment, tenant, connector/provider/parser, rights, broker, endpoint/network/body and window; actor is omitted only from the shared acquisition key. The unsigned claim grants `authorization: none` and requires external registry/plan/hash revalidation, trusted execution and transactional SOURCE-01 writing. Its registry is empty; it performs no fetch/env/secrets/persistence, denies Production and has no atomic pre-fetch reservation writer.

## Supabase architecture status

The development project proves a schema foundation, not a deployable security boundary. A separate Free rehearsal proves the first six-candidate clean replay, 183/183 hosted SQL personas, API-only PostgREST and FK coverage, but that evidence cannot be promoted to development by inference. A seventh migration that removes the runtime AAL2 requirement in favor of verified permanent identity is prepared and unapplied everywhere. Current development blockers:

- fresh 2026-07-16 migration-ledger read-back for `pphdqkurxneyagvnnjdt` still shows exactly the ten historical entries and none of the seven candidates. The broader 11:31 UTC snapshot was `ACTIVE_HEALTHY` on PG `17.6.1.141`, with 20 public tables/19 RLS, zero Auth users, four buckets/zero object policies, and 22 public-table `TRUNCATE` grants for each of `anon` and `authenticated`; advisors were 14 security and 71 performance findings;
- owner action to expose only the dedicated minimal `api` schema (or disable the Data API), prove direct-`public` denial and record the change; see the [containment runbook](SUPABASE_DATA_API_CONTAINMENT_RUNBOOK_2026_07_16.md), whose rehearsal path is executed but development path is not apply-ready;
- request-scoped SSR cookie transport, email-link/phone-OTP entry, PKCE callback/session/logout, verified-identity Admin/Onboarding routes and an exact-project read facade are implemented locally. MFA is deliberately absent; Product repositories and all persona-readiness flags remain disabled and real email/phone HTTP/JWT evidence is absent;
- removal/rotation of the service-role credential observed in the existing public Preview environment; candidate code no longer reads or needs it, but external Vercel configuration remains owner-controlled ENV-01 work;
- the pending development identity/activation model aligns global profiles, organization/project memberships, capabilities, Auth FK/uniqueness, non-null/composite tenant constraints and operation-specific RLS; its SQL behavior is evidenced only on the isolated rehearsal;
- upgrade replay against a live-derived shadow database across the canonical ledger plus seven pending migrations;
- positive/negative RLS persona tests and schema drift evidence;
- execution evidence for the staged source-custody model, real JWT source-read personas and a trusted worker write path;
- protected Storage upload/download/delete tests in user context.

Seven candidate migrations are prepared and unapplied to development. Only the first six are applied to isolated rehearsal `bkmfcjzalcvdsdvyxpgi`; the seventh replaces the Admin AAL2 check with verified permanent identity and preserves the legacy helper only as a compatibility wrapper. Containment revokes direct domain/health grants for `anon` and `authenticated`, removes detected policies and exposed security-definer helpers, and closes default privileges. Identity adds tenant constraints, account-state-aware private helpers, organization capabilities, exact RLS policy templates and four minimal identity/membership `api` RPCs while keeping direct `public` table grants closed. The rebuilt activation adds Auth profile provisioning, platform/org/project administration, clients, hashed one-time invitations, last-owner and optimistic-concurrency controls. Forward remediation adds canonical invitation locking, durable expiry, bootstrap-v2 provenance, dynamic temporary-ban handling and fail-closed initial-only aggregate pagination without expanding the 14-RPC surface. Because callers cannot directly select protected identity/tenant tables, the Storage policy draft uses narrow `SECURITY DEFINER geoai_private.has_storage_project_role()` for one exact organization/project/role decision; object fetch/signing is operation-aware so listing and `client_viewer` raw-object access remain denied. Source custody adds five RLS-enabled/direct-grant-closed tables and no provider connection. The rehearsal proves the first-six clean replay, 183/183 hosted SQL personas, 14-RPC API-only boundary and zero uncovered domain FKs. Two independent backend sessions also exercised the canonical organization→project→invitation lock order for create→accept and create→revoke with 5 s lock timeout, 15 s statement timeout, observed mutations, rollback and zero residual rows/deadlocks. That is table-level concurrency evidence only, not authenticated RPC/HTTP E2E. Any apply of the seventh migration requires a separate exact-target approval and new personas. Development apply remains blocked by its own live-derived upgrade/drift plan, owner schema action, authenticated HTTP/RPC personas, Storage, rollback and trusted-worker evidence.

The reproducible local boundary in `supabase/config.toml` uses Postgres 17 with only `api` exposed through the Data API. Functional/evidence head `e999c5a07d3ced6c95f2eb44f6a5f03a9c17caea` (tree `73b7c198813d6aede795b8b186bd4d58e741b181`) passed run `29500488408`, app job `87627894974` and DB job `87627894968`. The DB job passed clean 71/71, a synthetic local exact-ten-ledger-prefix/pre-ledger-repair/three-pending-migration/security-surface rehearsal and a second 71/71; separate quality/database artifacts preserve both receipts. The rehearsal is not a current-development clone, live-derived upgrade replay, drift, live apply or DB-01 certification. Live Data API/JWT/Storage/source personas and advisor parity remain separate evidence.

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
- Old Preview external-data status/manifest responses duplicated roughly 133–158 KB. Exact-head Preview `dpl_CY7oNavQwu5ddkhRRLaR3FWTd3d9` implements `compact_public_v1` with remote UTF-8 sizes 5,164/4,411/18,284/5,164/8,221/4,292 B across data-sources/readiness, manifest, sources, status and source-lineage. Contract 1.3, manifest 1.6 and `liveRegistryIncluded:false` are verified. Hub request aggregation remains open.
- Anonymous report-package collection reads use a committed five-project compact summary catalog and do not construct full packages or read source manifests; verified/dynamic and generation paths lazy-load the heavy repository.
- Workspace comparison, express-result and report-preview surfaces are dynamically loaded. The same local production-build comparison reduced First Load JS from 252 kB to 218 kB (approximately 13.5% gzip). Preview and local production-server HTTP evidence exists, including the new Auth route/status matrix, but rendered browser behavior and Core Web Vitals remain unclaimed.
- Map hover is animation-frame coalesced, uses one cached rendered-feature query and deduplicates GeoJSON hover writes; the mobile picker suspends the underlying map so only one WebGL instance remains active. Map/report capture still retains `preserveDrawingBuffer`; it should be scoped to explicit on-demand capture only.
- Upload input trusts caller metadata and declared MIME; malware/quarantine/checksum controls are incomplete.
- Audit writes are non-blocking and mostly unattributed.
- Report/package routes validate canonical raw IDs and the public package collection is summary-only/size-bounded; durable report/comparison identity round-trip evidence remains incomplete after Auth.
- CI has exact-head application, clean 71/71, synthetic ledger-prefix rehearsal and second 71/71 receipts; live-derived current-development upgrade replay/drift and the live HTTP/JWT Auth/RLS/Storage/source persona matrix remain open.

## Required next architecture gates

1. Execute and evidence the selected live Data API/identity model, then prove upgrade replay, drift, full-chain privilege denial and RLS/API personas; ephemeral clean replay is evidenced.
2. Activate the staged request-scoped Auth/RBAC read facade only after DB/ENV gates and real personas, then bind it to exact route/resource decisions; never authorize users with service-role repositories.
3. Build the protected evidence upload pipeline.
4. Execute and verify SOURCE-01 custody, then build a separate trusted SOURCE-02 executor/credential broker without weakening the empty-registry/Production-denial/persistence boundary.
5. Add request IDs, structured telemetry, rate limits and incident/runbook evidence.
6. Split the largest UI coordinators and establish browser performance budgets.

Required caveat: **Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.**
