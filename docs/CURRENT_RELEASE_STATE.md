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

The local working tree now implements exact-target Supabase selection, effective-mode-gated PKCE registration/callback, session/logout, TOTP enroll/challenge/remove with immediate post-unenroll refresh, and AAL2-gated Admin/Onboarding routes over the 14-RPC allowlist. Auth-cookie mutations retain exact same-origin enforcement even outside active Auth mode. One-time invitation fragments are immediately staged into a short-lived HttpOnly same-site cookie for the email round trip, while only their SHA-256 hash reaches Postgres. TypeScript, production build, new Auth/Admin static contracts, the 88-handler access manifest and local demo-mode HTTP route smoke pass. The Supabase browser runtime is dynamically loaded only for Auth mode; current local `/workspace` and `/explore` First Load JS is 220 kB versus the 218 kB pre-Auth candidate baseline, rather than the 285 kB root-bundle regression caught during review. This is implementation/static evidence, not hosted Auth activation: real signup/email confirmation/refresh/logout, banned/deleted/unconfirmed/anonymous denial, MFA, rendered-browser Admin/Onboarding, authenticated RPC concurrency, resource-specific Admin pagination, first real owner, Storage, development apply, a fresh exact-head Preview, real sources and Production remain open.

## Immediate Production operating restriction

The released PR #87 public demo does **not** isolate user-created server state. Until Draft PR #97 is merged and deployed, do not enter or upload any user, client, confidential or decision-sensitive AOI, CSV, GeoJSON, filename, evidence or report/package data in Production. Use only the built-in synthetic/demo fixtures. The released `/explore` route also has a known runtime-environment wiring defect: the source-pack API is fail-closed, but the UI can present Preview/open-context source semantics. Do not treat the released Production source UI boundary as fully verified.

## Released source scope

- Fixed, low-volume Preview context only: NASA POWER historical point context, Copernicus catalogue metadata without geometry/assets and OSM counts without features/geometry.
- Open-Meteo is permission-gated and excluded from evidence and AI payloads.
- DLD/Dubai Pulse live use remains blocked pending approved stable access/snapshot custody and reusable rights.
- Overture/OSM geometry, imagery, persistence and source-dependent scoring are not activated.

## Development Supabase evidence

Project `pphdqkurxneyagvnnjdt` is a development foundation, separate from Production. The 2026-07-16 11:31 UTC read-only snapshot found `ACTIVE_HEALTHY` on PostgreSQL `17.6.1.141`, 20 public tables with RLS on 19 (`spatial_ref_sys` is the exception), zero Auth users, four buckets and zero `storage.objects` policies. A later migration-ledger read-back still shows exactly ten historical entries and none of the six current candidates. The repository reconstructs that ledger by version, bytes and MD5, quarantines non-ledger drafts and records the pre-ledger healthcheck reconciliation. Exact-snapshot ephemeral clean replay and the separate Free rehearsal pass, but development-derived upgrade/drift and the live boundary remain unverified, so DB-01 remains open.

The live development Data API remains uncontained. At the same 11:31 UTC snapshot, `anon` and `authenticated` each retained 22 public-table `TRUNCATE` grants; RLS does not control `TRUNCATE`. The four Storage buckets remain private with zero `storage.objects` policies, so Storage is unavailable rather than certified. Advisors returned 14 security findings (one ERROR, 13 WARN) and 71 performance findings (53 INFO, 18 WARN). No live write or configuration change was performed, and ephemeral replay must not be interpreted as live Data API, ACL, Storage or advisor remediation.

The pending development model chooses global Auth-backed profiles plus organization/project memberships, exact role/action policies, account-state denial and a minimal `api` RPC allowlist. Before any profile RPC, the permanent-user boundary requires UUID `claims.sub` exactly equal to canonical `auth.getUser().id`, plus explicit claims/user `is_anonymous === false`; subject mismatch is 401, anonymous identity 403 and ambiguity fails closed. Local session, MFA and Admin/Onboarding routes now consume this request boundary. AUTH-01B separately requires an exact project key, resolves `api.current_project_access()` and permits only a bounded approved source-release DTO; Product repositories remain disabled and every runtime persona-readiness flag remains false. See the [Data API containment runbook](SUPABASE_DATA_API_CONTAINMENT_RUNBOOK_2026_07_16.md). It is executed on rehearsal only and remains not apply-ready for development.

SOURCE-01 adds five RLS-enabled, direct-grant-closed custody tables: source catalog, immutable releases, artifacts, status events and ingestion receipts. Composite tenant/release plus actor organization/project-membership FKs close cross-scope custody writes. Legacy registry backfill defaults to `restricted` and `registered_unverified`; bounded `api.current_source_releases()` exposes only an explicit `approved` metadata projection to the caller-scoped owner/admin/analyst/viewer context and omits arbitrary quality/lineage summary JSON, object paths, source URIs, secrets and `client_viewer`. It is applied/SQL-tested only on rehearsal and remains unapplied to development/Production; no provider is connected, no write API is opened and provider writes remain blocked.

