# GeoAI Codex Backlog — 2026-07-16

Status: Active, implementation-ready
Last verified: 2026-07-16
Priority rule: complete P0 in dependency order before real sources, Auth/RBAC/Admin activation or client files
Navigation: [Documentation Index](DOCUMENTATION_INDEX.md) · [Full System Audit](FULL_SYSTEM_AUDIT_2026_07_16.md) · [Roadmap](roadmap.md)
GitHub execution program: [#96](https://github.com/mmgolikov/geoai-mvp/issues/96)

Independent reviewer approval is not an acceptance criterion in this phase. Each task closes on reproducible technical evidence and explicit owner-controlled external actions where applicable.

## AUTH-01 — Request-scoped Auth and RBAC kernel

Priority: P0 / S0
Tracks: GitHub [#88](https://github.com/mmgolikov/geoai-mvp/issues/88)
Depends on: DB-01 schema decision; may be developed against an ephemeral project in parallel
Blocks: Admin, protected reports, user files, durable project writes, pilot mode

Implement one server authorization kernel that receives the actual request/cookie context, creates a caller-scoped Supabase client, verifies `auth.getUser()`, resolves one profile, organization and project membership, and enforces role/action rules. Protected modes fail closed; public demo is an explicit allowlisted namespace and projection, never a fallback after an Auth error.

Acceptance:

- valid member personas pass only their organization/project and allowed actions;
- no session, invalid/expired token, missing profile, no membership, wrong organization/project and insufficient role return deterministic 401/403 before any read/write;
- no placeholder org/profile/membership is created or returned in protected mode;
- every protected API and report/print route uses the kernel; object IDs derive their project scope from storage, not caller input;
- request repositories carry the caller session and never import the service-role key;
- automated negative IDOR matrix runs in CI and writes exact-SHA evidence.

## DB-01 — Canonical migration replay and RLS evidence

Priority: P0 / S0
Tracks: GitHub [#85](https://github.com/mmgolikov/geoai-mvp/issues/85)
Blocks: AUTH-01 final integration, Storage, durable writes, real snapshots

Reconcile legacy and current table definitions into an upgrade-safe canonical chain. Treat `20260716000000_geoai_pre_auth_security_containment_v1.sql` as a review draft until shadow replay proves it safe.

Acceptance:

- clean replay succeeds on an ephemeral Supabase/Postgres/PostGIS environment from migration 1 to head;
- every migration has a unique CLI version; the five `20260618_*` and two `20260624_*` files are replaced or reconciled through an upgrade-safe, recorded history repair rather than silently renamed after apply;
- upgrade replay succeeds from the current development schema; drift is zero or explicitly dispositioned;
- every GeoAI public table has an intentional RLS/privilege decision; private tables are not reachable by `anon`;
- profile linkage to `auth.users`, membership uniqueness and org/project consistency are constrained;
- SECURITY DEFINER helpers set a safe search path and have least-privilege EXECUTE grants;
- pgTAP or equivalent tests prove positive and negative no-session/no-membership/wrong-org/wrong-project/role personas;
- apply and rollback plan identifies project ref, exact commit, owner action and evidence artifact. No live apply is implicit.

## STORAGE-01 — Protected evidence pipeline

Priority: P0 / S0
Tracks: GitHub [#90](https://github.com/mmgolikov/geoai-mvp/issues/90)
Depends on: AUTH-01, DB-01
Blocks: any client binary or confidential evidence

Acceptance:

- organization, project, evidence ID, uploader and object path derive from authorized server state;
- streaming/edge body limit applies before full multipart materialization;
- extension, declared MIME and magic-byte detection agree against an allowlist;
- checksum, size, detected type, quarantine/scan state, uploader and retention metadata are durable;
- unsafe, unscanned or mismatched files cannot be downloaded or used by AI/reports;
- upload/list/signed-read/delete tests run as real user personas through RLS/Storage policies;
- signed URL TTL, revocation, wrong-tenant denial and audit trail are evidenced;
- malware scanning outage fails closed and has an operator runbook.

## SOURCE-01 — Real-source custody and visibility

Priority: P0 / S0
Tracks: GitHub [#89](https://github.com/mmgolikov/geoai-mvp/issues/89); [#80](https://github.com/mmgolikov/geoai-mvp/issues/80) for geometry-bearing scope
Depends on: DB-01; AUTH-01 for private sources

Acceptance:

- source/snapshot records use explicit `public_demo`, `project_private` or `operator_private` visibility; nullable tenant/project never means public;
- public APIs return only the audited projection and never raw/normalized paths, bucket keys, local filenames, provider asset URLs or secrets;
- importer requires source URL, provider, rights/licence/attribution, access/retrieval time, checksum, schema version, row/feature count, coverage, owner and quarantine/quality state;
- duplicate, stale, malformed, rights-unknown and out-of-coverage inputs fail closed;
- the current Preview source pack remains non-persistent, fixed-geography, `scoreImpact:none`; Production remains disabled;
- geometry, imagery, wider distribution and score impact each require their own validation and owner activation evidence.

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
- deterministic fallback remains available and upstream failure cannot silently change decision semantics.

## GEO-01 — Server-side AOI integrity

Priority: P1 / S1
Tracks: GitHub [#93](https://github.com/mmgolikov/geoai-mvp/issues/93); [#80](https://github.com/mmgolikov/geoai-mvp/issues/80) where real geometry is involved

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
- protected-mode local fallback is impossible and Production dependency failure is fail-closed;
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

## PERF-01 — UI decomposition and performance budgets

Priority: P1 / S1
Tracks: GitHub [#95](https://github.com/mmgolikov/geoai-mvp/issues/95)

Acceptance:

- split Workspace, Project Dashboard, Map Workspace and Analysis panel into bounded modules with explicit state contracts;
- lazy-load map/heavy analysis/report-only code outside initial routes;
- set and enforce route JS, build-time, API latency and Core Web Vitals budgets on representative mobile/desktop profiles;
- avoid duplicate fetching/render loops and prove no functionality regression with component/browser tests;
- record before/after measurements on the same exact-SHA Preview.
- Home does not import/initialize Mapbox until WebGL support and visibility/use require it; expected no-WebGL fallback emits no application error.

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
- active pages carry owner/status/last-verified/successor links; versioned snapshots are explicitly historical;
- empty/stub and duplicate Confluence pages are consolidated or labelled; orphan depth and title collisions are reduced;
- release automation flags cross-document SHA/deployment/maturity contradictions and scheduled monthly semantic review has an owner.
