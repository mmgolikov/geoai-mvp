# GeoAI Manual QA Checklist

Use this checklist before demos, Vercel deployments, and milestone checkpoints.

Status: Active checklist
Last verified: 2026-07-16
Owner: GeoAI Engineering / QA
Authority: Current verification and release-gate criteria
Successor: None; any replacement must update `DOCUMENTATION_INDEX.md`
Current authority: [Current Release State](CURRENT_RELEASE_STATE.md)
Navigation: [Documentation Index](DOCUMENTATION_INDEX.md) · [Current Release State](CURRENT_RELEASE_STATE.md) · [Full System Audit](FULL_SYSTEM_AUDIT_2026_07_16.md) · [Codex Backlog](CODEX_BACKLOG_2026_07_16.md) · [Confluence Hub](https://geoaimvp.atlassian.net/wiki/spaces/PH/overview)

This checklist primarily verifies the unreleased Draft PR #97 audit candidate. Production remains on PR #87: use only built-in synthetic fixtures and do not enter/upload user/client AOIs, CSV, GeoJSON, filenames, evidence or dynamic package data until the containment candidate is merged and deployed. The released `/explore` source UI boundary is also not verified despite the source API returning 503.

Exact-head receipt: head `e999c5a07d3ced6c95f2eb44f6a5f03a9c17caea`, tree `73b7c198813d6aede795b8b186bd4d58e741b181`; run `29500488408`, app job `87627894974` and DB job `87627894968` succeeded. Quality artifact `8376235675` and database artifact `8376300064` preserve separate receipts. Preview `dpl_CY7oNavQwu5ddkhRRLaR3FWTd3d9` is READY at `https://geoai-oni3o8lwu-geoaidev.vercel.app`. HTTP/API/security and response-size receipts are not browser-flow evidence; desktop/mobile/keyboard/print remain unclaimed.

## Mandatory pre-Auth / real-source gates

- [ ] Request-scoped caller JWT/profile/project membership is implemented and negative 401/403 cases pass. **Current status: blocked.**
- [ ] `profiles.auth_user_id` has an upgrade-safe `auth.users(id)` FK plus required uniqueness; authenticated AOI writes enforce an explicit authorized role, not membership alone. **Current status: blocked.**
- [x] Every API handler is classified in `security/api-route-access.json`; static guard contract passes.
- [x] Permanent-user evidence requires UUID `claims.sub === auth.getUser().id` and explicit claims/user `is_anonymous === false` before profile RPC; mismatch maps to 401, anonymous identity to 403 and ambiguity fails closed. **Local Auth/Admin/Onboarding routes consume this boundary; hosted real-user HTTP/JWT/RLS personas remain pending.**
- [x] AUTH-01B pure contract: cookie-only Product reads require an exact project key/action, reject bearer/non-Auth modes, verify caller-bound `api.current_project_access()`, reuse the canonical role kernel, deny `client_viewer` raw source access and expose no base-table/service-role/cache path. **All Product repository/persona readiness flags remain false; no Product route is activated and real HTTP/JWT/RLS personas are pending.**
- [x] Exact Supabase targeting accepts only the named development/rehearsal refs, plus explicitly enabled loopback; inherited property names, alternate ports, credentials, paths, query/hash and arbitrary hosted refs fail closed.
- [x] Browser/server Supabase Auth clients and PKCE callback require effective `supabase_auth`; Auth-cookie mutations retain exact same-origin enforcement even when Auth mode is off.
- [x] Invitation token arrives only in a fragment, is immediately moved to a short-lived HttpOnly same-site cookie for the magic-link round trip, is cleared after successful acceptance and reaches Postgres only as SHA-256.
- [x] The active product flow has no MFA enrollment, challenge, recovery, factor-management route or AAL2 redirect. Admin still requires a verified permanent Supabase identity and authorized role; the browser-only mock demo cannot satisfy this boundary.
- [x] `/profile` statically covers full name, region, editable contact phone, browser-local JPEG/PNG/WebP avatar (1 MB), B2B/B2C role defaults, registered-email confirmation and password change. Server authorization does not read user-editable metadata; explicit Workspace project/analysis/guided-demo URLs override profile defaults. **Real hosted account actions, rendered browser evidence, protected avatar Storage and verified sign-in phone change remain pending.**
- [x] Landing `View demo` and `Leave a request` actions enter `/login` with a bounded `/workspace` return and do not link directly to Workspace/Projects; saved sessions continue automatically, the authenticated profile icon is highlighted and opens `/profile`, and the oversized demo caveat is absent from the profile header. Exact functional head `bdb7f0629c39838e2e3451925825699df7f84fc0` passed Quality Gate `29576709336`; READY Preview `dpl_HNLx2RCVTYKjnHvxhi8mEoHpLgfa` contains both actions/targets and returns 200 for both login intents, profile and Workspace. **Rendered-browser interaction and real-user Auth evidence remain pending.**
- [x] Static route-gate contract requires `/workspace`, `/projects`, `/explore` and `/profile` to wait for resolved browser session state in `supabase_auth`, use only the bounded login continuation for resolved anonymous users, preserve `demo_public` and fail closed in `disabled`. Exact functional head `77ac593b51d43a62ddc89656dbae735378cab69f` passed Quality Gate `29579739837`; READY Preview `dpl_6Er5tTEesM2V6RA7ZQD8eR5VYJpQ` returns only the restoration shell and no product content for all four route HTML responses. **This is client-rendered UI containment, not server authorization; hydrated browser redirect/session-restoration evidence is pending.**
- [x] `npm run test:e2e:auth-session` executes the focused Chrome journey in CI: fresh direct Workspace query → bounded login continuation → demo credential fill/sign-in → highlighted profile control → reload plus Projects/Explore/Profile direct navigation → sign out → cleared mock marker and renewed Workspace login gate. Exact head `4e5208a729f9dfb13068dc9521871da74a7de8db`, Quality Gate `29582671453`, application job `87891896641`: Chrome `150.0.7871.114`, `1/1` passed in `24.3 s`; quality artifact `8407702484`. The runner constructs a fake publishable-key-shaped value and uses no hosted identity/write. **This proves only browser mock-session UX; real Auth/RLS/Admin personas remain open, and the associated Vercel deployment is rejected for middleware 500s.**
- [x] User-facing repository client cannot select the Supabase service-role key.
- [x] Exact-functional-content canonical migration chain replays cleanly from migration 1 to the candidate migration head on the ephemeral Supabase/Postgres/PostGIS target. **This does not prove upgrade replay, development drift or live apply.**
- [x] Every canonical Supabase migration filename has a unique 14-digit CLI version; non-ledger duplicate-version drafts are quarantined outside `supabase/migrations`. **Replay certification remains separate.**
- [x] Static local replay contract: `supabase/config.toml` exposes only `api` on Postgres 17, Supabase CLI `2.109.1` is pinned and CI `database-replay` is defined.
- [x] Exact-head DB job `87627894968` passes the clean 71-assertion pgTAP suite, the synthetic exact-ten-ledger-prefix/pre-ledger-repair/three-pending-migration/security-surface rehearsal and a second 71/71. **This is not a current-development clone, live-derived upgrade replay, drift, live apply or DB-01 certification.**
- [ ] Live positive/negative RLS persona matrix passes for every protected table. **Current status: mock plan only.**
- [ ] Protected upload validates total body, server-derived scope, magic bytes, checksum and quarantine/AV state. **Current status: blocked.**
- [x] Static SOURCE-01 contract proves five RLS-enabled/direct-grant-closed custody tables, immutable release/artifact/status/receipt records, composite tenant/release and actor membership FKs, `restricted`/`registered_unverified` legacy backfill, and approved-only bounded `api.current_source_releases()` output without arbitrary quality/lineage summary JSON, paths, URI, secrets or `client_viewer`.
- [x] Static identity/Storage contract proves the review-only policy uses narrow `SECURITY DEFINER geoai_private.has_storage_project_role()` instead of protected base/Auth caller joins, allows only authenticated object fetch/signing operations, denies bucket listing and excludes `client_viewer` raw-object access. **Policy remains unapplied; live Storage personas are pending.**
- [ ] Real snapshots have explicit tenant/visibility and custody; nullable project scope is not treated as public. **Current status: schema contract is applied/SQL-tested on rehearsal only, but development/Production apply, real source personas, rights and trusted-worker evidence remain blocked.**
- [ ] Source-provider writes remain disabled until a trusted operator/worker path proves idempotent receipts, rights checks, quarantine/revocation, rollback and negative public-app write access. **Current status: no provider is connected and the pending migration exposes no write API.**
- [x] SOURCE-02 pure `reserve_or_replay` claim binds exact execution/idempotency inputs and omits actor only from the shared acquisition key; the unsigned digest has authorization `none` and requires external registry/plan/hash revalidation, trusted execution and transactional writing. **Registry empty; no fetch/env/secrets/persistence/Production; atomic pre-fetch reservation writer absent.**
- [x] Public source DTOs exclude raw/normalized filesystem and Storage object paths.
- [x] OpenAI key alone cannot activate upstream execution; body/time/token bounds are enforced.
- [x] Candidate static check: public-demo upload, AOI, report, analysis-run and comparison state remains browser-only; Vercel server-local fallback is disabled and seeded reports are immutable server authority. **Exact-SHA Preview HTTP checks pass, but Production remains on PR #87 and no browser-state isolation claim is made.**
- [x] `npm run test:private-cache-boundary` proves all 18 manifest-classified project GET routes plus Auth session use `private, no-store, max-age=0` and `Vary: Authorization, Cookie`; only the explicit immutable package seed branch may be public. **Functional/evidence application job `87627894974` passes; protected live-persona evidence remains pending.**
- [ ] AI quotas, distributed rate limiting, privacy redaction and cost telemetry are verified. **Current status: blocked.**
- [x] Production source pack returns 503/disabled/zero; no provider request or persistence occurs.
- [x] Candidate static check: Preview/local source execution is off by default and requires the flag, a server-only operator token of at least 32 characters and a timing-safe matching Bearer/`x-geoai-operator-token`; Production remains disabled. **Exact-SHA Preview confirms activation false, empty `sources` and fail-closed 503; the full wrong-token/provider-call matrix remains pending.**
- [ ] Runtime negative matrix proves flag-only and token-without-request-auth do not call providers, wrong tokens return 403, Production remains 503, upstream hosts stay on the fixed HTTPS allowlist, redirects fail closed and streamed bodies above 2 MB are cancelled before full allocation.
- [x] Frozen provider contracts reject NASA date misalignment/out-of-period/invalid-calendar/value-range data, wrong Copernicus collection/timestamp/cloud range and null/duplicate/malformed Overpass counts; non-success retry bodies are cancelled. **Live-provider smoke evidence remains separate.**

## Environment

- [ ] `.env.local` exists locally when running Mapbox.
- [ ] `.env.local` is not committed.
- [ ] `.env.example` contains only safe placeholder keys.
- [ ] `NEXT_PUBLIC_MAPBOX_TOKEN` is configured locally.
- [ ] `NEXT_PUBLIC_MAPBOX_TOKEN` is configured in Vercel.
- [ ] `OPENAI_API_KEY` is not required for current MVP behavior.
- [ ] `GEOAI_ALLOW_OPENAI_UPSTREAM` remains false until hard Auth, request membership, privacy and quota gates are verified.
- [ ] `NEXT_PUBLIC_AUTH_MODE` is optional and defaults to public demo access.
- [ ] `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, if configured after AUTH-01 approval, starts with `sb_publishable_`; legacy anon JWT keys are rejected.
- [x] Invalid environment values fail closed: Auth -> `disabled`, enforcement -> `hard`, demo bypass -> `false`, Supabase/Storage readiness requirements -> `true`.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is not exposed in browser/client code.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is absent from the public Preview runtime; privileged credentials belong only to an operator/worker plane. **Current status: credential presence was observed and remains a least-privilege blocker.**
- [ ] `/api/db/health`, `/api/storage/health`, `/api/platform/activation-status` and `/api/security/rls-readiness` are static/sanitized public responses: no live probes, project ref, credential-presence flags, table/policy/bucket inventories or live record counts.
- [x] `npm run build` passes for the local landing/Auth/profile/route-gate candidate; `/profile` is 121 kB, `/projects` is 195 kB and `/workspace`/`/explore` are 224 kB First Load JS after mode-gated Supabase dynamic loading.
- [x] `npm run lint` passes for the local Auth/Admin candidate.
- [x] `npm run test:user-profile` passes the local personal-field, photo-boundary, account-action and default-propagation contract.
- [x] `npm run test:auth-admin-ui` statically verifies resolved-session product-route gating and bounded anonymous continuation alongside the existing Auth/Admin contracts.
- [ ] `npm run test:vercel-output-tracing` passes after the production build; anonymous source routes trace only the reviewed manifest plus compact aggregate-quality files, never deep source snapshots.
- [ ] `GET /api/pilot-backend/status` returns the minimal public DTO (`productStage`, environment/access/auth/repository/source dimensions, demo/confidential readiness) and omits runtime env-presence, project-ref, table/bucket and credential diagnostics.
- [x] Candidate local API contract fixes public pilot `sourceMode` to `operator_only_disabled_for_public`; operator-token/flag presence cannot be inferred. **Exact Preview activation status is false/empty and the source pack returns 503; the pilot-status-specific remote matrix remains pending.**
- [ ] `GET /api/known-limitations` returns `status: "static_candidate_truth"`, `liveReadinessIncluded: false` and no live infrastructure probe.
- [ ] `npm run supabase:verify:memberships` exits safely with blockers when Supabase is unavailable.
- [ ] `npm run audit:verify` exits safely with blockers when Supabase is unavailable.
- [x] `npm run test:api-contract` passed in app job `87627894974`; exact-head Preview returns expected 200 routes, 503 disabled/zero source pack and 400 invalid climate.
- [x] `npm run test:security-headers` passed in app job `87627894974`; CSP, HSTS, `nosniff` and frame `DENY` are present. **HTTP evidence, not browser/a11y evidence.**
- [ ] `npm run ingest:dld:snapshot` exits successfully.
- [ ] `npm run ingest:osm:snapshot` exits successfully.

## Enterprise Report Pack v2.8

- [ ] `GET /api/report-packages?projectKey=dubai-investment-screening-demo` returns 200.
- [ ] Public report-package GET returns `compact_public_v1` / `dashboard_summaries_v1`, no `items` or full sections, `dynamicStoredStateIncluded:false`, at most 10 summaries and no more than 16 KB; only this immutable-seed response may use bounded public caching.
- [ ] `POST /api/report-packages` returns 403 in public demo; after AUTH-01 it creates a package only with verified project membership and durable RLS-backed persistence.
- [ ] `GET /api/report-packages/[id]` returns package metadata and sections.
- [ ] `GET /api/report-packages/[id]/json` returns safe metadata without secrets, signed URLs or private file contents.
- [ ] `GET /api/report-packages/[id]/export` returns export manifest metadata.
- [ ] `/report-packages/[id]/print` requires verified project access for dynamic packages and renders a client-ready printable package after Auth.
- [ ] Package/report IDs are validated as canonical already-decoded raw IDs; malformed/double-encoded/unknown IDs return controlled 400/404 and never trigger cross-project fallback or all-project package construction.
- [ ] Printable package shows Back and Print / Save as PDF only.
- [ ] Project Dashboard shows compact Enterprise Report Packages section.
- [ ] If report-package actions render in Workspace, they remain secondary and protected actions are visibly disabled with a reason; the dormant legacy Data Room block is not a required public surface.
- [ ] Primary Run Express Analysis CTA remains pinned and visible.
- [ ] After desktop/tablet map point selection, `Run Express Analysis` is visible inside or immediately below the Selected Point / AOI / Object card.
- [ ] When no valid selection exists, the workflow shows disabled `Run Express Analysis` with `Select a map point, AOI, object, or candidate preview to begin.`
- [ ] After analysis exists and custom query text is added, CTA changes to `Continue Analysis`; after clearing the query, CTA returns to the appropriate report/run state.
- [ ] Workspace B2B mode project selector shows only B2B projects.
- [ ] Workspace B2C mode project selector shows only B2C projects.
- [ ] Switching Workspace B2B/B2C aligns the active project to the selected segment and clears stale analysis/report state.
- [ ] Opening `/workspace` with a project URL parameter aligns the audience to that project segment.
- [ ] Source lineage, validation governance, evidence review, Data Room and pilot workflow appendices render.
- [ ] Caveats remain visible: `screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.`

## Repository Modes v2.0.2

- [ ] Public `/api/db/health` returns `status: "diagnostics_withheld"`, `repositoryMode: "browser_local"`, nullable reachability/schema fields, `canonicalReplayCertified: false` and `canRead/canWrite: false`.
- [ ] Public `/api/storage/health` returns `diagnosticsWithheld: true`, no bucket names and `protectedStorageAvailableToPublic: false`.
- [ ] Public diagnostics use `Cache-Control: private, no-store, max-age=0`; operator scripts, not anonymous endpoints, inspect the configured target.
- [ ] Project-scoped fallback APIs include `storageCaveat` where practical; Vercel never writes shared local fallback.
- [ ] UI labels show `Local/API fallback`, `Browser-local demo`, `Demo seed`, `Supabase/PostGIS`, or `Not configured`.
- [ ] UI does not show raw legacy mode strings such as `local-fallback`, `local_only`, `local_demo`, or `local-only`.
- [ ] The caveat remains visible where relevant: `Local/API fallback is not durable production storage.`
- [ ] The caveat remains documented where relevant: `Supabase/PostGIS durable persistence is active only when configured and schema readiness checks pass.`
- [ ] The caveat remains documented where relevant: `RLS policies require configured Supabase Auth, project memberships and deployment governance.`

## Supabase/PostGIS Durable Persistence v2.3

- [x] The first ten canonical files match `supabase/migration-ledger-baseline.json` by version, byte count and MD5; the pre-ledger healthcheck reconciliation and legacy quarantine are present.
- [ ] All six current candidate migrations pass target-derived development upgrade/drift replay plus real Auth/RLS/source personas before development apply. **Clean replay and 183/183 hosted SQL personas are already evidenced on isolated rehearsal only.**
- [x] `npm run test:source-custody-migration` statically verifies custody contracts; exact-head Quality Gate run `29500488408` passes. **No live apply/persona claim.**
- [x] `npm run supabase:migrate:check` enumerates seven pending migrations and requires canonical-chain, security-surface, identity/authorization, SOURCE-01 custody, Auth/Admin activation, FK-index, lifecycle-remediation, no-MFA verified-identity compatibility and Data API operator static checks. **It deliberately reports development/live apply readiness false. The first six candidates are rehearsal-only; the seventh is unapplied everywhere.**
- [x] Historical migrations plus the first six candidate migrations were replayed only on the isolated Free rehearsal. Hosted SQL personas pass 183/183; API-only PostgREST is proven by an allowlisted health RPC and negative `public`/base-table probes. Two independent backend sessions also pass rollback-only table-level invitation create→accept/revoke lock-order checks. **The seventh migration still requires separate exact-target approval and new personas. This is not authenticated RPC/HTTP concurrency, development drift certification, real email/phone/Storage E2E or Production authorization.**
- [ ] Migration includes organizations, profiles, memberships, projects, AOIs, analysis runs, reports, comparisons, Data Room, Pilot Workflow, source snapshot, AI score and audit event tables.
- [ ] AOI table uses PostGIS polygon and centroid columns.
- [ ] RLS is enabled for core tables.
- [ ] No broad anonymous write policy exists.
- [ ] The development Data API is disabled or exposes only an intentionally minimal `api` schema; minimum grants and RLS are both verified. **Rehearsal passes this boundary; development is unchanged.** See the [containment runbook](SUPABASE_DATA_API_CONTAINMENT_RUNBOOK_2026_07_16.md).
- [x] On rehearsal, direct `public` access returns `PGRST106`, base-table lookup in `api` returns `PGRST205`, and anonymous `api.healthcheck()` returns HTTP 200. **Development remains unchanged.**
- [ ] `profiles.auth_user_id` is unique and references `auth.users(id)`; AOI authenticated `FOR ALL` policy checks an allowed role for every write path.
- [ ] Audit event helper is non-blocking and does not claim certified audit/compliance logging.
- [ ] Supabase migration has been applied only in an intended Supabase environment, not against production without review.

## Map Loading

- [ ] `/workspace` opens without runtime errors.
- [ ] Mapbox basemap loads when token is configured.
- [ ] Safe fallback appears if Mapbox token is missing or invalid.
- [ ] Map remains centered on Dubai on initial load.
- [ ] Map does not jump after point selection.
- [ ] Map does not reinitialize on every click.

## Spatial Layers

- [ ] Spatial layers control is collapsed by default.
- [ ] Active layer count is visible.
- [ ] User can expand layers.
- [ ] User can toggle each layer on and off.
- [ ] `Show all` works.
- [ ] `Hide all` works.
- [ ] Legend is visible when layers are expanded.
- [ ] Layer styles are readable and not overly saturated.

## Point Selection

- [ ] Clicking empty map area selects a point.
- [ ] Marker appears at selected point.
- [ ] Coordinates update in the right command panel.
- [ ] `Run Express Analysis` becomes enabled.
- [ ] Map zoom and center are preserved.

## Mobile Workspace Map Access and Segment Data v1

- [ ] `/workspace` at iPhone 15 Pro width opens a full-screen map picker from the Selected Point / AOI / Object card `Open map` action.
- [ ] `/workspace` at iPhone 15/16/17 Pro Max width opens the full-screen map picker and keeps touch map selection usable.
- [ ] `/workspace` at iPad 11 portrait and landscape opens the full-screen map picker and keeps touch map selection usable.
- [ ] `/workspace` at iPad 13 portrait and landscape opens the full-screen map picker and keeps touch map selection usable.
- [ ] A valid mobile picker selection enables `Run Express Analysis` inside the picker.
- [ ] Direct run from the full-screen map picker shows analysis progress and automatically opens the dashboard/result state.
- [ ] `Back to workflow` closes the full-screen map picker without losing the selected point/object/AOI.
- [ ] The result dashboard exposes evidence/source sections, project actions and report preview / print path on mobile.
- [ ] B2B map-first flow completes end-to-end: select target, run analysis, open dashboard, open evidence/source sections, open project, open report preview / print path.
- [ ] B2C map-first flow completes end-to-end: select target, run analysis, open dashboard, open evidence/source sections, open project, open report preview / print path.
- [ ] Criteria-first flow completes where available without replacing the mobile map picker behavior.
- [ ] Compare flow completes on mobile.
- [ ] Restore/open existing analysis restores the correct segment-specific state.
- [ ] `/projects?segment=b2b` shows B2B demo projects, analyses, reports and comparison summaries.
- [ ] `/projects?segment=b2c` shows B2C demo projects, analyses, reports and comparison summaries.
- [ ] Switching between B2B and B2C changes content and does not leak seeded reports or analyses across the active segment.
- [ ] B2C seeded report print routes open without `Report not found`.
- [ ] Required caveat remains visible where relevant: screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.
- [ ] No UI or docs copy claims live official integration, official parcel/zoning/cadastral/ownership validation, certified valuation, production-ready status or pilot-ready status.

## Object Selection

- [ ] Clicking a demo polygon selects the object.
- [ ] Clicking a demo point selects the object.
- [ ] Clicking a demo line/corridor selects the object.
- [ ] Selected object is highlighted.
- [ ] Right panel shows object name, type, layer, and coordinates.
- [ ] User can run Express Analysis for selected object.

## Polygon AOI Drawing v1.7

- [ ] Compact map `Add polygon` control is visible on the right side of the map.
- [ ] Compact map `Add polygon` control starts explicit drawing mode.
- [ ] Drawing mode shows compact Undo / Cancel controls without a large map plaque.
- [ ] Clicking vertices draws a boundary line.
- [ ] Moving the cursor shows a live preview segment.
- [ ] Clicking near the first vertex closes the polygon.
- [ ] Vertex handles are visible only during drawing.
- [ ] `Undo vertex` removes the last vertex.
- [ ] `Cancel` and `Esc` exit drawing mode.
- [ ] Invalid/self-intersecting polygons are rejected with a clear message.
- [x] The 11-persona AOI contract accepts a representative Dubai polygon and rejects non-finite/out-of-WGS84/wrong-arity coordinates, unsupported antimeridian crossing, duplicate/self-intersecting and over-complex cases while recomputing measurements. **Authenticated server-route and durable-write evidence remain pending.**
- [ ] Accepted AOI shows area, perimeter, vertices, source and validation status in the command panel.
- [ ] Express Analysis works for the user-drawn AOI.
- [ ] Report preview and print route include AOI measurements and validation caveat.
- [ ] Comparison supports adding a user-drawn AOI.
- [ ] Point and demo object selection still work after deleting the AOI.

## AOI Library + GeoJSON Import/Export v1.8

- [ ] Drawn AOI can be saved to the active project AOI Library.
- [ ] Saved AOI appears in the compact Workspace AOI Library block.
- [ ] Saved AOI appears in the Project Dashboard AOI Library summary.
- [ ] Saved AOI can be reopened from Workspace.
- [ ] Saved AOI can be reopened from `/projects` without leaking across projects.
- [ ] Saved AOI can be renamed.
- [ ] Saved AOI can be deleted.
- [ ] Saved AOI can be exported as GeoJSON.
- [ ] Current drawn AOI can be exported as GeoJSON.
- [ ] Valid GeoJSON Feature with Polygon geometry imports successfully.
- [ ] Valid GeoJSON FeatureCollection with one Polygon imports successfully.
- [ ] FeatureCollection with multiple Polygons imports the first Polygon and shows a warning.
- [ ] Point GeoJSON is rejected with a clear message.
- [ ] LineString GeoJSON is rejected with a clear message.
- [ ] MultiPolygon GeoJSON is rejected with `MultiPolygon support is planned.`
- [ ] Polygon holes are rejected with `Polygon holes are not supported yet.`
- [ ] Invalid coordinates are rejected with `Invalid coordinates. Expected [longitude, latitude].`
- [ ] Imported AOI is selected, measurable, and labeled as Uploaded GeoJSON.
- [ ] Imported AOI can be saved, reopened, analyzed, added to comparison, and exported.
- [ ] Exported GeoJSON includes caveat, source type, validation status, centroid and measurements.
- [ ] Exported GeoJSON can be re-imported.
- [ ] Required caveat remains visible: screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.
- [ ] No UI, report or docs copy describes uploaded AOIs as official parcel, zoning, cadastral, ownership, approval or valuation evidence.

## Client Data Room Foundation v1.9

- [ ] `GET /api/data-room?projectKey=dubai-investment-screening-demo` returns 200.
- [ ] `GET /api/data-room?projectKey=developer-land-pipeline-demo` returns 200.
- [ ] `GET /api/data-room?projectKey=bank-asset-review-demo` returns 200.
- [ ] `/projects` shows a compact Client Data Room section.
- [ ] Client Data Room counts are scoped to the active project.
- [ ] Latest assets show at most three records.
- [ ] Public-demo add/upload mutation returns 403 before accepting metadata or binary data; protected persistence remains blocked until AUTH-01/STORAGE-01.
- [ ] Validation checklist appears with compact status controls.
- [ ] Updating a checklist item returns 403 in public demo; after AUTH-01 it persists only through caller-scoped RLS-backed storage.
- [ ] The public Workspace does not claim that dormant Data Room/Pilot/Validation server controls are available; any rendered protected action is visibly disabled with a reason and sends no request.
- [ ] Scenario and Custom Query remain near the top of the command panel.
- [ ] Adding current AOI/analysis to the data room does not duplicate AOI Library bloat.
- [ ] Browser-local/read-only demo caveat remains visible; server persistence is not implied.
- [ ] Required official-validation caveat remains visible.
- [ ] No secure/enterprise/production data room claim appears.

## Pilot Workflow & Deliverables v2.0

- [ ] `GET /api/pilot-workflow?projectKey=dubai-investment-screening-demo` returns 200.
- [ ] `GET /api/pilot-workflow?projectKey=developer-land-pipeline-demo` returns 200.
- [ ] `GET /api/pilot-workflow?projectKey=bank-asset-review-demo` returns 200.
- [ ] Missing/unknown project returns a controlled non-500 error.
- [ ] `/projects` shows a compact Pilot Workflow section.
- [ ] Project switching updates workflow title, decision question, client inputs and deliverables.
- [ ] Workflow readiness score is labeled as workflow completeness only.
- [ ] Top blockers and next actions show at most three items by default.
- [ ] Client input checklist renders with compact status controls.
- [ ] Updating a client input status returns 403 in public demo; authenticated persistence is an AUTH-01 follow-on.
- [ ] Deliverables workflow renders with compact status controls.
- [ ] Updating a deliverable status returns 403 in public demo; authenticated persistence is an AUTH-01 follow-on.
- [ ] Report Package Status reflects existing reports/comparisons and remains caveated.
- [ ] Dormant Pilot/Validation blocks are not required to render in public Workspace; no unreachable legacy panel is used as QA evidence.
- [ ] Workspace Scenario and Custom Query remain near the top.
- [ ] Workspace Run Express Analysis remains in the pinned action footer.
- [ ] No project leakage occurs between the three demo projects.
- [ ] No UI copy describes readiness as investment, legal, planning, valuation or commercial pilot readiness.
- [ ] Browser-local/read-only demo caveat remains visible; server persistence is not implied.

## Scenario Analysis

- [ ] Scenario selector is visible.
- [ ] Each scenario can be selected.
- [ ] Scenario description updates.
- [ ] Custom Query requires a question before analysis.
- [ ] Express Analysis opens dashboard.
- [ ] Dashboard title and content change by scenario.
- [ ] Public Express Analysis and decision scoring execute deterministically in the browser and send no analysis payload to `/api/analyze` or `/api/ai/decision-score`.
- [ ] Both server generation POST routes return 403 before body validation until AUTH-01 supplies verified caller identity; `OPENAI_API_KEY` alone changes nothing.
- [ ] No OpenAI key is exposed to the browser.

## Dashboard

- [ ] Dashboard renders immediately without a large blank area.
- [ ] User does not need to scroll to force layout correction.
- [ ] Score cards are visible.
- [ ] Map card is bounded and does not reserve full viewport height.
- [ ] Back to map works.
- [ ] Export report opens report preview.

## Comparison

- [ ] User can add a selected point to comparison.
- [ ] User can add a selected object to comparison.
- [ ] Duplicate selections are prevented.
- [ ] Comparison set is limited to 3 items.
- [ ] Compare button is disabled until at least 2 items exist.
- [ ] Comparison dashboard opens.
- [ ] Winner recommendation is visible.
- [ ] Score table and cards render correctly.
- [ ] Remove item works.
- [ ] Back to map works.

## Report Preview

- [ ] Express Analysis report preview opens.
- [ ] Comparison report preview opens.
- [ ] Report preview includes GeoAI branding.
- [ ] Report preview includes map window.
- [ ] Report preview includes demo/mock evidence notes.
- [ ] Back to dashboard works.
- [ ] Print / Save as PDF opens browser print dialog.
- [ ] Print layout hides navigation and command panel.

## Vercel Deployment

- [ ] Repository is connected to Vercel.
- [ ] Build succeeds on Vercel.
- [ ] Environment variables are configured in Vercel.
- [ ] `/` renders.
- [ ] `/workspace` renders.
- [ ] Map loads in deployed environment.
- [ ] Demo layers and analysis flows work after deployment.

## Auth & Project Access Foundation v2.2

- [ ] `/` loads without login when `NEXT_PUBLIC_AUTH_MODE` is unset.
- [ ] `/workspace` loads without login when `NEXT_PUBLIC_AUTH_MODE` is unset.
- [ ] `/projects` loads without login when `NEXT_PUBLIC_AUTH_MODE` is unset.
- [ ] `/login` shows current auth mode and access caveat.
- [ ] `/api/auth/session` returns safe JSON without secrets.
- [x] Candidate static check: the current wrapper fails closed for missing hard-mode Auth/demo-bypass evidence and blocks public server mutations even when `supabase_auth` is selected only by environment. **Request-scoped Supabase user/membership verification still remains AUTH-01; exact-head runtime evidence is pending.**
- [x] `npm run test:request-scoped-project-read` proves exact-key cookie-only prerequisites, five independent readiness denials, caller/profile/project/status invariants, shared role outcomes and strict source-release DTO mapping. **The implementation is intentionally disconnected while readiness remains false.**
- [ ] Project/workspace access badges remain compact and do not push primary actions below the first viewport.

## Pilot Infrastructure Activation v2.4

- [ ] `GET /api/platform/activation-status` returns the static `public_demo_only` boundary with diagnostics withheld.
- [ ] `GET /api/db/health` returns public `diagnostics_withheld`; it does not expose migration/seed/table state.
- [ ] `GET /api/storage/health` returns public `diagnostics_withheld`; it does not expose required/missing bucket names.
- [ ] `GET /api/known-limitations` returns the static reviewed candidate catalog, not live readiness.
- [ ] `npm run supabase:migrate:check` exits safely and reports migration blockers.
- [ ] `npm run supabase:verify:persistence` exits safely in local fallback when Supabase env is missing.
- [ ] `npm run supabase:seed:pilot-foundation` writes nothing and reports blockers when schema is unavailable.
- [ ] Public demo read/generate flows remain available; write/upload/review/validate/manage APIs return 403 until verified Auth/membership exists.
- [ ] Audit calls do not break AOI, report, analysis, comparison, data room or pilot workflow operations.
- [ ] `/projects` Platform Readiness panel is visible, compact and honest.

## Validation Governance & Official Connector Readiness v2.5

- [ ] `GET /api/validation?projectKey=dubai-investment-screening-demo` returns evidence, summary, claim policy and connector readiness.
- [ ] `GET /api/validation/connectors` returns DLD, Dubai Pulse, GeoDubai, client document and licensed valuation readiness records.
- [ ] `POST /api/validation/evidence` returns 403 in public demo; after AUTH-01 it creates only caller-scoped, RLS-backed evidence.
- [ ] `PATCH /api/validation/evidence/[id]` returns 403 in public demo and rejects wrong-project/wrong-role personas after AUTH-01.
- [ ] `DELETE /api/validation/evidence/[id]` returns 403 in public demo and deletes only authorized durable evidence after AUTH-01.
- [ ] `/projects` shows Validation Governance compactly and keeps Data Room / Project Activity usable.
- [ ] If Validation Evidence is rendered, it stays secondary and its protected controls are disabled with a reason; absence of the dormant legacy block is acceptable in public mode.
- [ ] Express Analysis AI Decision Memo remains caveated when validation evidence is screening-only.
- [ ] Analysis report preview and printable report include a Validation Governance Appendix.
- [ ] Comparison report preview and printable report include a Validation Governance Appendix.
- [ ] `/api/known-limitations` includes validation connector, DLD, GeoDubai, cadastral/zoning/ownership and valuation limitations.
- [ ] No UI or docs claim live official integration, certified valuation, legal conclusion, cadastral validation, ownership verification or zoning approval.

## Secure File Storage & Evidence Uploads v2.6

- [ ] `npm run storage:check` reports provider mode, buckets, 5 MB limit and storage caveat without secrets.
- [ ] `GET /api/storage/health` returns only the sanitized public contract; bucket/configuration/signed-URL diagnostics remain operator-only.
- [ ] `GET /api/storage/evidence-files?projectKey=dubai-investment-screening-demo` returns metadata list safely.
- [ ] `POST /api/storage/evidence-files` returns 403 before multipart body parsing while AUTH-01/STORAGE-01 are incomplete; no metadata-only server fallback is created.
- [ ] After AUTH-01/STORAGE-01, an unsupported file type returns 400 without storage side effects.
- [ ] After AUTH-01/STORAGE-01, an oversized request is rejected before full multipart materialization.
- [ ] Before AUTH-01/STORAGE-01, `GET /api/storage/evidence-files/[id]/download` returns 403. Afterwards, a caller-JWT/RLS test proves only an authorized user can receive a short-lived signed URL.
- [ ] `DELETE /api/storage/evidence-files/[id]` returns 403 in public demo; after AUTH-01 it deletes only caller-authorized metadata/object state.
- [ ] If `/projects` renders Evidence Files / Storage, it shows the sanitized public unavailability/caveat rather than bucket inventory or readiness attestation.
- [ ] If Workspace renders Attach evidence, it is secondary, disabled before fetch and explains AUTH-01/STORAGE-01; the dormant legacy block need not render.
- [ ] Data Room latest assets include evidence file metadata.
- [ ] Report Validation Appendix lists linked evidence file metadata and download availability.
- [ ] Uploading evidence never changes validation status to official validated automatically.
- [ ] No UI claims secure enterprise storage while storage is unconfigured or unverified.

## External Data public contract

- [ ] `GET /api/external-data/manifest`, `/sources` and `/status` return `contractVersion: "1.3"` and `manifestVersion`/`version: "1.6"`.
- [ ] All three public routes use `compact_public_v1`, `mode: "bundled_public_manifest"`, bounded public caching, `liveRegistryIncluded: false`, zero live counts and no Supabase registry query; `/sources` stays within 48 KB.
- [x] Exact-SHA Preview confirms `compact_public_v1` without repeated quality/file details: data-sources 5,164 B; readiness 4,411 B; manifest 18,284 B; sources 5,164 B; status 8,221 B; source-lineage 4,292 B, within 48/64 KB caps. Contract is `1.3`, manifest is `1.6`, `liveRegistryIncluded:false`; old 133–158 KB Preview evidence is superseded.
- [ ] `POST /api/context/market` returns seed-only context for built-in/demo targets. User-uploaded/user-drawn targets send neither raw input, geometry nor derived coordinates to market/climate endpoints.
- [ ] Manifest entries preserve per-source truth: DLD valuations/brokers/developers and OSM buildings remain zero-record/not-used; Overture buildings/places/transportation remain 2/2/1 rather than inheriting group totals.
- [ ] `GET /api/context/climate?lat=25.08&lng=55.14` returns `permission_required` with null metrics and makes no Open-Meteo upstream request.
- [ ] UI says snapshot/sample fallback, not live official integration.
- [ ] Evidence and reports retain official-validation-required caveats.

## Evidence Review Workflow & Signed URL Verification v2.7

- [ ] `/projects` shows compact evidence review counts and review actions.
- [ ] If a Validation Evidence block is rendered, review actions remain disabled with a reason in public mode; the dormant legacy block is not treated as a required surface.
- [ ] `POST /api/validation/evidence/[id]/reviews` returns 403 in public demo; after AUTH-01 it records only authorized review decisions.
- [ ] After AUTH-01, invalid review transitions return controlled errors, not 500s.
- [ ] After AUTH-01/STORAGE-01, uploading a file sets validation evidence to uploaded/unreviewed and does not improve claim posture.
- [ ] `POST /api/storage/evidence-files/upload-intent` returns 403 in public demo and never creates metadata-only server state.
- [ ] `POST /api/storage/evidence-files/[id]/signed-url-test` returns controlled 409 for metadata-only files.
- [ ] Report appendix shows review status, linked files and metadata-only download posture.
- [ ] AI decision scoring treats unreviewed/rejected/expired evidence as unsupported.
- [ ] Required caveats remain visible: uploaded evidence requires review; public-demo state is browser-local/read-only and protected persistence is unavailable.

## Public Data Connectors v1.6

- [ ] `npm run ingest:dld:public` exits successfully.
- [ ] `npm run ingest:dld:snapshot` exits successfully.
- [ ] `npm run ingest:osm:public` exits successfully.
- [ ] `npm run ingest:overture:public` exits successfully.
- [ ] `npm run ingest:worldpop:public` exits successfully.
- [ ] `npm run ingest:admin-boundaries:public` exits successfully.
- [ ] `npm run ingest:public-data:all` exits successfully.
- [ ] `GET /api/context/spatial?lat=25.0822&lng=55.1431` returns source lineage and caveat.
- [ ] `GET /api/context/accessibility?lat=25.0822&lng=55.1431` returns accessibility proxy.
- [ ] `GET /api/context/demographics?lat=25.0822&lng=55.1431` returns WorldPop fallback/context.
- [ ] `GET /api/context/air-quality?lat=25.0822&lng=55.1431` returns connected or sample fallback state.
- [ ] `GET /api/context/solar-energy?lat=25.0822&lng=55.1431` returns connected or sample fallback state.
- [ ] `GET /api/context/satellite-availability?bbox=55.10,25.05,55.20,25.12&from=2026-01-01&to=2026-06-01` returns metadata sample/planned state.
- [ ] External Data Status remains compact in the workspace command panel.
- [ ] Project Dashboard Data Readiness groups DLD/Dubai Pulse, open spatial, climate/energy, environment, demographics, satellite and official validation without overflow.
- [ ] No live official DLD, Dubai Pulse, GeoDubai, parcel, zoning, cadastral, ownership or valuation claims appear.

## Real Data + OpenAI Decision Scoring v2.1

- [ ] `npm run data:status` prints source mode, count, last updated, warnings and caveat.
- [ ] `npm run validate:external-data` exits successfully.
- [ ] `/projects` market-area count agrees with `/api/market-metrics`.
- [ ] `/api/ai/decision-score` returns route status with no API key exposed.
- [ ] Decision score POST returns 403 before parsing in the pre-Auth public demo, with or without `OPENAI_API_KEY`.
- [ ] Browser-local deterministic scoring remains available without `OPENAI_API_KEY`; future upstream use requires AUTH-01, explicit upstream gate, project authorization, privacy and quotas.
- [ ] Express Analysis dashboard shows AI Decision Memo without replacing deterministic score cards.
- [ ] Report preview and printable report include AI Decision Memo when present.
- [ ] Russian query `что лучше построить на этой территории?` stays caveated and scenario-specific.
- [ ] Forbidden claims appear only in caveats/guardrail lists, not as positive product claims.

## Investor Demo Narrative v1.5

- [ ] `GET /demo` returns HTTP 307 with `Location: /workspace`; no narrative-card launcher is claimed.
- [ ] Prepared fund, developer and bank narrative links open the correct Workspace/project context directly.
- [ ] `/workspace?demoNarrativeId=fund-investment-screening&projectId=dubai-investment-screening-demo` loads the Dubai investment screening context.
- [ ] `/workspace?demoNarrativeId=developer-land-pipeline&projectId=developer-land-pipeline-demo` loads the developer land pipeline context.
- [ ] `/workspace?demoNarrativeId=bank-asset-review&projectId=bank-asset-review-demo` loads the bank asset review context.
- [ ] Workspace command panel shows a compact Demo Script block when a narrative is active.
- [ ] Scenario selector and custom query remain near the top of the command panel.
- [ ] Primary CTA footer remains visible.
- [ ] `/projects?projectKey=dubai-investment-screening-demo` shows the fund pilot package.
- [ ] `/projects?projectKey=developer-land-pipeline-demo` shows the developer pilot package.
- [ ] `/projects?projectKey=bank-asset-review-demo` shows the bank pilot package.
- [ ] Report preview and printable report show decision question and pilot next action when project context exists.
- [ ] Required caveat remains visible: screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.

## Audit-candidate state, performance and UX acceptance

- [ ] Uploads, comparison sets and report summaries use project-scoped records with an explicit `projectKey` inside the shared versioned demo namespace; switching between two projects and reloading never leaks one project's artifacts into the other.
- [ ] Upload UI warns not to submit confidential, personal or regulated data and explains unencrypted origin-local persistence/removal.
- [ ] Candidate structural limits reject files above 5 MB; more than 24 uploads/project; CSV without a data row, with unbalanced quotes, empty/duplicate headers, over 10,000 data rows/128 columns/16,384 characters per cell, or unpaired/non-finite/out-of-WGS84 lat/lon; GeoJSON above 2,500 features/100,000 coordinate pairs, invalid tuple/cardinality/unclosed rings, or oversized/deep properties. AOI import rejects above 5 MB/1,000 vertices and retains at most 40/project before O(n²) topology checks. No failure partially persists.
- [ ] Browser upload/AOI records are revalidated on read, use compound project+ID mutations, and a localStorage quota/security exception fails visibly without a false saved state.
- [ ] Uploaded content is never injected/executed as markup/script; Production security-header/CSP checks pass and browser state can be explicitly purged.
- [ ] Unknown explicit Data Room/report/API/local lookups return controlled empty/not-found and never silently resolve to `demoProjects[0]`; an invalid Workspace URL key is cleared and may reset to the default only with an explicit user-visible message. Legacy uploads without `projectKey` are not assigned to the active project.
- [ ] Project Hub reflects browser-local analyses, reports and comparisons after reload, and no “saved” success toast is shown unless the candidate state actually persists.
- [ ] Every protected write/upload/review/validate/manage control is disabled before `fetch`, explains the missing capability and produces zero guaranteed-403 network requests. Browser-safe AOI/upload/analysis/report/comparison actions remain usable.
- [ ] Network capture confirms the disabled legacy `AnalysisPanel` server fanout sends zero requests. Unreachable state/effects/handlers are tracked for removal rather than treated as active functionality.
- [ ] Project Hub records its exact initial request count and response bytes on the same exact-SHA build; the current six-request public baseline (projects, DB status, market metrics, external-data status, platform status and pilot status) must not regress, candidate compact source budgets pass, and aggregation/snapshot options are measured before a performance claim.
- [x] Workspace result-only comparison/dashboard/report surfaces are lazy and the same local production-build comparison records First Load JS 252 kB → 218 kB (34 kB, approximately 13.5% gzip). **Exact-SHA Preview response-size/HTTP evidence passes; route bundle, browser-flow and Core Web Vitals evidence remain pending.**
- [ ] `preserveDrawingBuffer` is enabled only for an explicit capture path; route JS, build, API latency and Core Web Vitals budgets pass on the declared desktop/mobile profiles.
- [ ] Mobile navigation exposes Workspace and Projects; each critical route has one meaningful `h1`, labelled project/candidate/audience controls, correct pressed/expanded/disabled states, useful live regions and WCAG 2.2-sized interactive targets.
- [ ] Axe/Lighthouse and keyboard-only journeys cover Home → Workspace → analysis/report, criteria-first comparison, project switching and print; no active control targets a guaranteed 403.

## Responsive Checks

- [ ] Homepage renders on desktop.
- [ ] Workspace renders on desktop.
- [ ] Workspace remains usable on tablet width.
- [ ] Right command panel remains readable.
- [ ] Buttons do not overflow their containers.
- [ ] Report preview remains printable.