SOURCE-02 is staged only as a pure `reserve_or_replay` claim v1. Execution/idempotency hashes bind exact environment, tenant, connector/provider/parser, rights, broker, endpoint/network/body and acquisition-window inputs; actor is omitted only from the shared acquisition key. The unsigned claim is correlation-only with authorization `none`; external registry/plan/hash revalidation, trusted execution and transactional SOURCE-01 writing remain mandatory. The registry is empty, Production is denied and there is no fetch/env/secrets/persistence or atomic pre-fetch reservation writer. The claim is not source activation, authorization or proof of reservation.

Repository replay infrastructure is evidenced on functional/evidence head `e999c5a07d3ced6c95f2eb44f6a5f03a9c17caea`, tree `73b7c198813d6aede795b8b186bd4d58e741b181`. GitHub Quality Gate run `29500488408` succeeded; app job `87627894974` passed. DB job `87627894968` completed clean 71/71, a synthetic local exact-ten-ledger-prefix/pre-ledger-repair/three-pending-migration/security-surface rehearsal and a second 71/71 pass. Quality artifact `8376235675` and database artifact `8376300064` preserve separate receipts. The rehearsal is not a current-development clone, live-derived upgrade replay, drift, live apply or DB-01 certification. Local Docker remains unavailable; Data API containment, live JWT/Storage/source personas, advisor parity and SOURCE-01 remain open.

The review-only Storage owner-path policy no longer evaluates direct caller joins against protected base/Auth tables. It delegates one exact organization/project/role decision to narrow `SECURITY DEFINER geoai_private.has_storage_project_role()`, keeps authenticated object fetch/signing operation-aware so bucket listing is denied, and excludes `client_viewer` from raw objects. It remains unapplied and is not Storage readiness evidence.

## Current audit branch

