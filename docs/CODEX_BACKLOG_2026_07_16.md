# GeoAI Codex Backlog — 2026-07-16

Status: Active, implementation-ready
Last verified: 2026-07-16
Owner: GeoAI Engineering
Authority: Executable residual work and acceptance criteria
Successor: None; any replacement must update `DOCUMENTATION_INDEX.md`
Priority rule: complete P0 in dependency order before real sources, Auth/RBAC/Admin activation or client files
Navigation: [Confluence Hub](https://geoaimvp.atlassian.net/wiki/spaces/PH/overview) · [Documentation Index](DOCUMENTATION_INDEX.md) · [Current Release State](CURRENT_RELEASE_STATE.md) · [Full System Audit](FULL_SYSTEM_AUDIT_2026_07_16.md) · [Roadmap](roadmap.md) · [Supabase containment runbook](SUPABASE_DATA_API_CONTAINMENT_RUNBOOK_2026_07_16.md)
GitHub execution program: [#96](https://github.com/mmgolikov/geoai-mvp/issues/96)

Independent reviewer approval is not an acceptance criterion in this phase. Each task closes on reproducible technical evidence and explicit owner-controlled external actions where applicable.

## DB-01 — Canonical migration replay and RLS evidence

Priority: P0 / S0
Tracks: GitHub [#85](https://github.com/mmgolikov/geoai-mvp/issues/85)
Blocks: AUTH-01 final integration, Storage, durable writes, real snapshots

Reconcile legacy and current table definitions into an upgrade-safe canonical chain. The candidate chain now includes containment, identity, source custody, rebuilt Auth/Admin/client/project activation, FK-index hardening, forward lifecycle remediation and the no-MFA verified-identity compatibility override. Treat the first six as rehearsal-only and the seventh as unapplied everywhere until each exact-target upgrade/drift/apply plan is separately approved and proven.

Current implementation: the first ten live-ledger files remain hash/byte pinned; non-ledger drafts are quarantined. Isolated Free rehearsal `bkmfcjzalcvdsdvyxpgi` carries the first six candidates and the owner Data API operator. Hosted identity/source, activation and lifecycle-remediation suites pass `183/183`; all test users roll back. PostgREST exposes only the 14-RPC `api` schema and HTTP denies `public`; all 29 GeoAI domain tables have RLS and 39 added indexes reduce uncovered domain FKs to zero. A seventh migration now prepares the product decision to replace AAL2 with permanent verified identity, but it is unapplied everywhere. Remediation closes invitation expiry rollback/lock order, bootstrap provenance, temporary-ban status drift and the unsafe shared aggregate cursor. Two independent hosted sessions passed the table-level organization→project→invitation create/accept and create/revoke lock-order regression without deadlock and rolled back cleanly. The [receipt](SUPABASE_AUTH_REHEARSAL_RECEIPT_2026_07_16.json) records the applied six-migration state. DB-01 remains open for the seventh-migration exact-target rehearsal, authenticated RPC concurrency, resource-specific Admin pagination, real HTTP email/phone/browser/Storage personas and the separate development upgrade/drift/apply decision.

Acceptance:

- [evidenced on rehearsal only] owner completes the [Data API containment runbook](SUPABASE_DATA_API_CONTAINMENT_RUNBOOK_2026_07_16.md): `bkmfcjzalcvdsdvyxpgi` exposes only `api` with positive/negative HTTP evidence; the separate development target still needs its own exact-ref plan and authorization;
- [evidenced for the exact candidate] clean replay succeeds on an ephemeral Supabase/Postgres/PostGIS environment from migration 1 to head;
- the GitHub `database-replay` job passes on the final exact candidate and preserves start/reset plus all 71 pgTAP assertions; upgrade replay and the remaining live/persona checks below are separate acceptance conditions;
- every migration has a unique CLI version; the five `20260618_*` and two `20260624_*` files are replaced or reconciled through an upgrade-safe, recorded history repair rather than silently renamed after apply;
- upgrade replay succeeds from the current development schema; drift is zero or explicitly dispositioned;
- every GeoAI public table has an intentional RLS/privilege decision; private tables are not reachable by `anon`;
- the complete ordered migration chain is inspected for effective grants/policies: every historical Preview `anon` SELECT policy/grant is either intentionally allowlisted or explicitly retired, and CI fails if a later migration reintroduces it;
- the owner records one canonical identity model. Recommended: global profile + `organization_memberships` + `project_memberships`; TS/session DTOs and RLS use the same model;
- `profiles.auth_user_id` has an upgrade-safe `auth.users(id)` FK and required uniqueness; security-critical org/project/member fields are non-null where the model requires it; `UNIQUE(project_id,user_id)` and composite organization/project consistency are enforced;
- the legacy authenticated AOI `FOR ALL` policy is removed; operation-specific writes require an explicit authorized role and pass wrong-role personas;
- SECURITY DEFINER helpers set a safe search path and have least-privilege EXECUTE grants;
- pgTAP or equivalent tests prove positive and negative no-session/no-membership/wrong-org/wrong-project/role personas;
- apply and rollback plan identifies project ref, exact commit, owner action and evidence artifact. No live apply is implicit.

## ENV-01 — Public Vercel credential evacuation and rotation

Priority: P0 / S0
May run in parallel with: DB-01
Blocks: AUTH-01 integration closure, protected persistence and any real-source promotion
Status: **Closed for non-Production Preview integration on 2026-07-16**; Production was not changed.

The candidate application no longer imports or requires a Supabase service-role credential or direct database URL. A privileged development Supabase credential was nevertheless observed in the existing public Preview environment. On 2026-07-16 the owner confirmed removal of `SUPABASE_SERVICE_ROLE_KEY` and the legacy anon variable from the Vercel Preview application, Shared-scope review, disablement of development legacy `anon`/`service_role` keys, and Preview-only configuration of the rehearsal URL, a modern publishable key, `supabase_auth`, hard enforcement and public-demo denial. No credential value was recorded.

Current implementation: application runtime accepts only `sb_publishable_` keys; operator variables are isolated under `GEOAI_OPERATOR_*`; `.env.operator` is gitignored; target/write/backup/rollback/pre-ledger receipts bind project ref, Git HEAD and migration-tree SHA; tracked secret shapes are scanned in CI. Owner action closed the dashboard evacuation/legacy-disable step. Exact head `8e0039260f4cf201b230288b6b02c48d2955600e` passed Quality Gate run `29534323096`; fresh Preview `dpl_66rk4tVny9TmPjo7BKona5Xo1p1b` is READY and reports `supabase_auth`, hard access, `allowDemoPublic:false`, no anonymous demo identity, private/no-store session responses and no Auth-route runtime error cluster. Auth client bundles contain neither the legacy anon variable name nor service-role variable name. Historical deployments are not reused as evidence.

Acceptance:

- inventory Vercel Development/Preview/Production environment-variable names and scopes without exposing values in logs, PRs, tickets or Confluence;
- remove `SUPABASE_SERVICE_ROLE_KEY`, Supabase secret keys and `SUPABASE_DB_URL` from every public GeoAI application scope; isolate privileged provisioning/migration/storage work in a separate operator/worker or trusted-terminal environment;
- rotate every removed credential if it was reused, disclosed to an unintended runtime or cannot be proven unique; record only rotation time/owner/scope, never the value;
- redeploy the exact reviewed SHA and prove the public app build, static/sanitized status routes and browser-local demo work with no privileged Supabase/DB credential present;
- confirm AUTH-01 caller repositories use only an `sb_publishable_` key plus the actual caller JWT and RLS; legacy anon JWT and service-role credentials are never user authorization;
- add a CI/source contract and Vercel configuration review preventing privileged database credentials from returning to the public app.

## AUTH-01 — Request-scoped Auth and RBAC kernel

Priority: P0 / S0
Tracks: GitHub [#88](https://github.com/mmgolikov/geoai-mvp/issues/88)
Depends on: DB-01 schema decision and ENV-01 exact-deployment evidence; Auth may be developed against an ephemeral project in parallel, but integration cannot close first
Blocks: Admin, protected reports, user files, durable project writes, pilot mode

Implement one server authorization kernel that receives the actual request/cookie context, creates a caller-scoped Supabase client, verifies `auth.getUser()`, resolves one profile, organization and project membership, and enforces role/action rules. Protected modes fail closed; public demo is an explicit allowlisted read projection with browser-local deterministic generation only. Both server generation POSTs remain 403 before body parsing until AUTH-01, and public demo is never a fallback after an Auth error.

Current implementation: exact allowlisted development/rehearsal targeting; effective-mode-gated browser/server SSR clients; middleware claim refresh; PKCE email callback; safe session/logout; phone OTP send/verify; optional existing-password sign-in; and one simple login screen. Landing `View demo` and `Leave a request` actions both enter that screen with a bounded `/workspace` return; once a saved session is detected the login screen continues immediately to Workspace. Shared navigation exposes a circular profile icon that highlights an authenticated session and opens `/profile`. A resolved-session client gate covers Workspace, Projects, Explore and Profile in `supabase_auth`: it waits for session restoration, preserves the explicit browser-only mock session and redirects resolved anonymous visitors through the bounded login continuation; `demo_public` remains direct and `disabled` fails closed. This gate is post-hydration UX containment, not server authorization. `/profile` adds full name, region, editable contact phone, browser-local photo, registered-email/password actions and default B2B/B2C role propagation into Workspace and Projects; its oversized top demo caveat is removed while compact limitations remain. User-editable Auth metadata is UX-only and is not read by server authorization. Verified sign-in phone mutation and protected avatar Storage remain withheld. The public mock account `demo@geoai.space` / `111111` creates browser-only demo state and is never accepted as protected identity. `/register` and `/mfa` redirect to `/login`; onboarding automatically stages invitation links and never asks users to paste a technical token. Same-origin Admin/Onboarding APIs require a verified permanent identity without MFA. The Admin surface calls only `api.organization_admin_snapshot/create_* /revoke_invitation/set_*`; the raw invitation is returned once in a URL fragment, moved into a short-lived HttpOnly same-site cookie for sign-in, then cleared after success, while only its SHA-256 hash reaches the RPC. Before `api.current_profile()`, UUID `claims.sub` must equal canonical `auth.getUser().id` and both anonymous markers must be explicitly false. AUTH-01B still separately validates exact project/action through `api.current_project_access()` and bounded `api.current_source_releases()`. Product repositories and hosted runtime-persona readiness remain false. Static and production-build evidence passes locally, while fresh exact-head route-gate evidence is pending publication. Real hosted profile/email/password/phone/RLS/IDOR/Admin personas, rendered-browser entry/profile/redirect interaction, an SMS provider and the unapplied MFA-removal migration remain open until an exact target is approved and verified.

Acceptance:

- valid member personas pass only their organization/project and allowed actions;
- no session, invalid/expired token, missing profile, no membership, wrong organization/project and insufficient role return deterministic 401/403 before any read/write;
- no placeholder org/profile/membership is created or returned in protected mode;
- the environment-driven wrapper matrix covers `disabled | demo_public | supabase_auth` × `soft | hard` × demo-bypass true/false, and the lower access decision is authoritative;
- public-demo server mutations remain blocked and no synthetic membership can override a hard-mode denial;
- every protected API and report/print route uses the kernel; object IDs derive their project scope from storage, not caller input;
- screening review, client attestation and official attestation are distinct capabilities; analyst cannot mint client/official validation, client attestation currently requires an admin/owner capability, and official attestation requires the designated owner/compliance authority with immutable actor/evidence provenance;
- every identity/project response and signed URL uses `private, no-store, max-age=0` plus `Vary: Authorization, Cookie`; the route-access manifest fails CI if a new protected GET bypasses the shared response boundary, while immutable public seeds are explicit allowlists;
- report writes accept only server-authoritative analysis/evidence receipts bound to caller, project, run, checksum and custody; caller-supplied readiness/lineage/source IDs never establish evidence use;
- request repositories carry the caller session and never import the service-role key;
- strict matcher, schema, session DTO and RLS agree on profile/organization membership; no code requires a field/relation absent from the canonical schema;
- automated negative IDOR matrix runs in CI and writes exact-SHA evidence.

## STORAGE-01 — Protected evidence pipeline

Priority: P0 / S0
Tracks: GitHub [#90](https://github.com/mmgolikov/geoai-mvp/issues/90)
Depends on: AUTH-01, DB-01
Blocks: any client binary or confidential evidence

Acceptance:

- organization, project, evidence ID, uploader and object path derive from authorized server state;
- streaming/edge body limit applies before full multipart materialization;
- public-demo evidence/file APIs reject uploads before object storage or shared server persistence; browser-only claims are verified end to end;
- extension, declared MIME and magic-byte detection agree against an allowlist;
- checksum, size, detected type, quarantine/scan state, uploader and retention metadata are durable;
- unsafe, unscanned or mismatched files cannot be downloaded or used by AI/reports;
- upload/list/signed-read/delete tests run as real user personas through RLS/Storage policies;
- `storage.objects` policies are applied through the supported owner path and bind bucket/path/object owner to validated caller/project identity; service role is never used as a user authorization shortcut;
- the current four-private-bucket/zero-policy baseline is retained as fail-closed until the complete persona matrix passes; no generic policy is added merely to make uploads work;
- signed URL TTL, revocation, wrong-tenant denial and audit trail are evidenced;
- downloads set a safe content disposition and `X-Content-Type-Options: nosniff`; upload validation records magic-byte detection and content scan/CDR outcome, not only extension and declared MIME;
- malware scanning outage fails closed and has an operator runbook.

## SOURCE-01 — Real-source custody and visibility

Priority: P0 / S0
Tracks: GitHub [#89](https://github.com/mmgolikov/geoai-mvp/issues/89); [#80](https://github.com/mmgolikov/geoai-mvp/issues/80) for geometry-bearing scope
Depends on: DB-01; AUTH-01 for private sources

Current implementation: pending migration `20260716113000_geoai_source_custody_foundation_v1.sql` defines five RLS-enabled/direct-grant-closed tables (`source_catalog`, `source_releases`, `source_artifacts`, `source_release_status_events`, `source_ingestion_receipts`). Releases, artifacts, status events and receipts are append-only; composite tenant/release and actor organization/project-membership FKs close cross-scope records. Legacy snapshot catalog backfill defaults to `restricted`/`registered_unverified`. `api.current_source_releases()` is caller/project-scoped, bounded to 1–100 rows, returns only an explicit `approved` projection for owner/admin/analyst/viewer, denies `client_viewer` and omits arbitrary quality/lineage summary JSON, object paths, source URIs and secrets. The static checker and 71-assertion pgTAP plan passed at functional/evidence head `e999c5a07d3ced6c95f2eb44f6a5f03a9c17caea` in run `29500488408`; job `87627894968` provides clean and synthetic-prefix-rehearsal receipts only, not live source-persona or activation evidence.

SOURCE-02 now stages a pure `reserve_or_replay` claim v1. Execution and idempotency hashes bind the exact environment, tenant, connector/provider/parser, rights, broker, endpoint/network/body and acquisition-window contract; actor is omitted only from the shared acquisition key. The claim is unsigned correlation evidence with authorization `none`, so an external registry/plan/hash revalidation boundary, trusted executor and transactional SOURCE-01 writer remain mandatory. The registry is empty; there is no DNS/provider request, environment/secret read, credential injection, persistence or atomic pre-fetch reservation writer; Production is denied. These remain disconnected foundations only and all provider writes are blocked.

Acceptance:

- exact-SHA GitHub `database-replay` executes clean 71/71, the synthetic ledger-prefix rehearsal and a second 71/71; job `87627894968` evidences only that synthetic/ephemeral sequence, while a live-derived current-development upgrade clone, drift/advisors and real JWT/HTTP source-read personas remain separate evidence;
- a trusted operator/worker write design is approved and tested for idempotent receipt/release creation, quarantine/revocation, rollback and rights checks before any provider write is enabled; the public application receives no custody-table write grant;
- source/snapshot records use explicit `public_demo`, `project_private` or `operator_private` visibility; nullable tenant/project never means public;
- all existing `project_key IS NULL` anonymous snapshot policy paths are removed before the first real/operator ingestion, and a negative PostgREST test proves that a NULL-key snapshot is not anonymous even when `project_id` is non-null;
- public APIs return only the audited projection and never raw/normalized paths, bucket keys, local filenames, provider asset URLs or secrets;
- project source-release reads also exclude unstructured `quality_summary`/`lineage_summary` JSON; future fields do not enter the request repository without explicit DTO review;
- public source DTOs enumerate every approved field explicitly; spread/delete projection is prohibited so new internal manifest fields cannot become public by default;
- anonymous manifest/sources/status responses remain bundled-only with `contractVersion: 1.3`, manifest `1.6`, `liveRegistryIncluded:false`, zero live counts and no Supabase probe; candidate `compact_public_v1` stays within 64 KB (other data-foundation routes 48 KB) without dropping caveats, with exact-head runtime evidence;
- anonymous source routes statically import only the reviewed manifest and compact aggregate-quality records; Vercel output traces exclude deep DLD/OSM/Overture/WorldPop snapshots. Per-source zero/count/status/`usedInAnalysis` truth has adversarial runtime contracts and group totals are not copied to categories;
- importer requires source URL, provider, rights/licence/attribution, access/retrieval time, checksum, schema version, row/feature count, coverage, owner and quarantine/quality state;
- duplicate, stale, malformed, rights-unknown and out-of-coverage inputs fail closed;
- the current Preview source pack remains non-persistent, fixed-geography, `scoreImpact:none`; Production remains disabled;
- Preview provider execution is off by default and requires the flag, a 32+ character server-only operator token and matching request authorization. NASA observations must be date-aligned, valid-calendar/in-period and in parameter ranges; Copernicus must use the exact approved collection, strict UTC in-period datetime and 0–100 cloud cover; Overpass must contain exactly the three finite non-negative counts. Fixed HTTPS hosts, redirect rejection, cancellation of non-success/oversized bodies, missing/wrong credential tests and Production denial are mandatory; distributed rate/concurrency budgets and cross-instance circuit evidence remain required;
- geometry, imagery, wider distribution and score impact each require their own validation and owner activation evidence.
- SOURCE-02 remains provider-neutral planning only: a separate trusted executor must re-resolve DNS/connect-time IP, inject broker-held credentials, enforce distributed budgets/circuits, validate provider-specific semantics and create SOURCE-01 receipts/releases transactionally; no planning result itself authorizes persistence.
- a trusted transactional writer atomically reserves the shared acquisition key before any provider fetch and returns an existing receipt on conflict; the current pure claim does not perform this reservation.

## AI-01 — Safe AI gateway and privacy controls

Priority: P0 before client context / P1 for public-demo resilience
Tracks: GitHub [#92](https://github.com/mmgolikov/geoai-mvp/issues/92)
Depends on: AUTH-01 for protected use

Build on the audit branch's bounded JSON, timeout/token cap and explicit upstream gate.

Acceptance:

- authenticated project/persona and explicit purpose are required for protected upstream use;
- distributed per-user/project/IP rate limits, quotas and concurrency budgets work across instances;
- privacy/data classification and redaction prevent unapproved evidence, PII, secrets and internal paths entering prompts/logs;
- provider request/response retention and regional-processing choices are documented and configurable;
- prompt inputs are schema-validated and delimited; unsupported/prohibited claims are removed or block output, not only labelled;
- cost, latency, model, token, refusal, fallback and policy outcomes are observable without logging sensitive content;
- browser-local deterministic analysis remains available; future authenticated server upstream failure cannot silently change decision semantics or turn into an unverified server fallback.

## GEO-01 — Server-side AOI integrity

Priority: P1 / S1
Tracks: GitHub [#93](https://github.com/mmgolikov/geoai-mvp/issues/93); [#80](https://github.com/mmgolikov/geoai-mvp/issues/80) where real geometry is involved

Current implementation: the shared polygon validator rejects non-finite and out-of-WGS84 coordinates, tuples other than exact longitude/latitude pairs, unsupported antimeridian crossings, duplicate/self-intersecting and over-complex polygons, and recomputes bbox, centroid, area and perimeter. The permanent test exercises 11 geometry personas: one representative Dubai success and ten adversarial failures. Public-demo AOIs remain browser-local; authenticated server-route byte/feature/ring enforcement and durable-write evidence are still open.

Acceptance:

- server enforces content bytes, coordinate count, ring/feature count, coordinate ranges and allowed geometry types;
- topology is validated and bbox, centroid and area are recomputed server-side;
- abusive complexity, NaN/Infinity, self-intersection policy and antimeridian cases have explicit outcomes;
- geometry is normalized deterministically; stored and derived metrics cannot be caller-forged;
- fuzz/adversarial tests and representative Dubai cases run in CI.

## OPS-01 — Evidence-backed readiness and observability

Priority: P1 / S1
Tracks: GitHub [#91](https://github.com/mmgolikov/geoai-mvp/issues/91)
Depends on: AUTH-01 and DB-01 for protected certification

Acceptance:

- readiness evidence is tied to exact deployment SHA, Vercel environment, Supabase project ref, test artifact, timestamp and TTL; booleans cannot create a verified state;
- request IDs correlate edge/function logs, database actions, AI/source calls and audit events;
- structured errors, latency/error-rate metrics, traces, alert thresholds and runbooks cover critical flows;
- public responses use stable generic error codes plus correlation IDs; raw database/provider `error.message`, SQL/schema names and internal paths stay only in access-controlled logs;
- protected-mode local fallback is impossible and Production dependency failure is fail-closed;
- Vercel public-demo runtime cannot use shared `/tmp` persistence; public readiness DTOs omit project refs, bucket/table inventories and credential-presence flags;
- public DB/Storage/platform/pilot/RLS/limitations DTOs have shared types/contract tests proving static/sanitized behavior; consumer types cannot drift back to removed infrastructure fields;
- anonymous pilot/source status cannot infer operator-token or flag presence from `sourceMode` or any other field;
- JSON and multipart limits are applied before full-body materialization on every public/protected route, and the public Preview runtime does not carry a service-role credential;
- ENV-01 exact-deployment evidence proves the public app has no service-role/secret Supabase key or direct database URL and records any required rotation without exposing values;
- Production CSP removes avoidable broad script/style allowances and upload handling treats CSV/GeoJSON strictly as data; security-header regression evidence is exact-SHA;
- CI adds clean migration replay, Auth/RLS personas, route IDOR, adversarial uploads, dependency/secret scanning and security-header checks;
- GitHub Actions are pinned to reviewed immutable SHAs.

## UX-01 — Accessibility remediation verification and critical-flow browser suite

Priority: P1 / S1
Tracks: GitHub [#95](https://github.com/mmgolikov/geoai-mvp/issues/95)

The audit branch fixes the confirmed dialog focus/Escape/background isolation and criteria-control accessible-name defects. Treat those edits as unverified until this task supplies browser evidence.

Acceptance:

- map/dialog opening moves focus inside, traps Tab/Shift+Tab, closes on Escape, returns focus to the opener and hides inert background content from assistive technology;
- desktop, tablet and 390px mobile critical journeys have automated Playwright checks;
- axe or equivalent has no critical/serious findings on Hub, Workspace, Projects, Explore and print routes;
- keyboard-only criteria-first/map-first switching, project save/open and report print are covered;
- visual regressions are reviewed against stable fixtures, not stitched full-page screenshot artefacts.
- mobile primary navigation exposes Workspace and Projects in at most one action; Workspace/Explore have one meaningful `h1` and interactive target sizes meet the chosen WCAG 2.2 baseline.
- project/candidate selectors have programmatic labels; audience toggles expose pressed state; expanded/disabled states and async results use appropriate ARIA/live-region semantics; 9–11 px critical text and clamped caveats are removed;
- every protected control is disabled before fetch with a visible reason and no active UI control targets a guaranteed 403; `/demo` is verified as a 307 redirect to `/workspace`.

## PERF-01 — UI decomposition and performance budgets

Priority: P1 / S1
Tracks: GitHub [#95](https://github.com/mmgolikov/geoai-mvp/issues/95)

Current implementation: Workspace comparison, express-result and report-preview surfaces are dynamically loaded behind a stable accessible loading state. On the same local production-build basis, First Load JS decreased from 252 kB to 218 kB (34 kB, approximately 13.5% gzip). The local Auth candidate initially regressed this to 285 kB by statically importing Supabase from the root provider; independent review moved that runtime behind a mode-gated dynamic import and the current build is 220 kB. Functional/evidence Preview `dpl_CY7oNavQwu5ddkhRRLaR3FWTd3d9` is READY at `https://geoai-oni3o8lwu-geoaidev.vercel.app`; its six recorded compact source/readiness/lineage responses are 4,292–18,284 B, all below their 48/64 KB budgets. This closes the narrow lazy-result increment and remote response-size check only; rendered browser flow, route JS budgets, Core Web Vitals and broader coordinator/Mapbox/Hub work remain open. The HTTP matrix is not represented as browser evidence.

Acceptance:

- split Workspace, Project Dashboard, Map Workspace and Analysis panel into bounded modules with explicit state contracts;
- lazy-load map/heavy analysis/report-only code outside initial routes;
- set and enforce route JS, build-time, API latency and Core Web Vitals budgets on representative mobile/desktop profiles;
- avoid duplicate fetching/render loops and prove no functionality regression with component/browser tests;
- record before/after measurements on the same exact-SHA Preview.
- Home does not import/initialize Mapbox until WebGL support and visibility/use require it; expected no-WebGL fallback emits no application error.
- remove the disabled legacy `AnalysisPanel` seven-request fanout state/effects/handlers rather than retaining roughly 500 unreachable lines;
- replace or bound the Project Hub's six-request bootstrap with one aggregated/snapshot public read model, and record request count plus response bytes before/after;
- retain the exact-SHA Preview-proven compact 64 KB/48 KB source projections, including `/api/external-data/sources`, and enforce response-byte/API latency budgets continuously; the recorded 4,292–18,284 B route bodies supersede the old 133–158 KB baseline without proving browser performance;
- enable `preserveDrawingBuffer` only during explicit map capture; route JS/build/API/Core Web Vitals budgets use the same declared mobile/desktop profiles and exact SHA;
- retain geometry-specific tuple/cardinality/closed-ring/WGS84 GeoJSON rejection, move bounded CSV/GeoJSON parsing off the main thread, measure worst-case 5 MB/10k-row/2.5k-feature responsiveness and fail without partial browser persistence.

## PRINT-01 — Report provenance and pagination governance

Priority: P1 / S1
Tracks: GitHub [#95](https://github.com/mmgolikov/geoai-mvp/issues/95)

The audit branch adds explicit source/attribution metadata to the seeded basemap and renders it with every map snapshot. Complete the broader export-quality gate:

Acceptance:

- every rendered basemap/image has durable source, licence/attribution, capture time and target metadata; missing attribution blocks distribution;
- page number, report/package ID, generation timestamp, confidentiality/classification and mandatory caveat appear consistently;
- cards/tables avoid unintended page splits, including the enterprise audit trail;
- analysis/comparison packs remove avoidable empty pages and remain readable at A4/Letter;
- PDF regression tests verify page count ranges, text/provenance presence, links and split-card rules.

## STATE-01 — Persistence identity, normalization and public-demo isolation

Priority: P1 / S1
Tracks: GitHub [#98](https://github.com/mmgolikov/geoai-mvp/issues/98)
Depends on: DB-01 and AUTH-01 for durable multi-user state

Acceptance:

- every public-demo user-created AOI/upload/report/comparison/data-room/validation/workflow/package record is browser-local or immutable seed data; no Vercel `/tmp` cross-user store exists;
- uploads, comparison sets and report summaries store an explicit `projectKey` as project-scoped records inside the shared versioned demo namespace; legacy uploads without `projectKey` are not silently migrated;
- unknown explicit Data Room/report/API/local lookups return controlled empty/not-found and never silently substitute `demoProjects[0]`; Workspace may reset an invalid URL only after clearing it and showing an explicit message; two-project reload E2E proves no leakage;
- Project Hub consumes browser artifact summaries after reload, and UI emits no false “saved” success state when persistence did not occur;
- the implemented `geoai-public-demo-v2` namespace remains unreadable outside `demo_public` and Auth startup/sign-out purges it plus exact legacy keys; before multi-user use, add verified subject+organization scoping, expiry/TTL and explicit user purge controls;
- browser-safe AOI/upload/analysis/report/comparison controls remain enabled; protected controls stop before fetch, explain the capability gap and produce zero guaranteed-403 requests;
- reports expose a canonical `reportKey`, accept UUID only as an explicit internal lookup, and pass create → list → fetch → print → delete round-trip tests;
- comparison list/get/update/delete use the same Supabase/local contract, normalize snake_case rows, and never mix UUID, `comparison_key` or report IDs;
- report/package print routes enforce the same request-scoped project access as APIs and preserve attribution;
- caller-controlled caveat/status/scope fields are rejected or overwritten by server-built DTOs;
- persistence evidence uses caller JWT/RLS and proves wrong-user/wrong-project denial, not service-role CRUD.

## HUB-UX-01 — Mobile Project Hub information architecture

Priority: P2 / S2

Acceptance:

- the primary project outcome, readiness blockers and next action appear before technical diagnostics;
- source lineage and Data Readiness use progressive disclosure and remain fully reachable;
- representative mobile content height and task completion are measured against the current roughly 5,020 px baseline;
- no current source caveat or evidence detail is removed merely to shorten the page.

## DOCS-01 — Documentation lifecycle and Confluence IA

Priority: P1 / S2
Tracks: GitHub [#94](https://github.com/mmgolikov/geoai-mvp/issues/94)

Acceptance:

- Confluence Hub is the sole operational snapshot and links current release, CI, Vercel, Supabase, source state, decisions, risks, audit and backlog;
- Home is a stable charter/navigation page rather than a second runtime dashboard;
- repository [Documentation Index](DOCUMENTATION_INDEX.md) remains the current-truth entry point;
- all 12 active repository authorities carry owner/status/last-verified/authority/successor metadata; versioned snapshots are explicitly historical and direct current navigation labels them as such;
- the machine-readable [Confluence sync map](CONFLUENCE_SYNC_MAP.json) maps every operational page ID to role, authority and successor; Hub links the GitHub execution program and Codex backlog directly;
- the generated lifecycle/successor manifest, clickable archive sidecar and CI gate remain complete and derived (current evidence: 131 in-scope Markdown documents, 12 active, 119 non-active/generated, zero unclassified, including `docs/artifacts`); no historical hand count such as 80 becomes a contract;
- Confluence audit uses the canonical Hub root plus all 253 unique descendants, maximum hierarchy depth eight and no unproven orphan claim; it reconciles CQL's three missed IDs;
- verified stubs and sibling numbering collisions (`06.02`, `06.03`, `06.42`, `06.46`, `06.56`–`06.59`, `07.07.11`, `09.10.04`, `09.13`) are consolidated/labelled, and the two Hub label/target mismatches are fixed;
- release automation flags cross-document SHA/deployment/maturity/Auth/privacy/source/market/reviewer contradictions; scheduled monthly semantic review has an owner and updates Hub plus every affected mapped page atomically.
