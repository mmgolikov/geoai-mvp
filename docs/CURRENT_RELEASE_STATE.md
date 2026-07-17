# GeoAI Current Release State

Status: Canonical repository release snapshot
Last verified: 2026-07-16
Owner: GeoAI Release Engineering
Authority: Exact released and candidate runtime evidence
Successor: None; any replacement must update `DOCUMENTATION_INDEX.md`
Operational dashboard: [Confluence Project Hub](https://geoaimvp.atlassian.net/wiki/spaces/PH/overview)
Navigation: [Documentation Index](DOCUMENTATION_INDEX.md) · [Full System Audit](FULL_SYSTEM_AUDIT_2026_07_16.md) · [Architecture](architecture.md) · [Data Strategy](data-strategy.md) · [QA Checklist](qa-checklist.md) · [Codex Backlog](CODEX_BACKLOG_2026_07_16.md)

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

## Isolated Free rehearsal — current candidate evidence

Supabase `geoai-auth-rehearsal` (`bkmfcjzalcvdsdvyxpgi`, Free `$0/month`, `eu-west-1`, PostgreSQL `17.6.1.147`) is `ACTIVE_HEALTHY` and separate from both development and Production. It carries `17` canonical schema migrations plus one environment operator ledger entry. The rebuilt Auth/Admin/client/project migration is a new implementation, not a byte-for-byte recovery of lost unpublished local work; forward migration `20260716175210` remediates lifecycle defects without rewriting that applied history.

Final hosted evidence is `71/71 + 73/73 + 39/39 = 183/183` pgTAP personas. The final 39 prove invitation expiry persistence/replay denial, structural organization→project→invitation lock order, bootstrap-v2 provenance, temporary-ban/profile behavior and fail-closed initial-only Admin snapshot pagination. Test transactions leave `auth.users=0`; all `29` GeoAI domain tables excluding managed `spatial_ref_sys` have RLS; uncovered domain foreign keys are `0`. PostgREST is still pinned to `pgrst.db_schemas=api`, with `14` allowlisted functions and no API relations. Existing HTTP evidence proves `api.healthcheck()` 200/healthy, `public` 406/`PGRST106`, and an API base-table probe 404/`PGRST205`; remediation did not change API signatures or schema exposure.

Two independent hosted PostgreSQL sessions also completed canonical organization→project→invitation transitions for concurrent `create→accept` and `create→revoke` paths with a five-second lock timeout, no deadlock and zero fixture rows after rollback. This closes the table-level lock-order runtime regression only. It does not prove the authenticated `api.create_invitation()`, `api.accept_invitation()` and `api.revoke_invitation()` HTTP paths because the rehearsal still has zero confirmed Auth users and zero Auth-linked profiles.

Supabase advisors still report managed PostGIS/public-schema findings and intentional RLS-with-no-policy deny-all tables; they are recorded rather than mislabeled as removed. The HTTP schema boundary isolates managed `public` without changing PostGIS ACL or enabling RLS on `spatial_ref_sys`. Performance has zero unindexed-FK findings; remaining findings are unused-index INFO on a near-empty rehearsal. Storage remains four buckets with zero object policies. The authoritative receipt is [SUPABASE_AUTH_REHEARSAL_RECEIPT_2026_07_16.json](SUPABASE_AUTH_REHEARSAL_RECEIPT_2026_07_16.json).

The current working tree supersedes the earlier MFA-heavy candidate with one simple login surface and a personal account at `/profile`. The landing header and hero expose `View demo` and `Leave a request`; both enter `/login` with a bounded `/workspace` return instead of linking directly into the product. Once a browser session is saved, the login screen immediately continues to Workspace. Shared product navigation renders a circular profile icon that is highlighted when authenticated and opens `/profile`; otherwise it opens `/login`. Email sends a PKCE sign-in link and creates the user when needed, or accepts an existing password; phone sends/verifies an SMS code once an external SMS provider is configured; `demo@geoai.space` / `111111` creates browser-only sample state that never authorizes protected APIs or Admin. The profile supports full name, region, editable contact phone, browser-local photo, registered-email confirmation, password change and default B2B/B2C role propagation into Workspace and Projects. User-editable preferences are presentation-only and never authorize server access. The oversized demo caveat is removed from the top of the profile, while the compact demo and browser-local storage limitations remain lower on the page. Verified sign-in phone change remains disabled pending a safe flow, and avatar Storage remains blocked. `/register` and `/mfa` redirect to `/login`, the callback defaults to `/workspace`, and onboarding hides the invitation token while retaining fragment-to-HttpOnly-cookie staging and SHA-256-only database handoff. Application Admin requests require a verified permanent identity without MFA. Migration `20260716213214_simplify_auth_remove_mfa_requirement.sql` prepares the equivalent database override but has not been applied to rehearsal, development or Production. Exact landing/auth functional head `bdb7f0629c39838e2e3451925825699df7f84fc0` passed Quality Gate `29576709336`; exact Vercel Preview `dpl_HNLx2RCVTYKjnHvxhi8mEoHpLgfa` is READY and returned 200 for the landing, both login intents, `/profile`, `/workspace`, health and activation status. Hosted HTML contains both actions and their bounded Auth targets, and no exact-deployment build or error/fatal runtime log was found. This is implementation/static/hosted-HTTP evidence, not rendered-browser or real-user Auth activation: real profile/email/password/phone confirmation/session/logout, banned/deleted/unconfirmed/anonymous denial, rendered-browser Admin/Onboarding/Profile, authenticated RPC concurrency, resource-specific Admin pagination, first real owner, SMS delivery, protected Storage, development apply, real sources and Production remain open.

## Immediate Production operating restriction

The released PR #87 public demo does **not** isolate user-created server state. Until Draft PR #97 is merged and deployed, do not enter or upload any user, client, confidential or decision-sensitive AOI, CSV, GeoJSON, filename, evidence or report/package data in Production. Use only the built-in synthetic/demo fixtures. The released `/explore` route also has a known runtime-environment wiring defect: the source-pack API is fail-closed, but the UI can present Preview/open-context source semantics. Do not treat the released Production source UI boundary as fully verified.

## Released source scope

- Fixed, low-volume Preview context only: NASA POWER historical point context, Copernicus catalogue metadata without geometry/assets and OSM counts without features/geometry.
- Open-Meteo is permission-gated and excluded from evidence and AI payloads.
- DLD/Dubai Pulse live use remains blocked pending approved stable access/snapshot custody and reusable rights.
- Overture/OSM geometry, imagery, persistence and source-dependent scoring are not activated.

## Development Supabase evidence

Project `pphdqkurxneyagvnnjdt` is a development foundation, separate from Production. The 2026-07-16 11:31 UTC read-only snapshot found `ACTIVE_HEALTHY` on PostgreSQL `17.6.1.141`, 20 public tables with RLS on 19 (`spatial_ref_sys` is the exception), zero Auth users, four buckets and zero `storage.objects` policies. A later migration-ledger read-back still shows exactly ten historical entries and none of the seven current candidates. The first six candidates are rehearsal-proven; the seventh is the new unapplied MFA-removal override. The repository reconstructs the development ledger by version, bytes and MD5, quarantines non-ledger drafts and records the pre-ledger healthcheck reconciliation. Exact-snapshot ephemeral clean replay and the separate Free rehearsal pass, but development-derived upgrade/drift and the live boundary remain unverified, so DB-01 remains open.

The live development Data API remains uncontained. At the same 11:31 UTC snapshot, `anon` and `authenticated` each retained 22 public-table `TRUNCATE` grants; RLS does not control `TRUNCATE`. The four Storage buckets remain private with zero `storage.objects` policies, so Storage is unavailable rather than certified. Advisors returned 14 security findings (one ERROR, 13 WARN) and 71 performance findings (53 INFO, 18 WARN). No live write or configuration change was performed, and ephemeral replay must not be interpreted as live Data API, ACL, Storage or advisor remediation.

The pending development model chooses global Auth-backed profiles plus organization/project memberships, exact role/action policies, account-state denial and a minimal `api` RPC allowlist. Before any profile RPC, the permanent-user boundary requires UUID `claims.sub` exactly equal to canonical `auth.getUser().id`, plus explicit claims/user `is_anonymous === false`; subject mismatch is 401, anonymous identity 403 and ambiguity fails closed. Local session and Admin/Onboarding routes consume this request boundary without MFA. AUTH-01B separately requires an exact project key, resolves `api.current_project_access()` and permits only a bounded approved source-release DTO; Product repositories remain disabled and every runtime persona-readiness flag remains false. See the [Data API containment runbook](SUPABASE_DATA_API_CONTAINMENT_RUNBOOK_2026_07_16.md). The first six candidates are executed on rehearsal only; the seventh simplified-Auth migration is unapplied everywhere and remains not apply-ready for development.

SOURCE-01 adds five RLS-enabled, direct-grant-closed custody tables: source catalog, immutable releases, artifacts, status events and ingestion receipts. Composite tenant/release plus actor organization/project-membership FKs close cross-scope custody writes. Legacy registry backfill defaults to `restricted` and `registered_unverified`; bounded `api.current_source_releases()` exposes only an explicit `approved` metadata projection to the caller-scoped owner/admin/analyst/viewer context and omits arbitrary quality/lineage summary JSON, object paths, source URIs, secrets and `client_viewer`. It is applied/SQL-tested only on rehearsal and remains unapplied to development/Production; no provider is connected, no write API is opened and provider writes remain blocked.

SOURCE-02 is staged only as a pure `reserve_or_replay` claim v1. Execution/idempotency hashes bind exact environment, tenant, connector/provider/parser, rights, broker, endpoint/network/body and acquisition-window inputs; actor is omitted only from the shared acquisition key. The unsigned claim is correlation-only with authorization `none`; external registry/plan/hash revalidation, trusted execution and transactional SOURCE-01 writing remain mandatory. The registry is empty, Production is denied and there is no fetch/env/secrets/persistence or atomic pre-fetch reservation writer. The claim is not source activation, authorization or proof of reservation.

Repository replay infrastructure is evidenced on functional/evidence head `e999c5a07d3ced6c95f2eb44f6a5f03a9c17caea`, tree `73b7c198813d6aede795b8b186bd4d58e741b181`. GitHub Quality Gate run `29500488408` succeeded; app job `87627894974` passed. DB job `87627894968` completed clean 71/71, a synthetic local exact-ten-ledger-prefix/pre-ledger-repair/three-pending-migration/security-surface rehearsal and a second 71/71 pass. Quality artifact `8376235675` and database artifact `8376300064` preserve separate receipts. The rehearsal is not a current-development clone, live-derived upgrade replay, drift, live apply or DB-01 certification. Local Docker remains unavailable; Data API containment, live JWT/Storage/source personas, advisor parity and SOURCE-01 remain open.

The review-only Storage owner-path policy no longer evaluates direct caller joins against protected base/Auth tables. It delegates one exact organization/project/role decision to narrow `SECURITY DEFINER geoai_private.has_storage_project_role()`, keeps authenticated object fetch/signing operation-aware so bucket listing is denied, and excludes `client_viewer` from raw objects. It remains unapplied and is not Storage readiness evidence.

## Current profile increment evidence

| Candidate receipt | Verified value |
| --- | --- |
| Functional profile head | `232fb532db1e5bc1dcf134ca1d616e4506f682f0`, Draft PR #97; `main` unchanged |
| Git tree | `b934593da661ad8bc717fc535506206f1fbfd1cf` |
| GitHub Quality Gate | Run `29572587381`, success |
| Application job | `87859597854`, success |
| Supabase replay/rehearsal/pgTAP | Job `87859597862`, success; clean replay, synthetic ledger-prefix upgrade rehearsal and second pgTAP pass completed |
| Quality artifact | `8403707054`, `geoai-quality-evidence-29572587381`, digest `sha256:d68b3bb4f5f7b823216d64e9be00c4e4d7cb3bd8451e8eda3c3f75ce77772ed7` |
| Database artifact | `8403773713`, `geoai-database-evidence-29572587381`, digest `sha256:d696121a2b02447facae4ee81f6ebafdd91938452cd18a23b8407d6cbe3bebd3` |
| Exact Vercel Preview | `dpl_G5vcKVQCHypacP9foGpAJ4Egwu5k`, READY on exact functional head; [deployment](https://geoai-obetsesdv-geoaidev.vercel.app) |
| Hosted HTTP matrix | `/profile`, `/login`, `/workspace`, `/api/health` and `/api/platform/activation-status` returned 200; CSP, HSTS and `nosniff` are present; no exact-deployment error/fatal runtime logs were observed |
| Browser evidence | Rendered browser/mobile/keyboard/print and real email/phone/Admin/Profile personas remain unclaimed; HTTP responses are not browser-interaction evidence. |

The 2026-07-16 full-system audit is an unreleased [Draft PR #97](https://github.com/mmgolikov/geoai-mvp/pull/97) candidate. It adds project-scoped browser-only public-demo artifacts under a versioned demo-only namespace with Auth-transition cleanup; browser-local analysis/scoring; 403-before-body server generation/mutation containment; strict CSV/GeoJSON/AOI quotas and revalidation; fail-closed unknown-project/canonical report ID handling; summary-only public report-package collections; server-evidence-receipt and validation-attestation gates; a manifest-driven private/no-store boundary for all project/identity GET responses; `/explore` environment wiring; and regression controls. User-uploaded/user-drawn raw content, geometry and derived coordinates remain local. The canonical AOI validator rejects non-finite/out-of-WGS84 coordinates, wrong tuple arity and unsupported antimeridian crossings; its 11-persona adversarial contract covers one representative Dubai polygon and ten negative cases. Public diagnostics are static/sanitized and withhold infrastructure inventories. Anonymous source routes use bounded, explicit allowlisted `compact_public_v1` DTOs only (`contractVersion: 1.3`, manifest `1.6`, `liveRegistryIncluded:false`) and statically import the reviewed manifest plus compact quality totals rather than deep snapshots; per-source zero/count/use truth is contract-tested. Exact Preview UTF-8 sizes are data-sources 5,164 B, readiness 4,411 B, manifest 18,284 B, sources 5,164 B, status 8,221 B and source-lineage 4,292 B. Lazy-loading the Workspace comparison, express-result and report-preview surfaces reduced the local production-build First Load JS measure from 252 kB to 218 kB (approximately 13.5% gzip); browser flows and Core Web Vitals remain unverified. `/demo` is a 307 redirect to `/workspace`. None of this changes Production, applies Supabase migrations, changes external credentials or activates providers.

Candidate application code no longer imports or needs a service-role credential/direct database URL and disables public Supabase repositories before AUTH-01. It accepts only modern `sb_publishable_` keys, ignores `.env.operator`, statically scans tracked files for key/DB/private-key shapes and requires project/SHA/migration-tree-bound operator receipts. A privileged development Supabase credential was observed across historical public Preview deployments. On 2026-07-16 the owner confirmed removal of the Vercel `SUPABASE_SERVICE_ROLE_KEY` and legacy public anon variable, Shared-scope review, disablement of development legacy `anon`/`service_role` keys, and Preview-only rehearsal configuration using the exact rehearsal URL plus a modern publishable key, `supabase_auth`, hard enforcement and public-demo denial. No value was recorded. Deployment `dpl_G5vcKVQCHypacP9foGpAJ4Egwu5k` independently returns hard Supabase Auth mode with demo access denied and hosts the exact personal-profile functional head. This closes [ENV-01](CODEX_BACKLOG_2026_07_16.md#env-01--public-vercel-credential-evacuation-and-rotation) for non-Production Preview integration. Real email/phone/Admin/Profile browser personas remain AUTH-01 work.

All earlier profile-candidate receipts are superseded and must not be reused for this increment. The exact functional authority is the receipt table above. See the repository [Full System Audit](FULL_SYSTEM_AUDIT_2026_07_16.md), [Project Hub](https://geoaimvp.atlassian.net/wiki/spaces/PH/pages/98425) and GitHub [execution program #96](https://github.com/mmgolikov/geoai-mvp/issues/96).

## Design authority — read-only verification

[Figma file `TAzDqOvRCw1mQGMU3Y4S9H`](https://www.figma.com/design/TAzDqOvRCw1mQGMU3Y4S9H) has 61 pages. Node `169:2` remains `00 — CURRENT MASTER / START HERE`; `217:3` remains `00 — WIP MASTER / NOT CURRENT`, and child `217:19` still carries the stale `Current Production after PR #54` label. Identity `465:5` is named `IDENTITY-GATE-04 ... PASS · FOUNDER APPROVED`, but governance still blocks legal/public release; older `413:2` remains Founder Review. [FigJam `hjy7prEcRySkqPvJYWIwwX`](https://www.figma.com/board/hjy7prEcRySkqPvJYWIwwX) root `0:1` is empty. No Figma/FigJam mutation or Product/design promotion was performed, and design labels are not code-parity or release evidence.

## Technical gates before protected or real data

1. Execute and evidence the selected development Data API/identity boundary, upgrade replay, full-chain anonymous-grant retirement and live RLS persona evidence; the exact-head ephemeral clean-replay receipt is complete but does not satisfy these live gates.
2. Request-scoped Auth/RBAC, real email/phone/Admin personas and real membership enforcement on the exact rehearsal Preview; apply the MFA-removal migration only under a separate exact-target approval. ENV-01 is closed for this non-Production integration.
4. Protected Storage pipeline and user-context signed URL tests.
5. Execute and evidence the staged source-custody model, trusted worker write boundary, provider rights/receipts and public projection; schema presence alone does not activate providers.
6. Before protected/upstream AI use: AI quotas/privacy/rate limiting and observability. This is not an S0 blocker for deterministic public-demo fallback.
7. Owner decision for any Production or source activation.

Production URL: [geoai-mvp.vercel.app](https://geoai-mvp.vercel.app). Vercel project: [geoaidev/geoai-mvp](https://vercel.com/geoaidev/geoai-mvp).

Independent reviewer approvals are not required in the current phase. This does not waive the technical/evidence gates above.

Required caveat: **Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.**