| Candidate receipt | Verified value |
| --- | --- |
| Local Auth/Admin working tree | Starts from local-only commit `db9f8630f21b50ba76455338050dcb1b335b0dac`; subsequent Auth/MFA/Admin/docs changes are uncommitted, not pushed, not deployed and not merged |
| Functional/evidence head | `e999c5a07d3ced6c95f2eb44f6a5f03a9c17caea` |
| Git tree | `73b7c198813d6aede795b8b186bd4d58e741b181` |
| GitHub Quality Gate | Run `29500488408`, success |
| Application job | `87627894974`, success |
| Supabase replay/rehearsal/pgTAP | Job `87627894968`, success; clean `Files=1, Tests=71` PASS; synthetic ledger-prefix rehearsal PASS; second `Files=1, Tests=71` PASS |
| Quality artifact | `8376235675`, `geoai-quality-evidence-29500488408`, digest `sha256:dcabdae37373a7c7ca7676cd0761c5c56e7b2ffb8c35104ec1ed0330dfb39de2` |
| Database artifact | `8376300064`, `geoai-database-evidence-29500488408`, digest `sha256:c9297dbde840bef1c289fb1aac55a2c3ee743a1be7411c49a59e10df6ed552f1` |
| Last fully evidenced Vercel Preview | `dpl_CY7oNavQwu5ddkhRRLaR3FWTd3d9`, READY on exact evidence head; [deployment](https://geoai-oni3o8lwu-geoaidev.vercel.app) |
| Latest observed Vercel deployment | `dpl_3r3eFhCEnhg7QdURF79r4tnLsPfF`, READY on remote PR head `cf0ee1903e8411eabf8e048c1d8e775a0454340c`; no new route/browser matrix claimed |
| Preview HTTP matrix | `/`, `/workspace`, `/explore`, `/api/health`, `/api/platform/activation-status` returned 200 as applicable; source pack returned 503 with `activationAllowed:false` and zero sources; invalid climate coordinates returned 400; security headers were present |
| Browser evidence | Rendered browser/mobile/keyboard/print evidence remains unclaimed. Local production-build HTTP smoke returns 200 for `/login`, `/register`, `/mfa`, `/onboarding`, `/admin` and the existing critical pages; unauthenticated Admin/invitation acceptance fail 401, staging/unconfigured logout fail 503 in demo mode, and cross-origin Auth mutations fail 403. HTTP is not browser evidence. |

The 2026-07-16 full-system audit is an unreleased [Draft PR #97](https://github.com/mmgolikov/geoai-mvp/pull/97) candidate. It adds project-scoped browser-only public-demo artifacts under a versioned demo-only namespace with Auth-transition cleanup; browser-local analysis/scoring; 403-before-body server generation/mutation containment; strict CSV/GeoJSON/AOI quotas and revalidation; fail-closed unknown-project/canonical report ID handling; summary-only public report-package collections; server-evidence-receipt and validation-attestation gates; a manifest-driven private/no-store boundary for all project/identity GET responses; `/explore` environment wiring; and regression controls. User-uploaded/user-drawn raw content, geometry and derived coordinates remain local. The canonical AOI validator rejects non-finite/out-of-WGS84 coordinates, wrong tuple arity and unsupported antimeridian crossings; its 11-persona adversarial contract covers one representative Dubai polygon and ten negative cases. Public diagnostics are static/sanitized and withhold infrastructure inventories. Anonymous source routes use bounded, explicit allowlisted `compact_public_v1` DTOs only (`contractVersion: 1.3`, manifest `1.6`, `liveRegistryIncluded:false`) and statically import the reviewed manifest plus compact quality totals rather than deep snapshots; per-source zero/count/use truth is contract-tested. Exact Preview UTF-8 sizes are data-sources 5,164 B, readiness 4,411 B, manifest 18,284 B, sources 5,164 B, status 8,221 B and source-lineage 4,292 B. Lazy-loading the Workspace comparison, express-result and report-preview surfaces reduced the local production-build First Load JS measure from 252 kB to 218 kB (approximately 13.5% gzip); browser flows and Core Web Vitals remain unverified. `/demo` is a 307 redirect to `/workspace`. None of this changes Production, applies Supabase migrations, changes external credentials or activates providers.

Candidate application code no longer imports or needs a service-role credential/direct database URL and disables public Supabase repositories before AUTH-01. It accepts only modern `sb_publishable_` keys, ignores `.env.operator`, statically scans tracked files for key/DB/private-key shapes and requires project/SHA/migration-tree-bound operator receipts. A privileged development Supabase credential was observed across historical public Preview deployments. On 2026-07-16 the owner confirmed removal of the Vercel `SUPABASE_SERVICE_ROLE_KEY` and legacy public anon variable, Shared-scope review, disablement of development legacy `anon`/`service_role` keys, and Preview-only rehearsal configuration using the exact rehearsal URL plus a modern publishable key, `supabase_auth`, hard enforcement and public-demo denial. No value was recorded. The available connectors cannot independently enumerate Vercel values or legacy-key state, so [ENV-01](CODEX_BACKLOG_2026_07_16.md#env-01--public-vercel-credential-evacuation-and-rotation) still requires a fresh exact-head deployment and hosted negative/Auth evidence; redeploying an old deployment ID is insufficient.

All earlier candidate receipts are superseded and must not be reused. The exact candidate authority is the receipt table above. See the repository [Full System Audit](FULL_SYSTEM_AUDIT_2026_07_16.md), [Confluence authority](https://geoaimvp.atlassian.net/wiki/spaces/PH/pages/12320972) and GitHub [execution program #96](https://github.com/mmgolikov/geoai-mvp/issues/96).

## Design authority — read-only verification

[Figma file `TAzDqOvRCw1mQGMU3Y4S9H`](https://www.figma.com/design/TAzDqOvRCw1mQGMU3Y4S9H) has 61 pages. Node `169:2` remains `00 — CURRENT MASTER / START HERE`; `217:3` remains `00 — WIP MASTER / NOT CURRENT`, and child `217:19` still carries the stale `Current Production after PR #54` label. Identity `465:5` is named `IDENTITY-GATE-04 ... PASS · FOUNDER APPROVED`, but governance still blocks legal/public release; older `413:2` remains Founder Review. [FigJam `hjy7prEcRySkqPvJYWIwwX`](https://www.figma.com/board/hjy7prEcRySkqPvJYWIwwX) root `0:1` is empty. No Figma/FigJam mutation or Product/design promotion was performed, and design labels are not code-parity or release evidence.

## Technical gates before protected or real data

1. Execute and evidence the selected development Data API/identity boundary, upgrade replay, full-chain anonymous-grant retirement and live RLS persona evidence; the exact-head ephemeral clean-replay receipt is complete but does not satisfy these live gates.
2. ENV-01 fresh exact-head Preview and hosted negative/Auth evidence after owner-confirmed credential evacuation and development legacy-key disablement; it must close before Auth integration is claimed complete.
3. Request-scoped Auth/RBAC and real membership enforcement.
4. Protected Storage pipeline and user-context signed URL tests.
5. Execute and evidence the staged source-custody model, trusted worker write boundary, provider rights/receipts and public projection; schema presence alone does not activate providers.
6. Before protected/upstream AI use: AI quotas/privacy/rate limiting and observability. This is not an S0 blocker for deterministic public-demo fallback.
7. Owner decision for any Production or source activation.

Production URL: [geoai-mvp.vercel.app](https://geoai-mvp.vercel.app). Vercel project: [geoaidev/geoai-mvp](https://vercel.com/geoaidev/geoai-mvp).

Independent reviewer approvals are not required in the current phase. This does not waive the technical/evidence gates above.

Required caveat: **Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.**
