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

## Immediate Production operating restriction

The released PR #87 public demo does **not** isolate user-created server state. Until Draft PR #97 is merged and deployed, do not enter or upload any user, client, confidential or decision-sensitive AOI, CSV, GeoJSON, filename, evidence or report/package data in Production. Use only the built-in synthetic/demo fixtures. The released `/explore` route also has a known runtime-environment wiring defect: the source-pack API is fail-closed, but the UI can present Preview/open-context source semantics. Do not treat the released Production source UI boundary as fully verified.

## Released source scope

- Fixed, low-volume Preview context only: NASA POWER historical point context, Copernicus catalogue metadata without geometry/assets and OSM counts without features/geometry.
- Open-Meteo is permission-gated and excluded from evidence and AI payloads.
- DLD/Dubai Pulse live use remains blocked pending approved stable access/snapshot custody and reusable rights.
- Overture/OSM geometry, imagery, persistence and source-dependent scoring are not activated.

## Development Supabase evidence

Project `pphdqkurxneyagvnnjdt` is a development foundation, separate from Production. Fresh read-only verification at 2026-07-16 11:31 UTC found `ACTIVE_HEALTHY` on PostgreSQL `17.6.1.141`, 20 public tables with RLS on 19 (`spatial_ref_sys` is the exception), ten applied migrations and zero applied entries for the three candidate containment/identity/source-custody migrations, zero Auth users, four buckets and zero `storage.objects` policies. The repository reconstructs the exact ten-entry live ledger by version, bytes and MD5, quarantines non-ledger drafts and records the pre-ledger healthcheck reconciliation. Exact-snapshot ephemeral clean replay passes, but upgrade replay and the live boundary remain unverified, so DB-01 remains open.

The live development Data API remains uncontained. At the same 11:31 UTC snapshot, `anon` and `authenticated` each retained 22 public-table `TRUNCATE` grants; RLS does not control `TRUNCATE`. The four Storage buckets remain private with zero `storage.objects` policies, so Storage is unavailable rather than certified. Advisors returned 14 security findings (one ERROR, 13 WARN) and 71 performance findings (53 INFO, 18 WARN). No live write or configuration change was performed, and ephemeral replay must not be interpreted as live Data API, ACL, Storage or advisor remediation.

The pending model chooses global Auth-backed profiles plus organization/project memberships, exact role/action policies, account-state denial and a minimal `api` RPC allowlist. Before any profile RPC, the inactive permanent-user boundary now requires UUID `claims.sub` exactly equal to canonical `auth.getUser().id`, plus explicit claims/user `is_anonymous === false`; subject mismatch is 401, anonymous identity 403 and ambiguity fails closed. AUTH-01B then requires an exact project key, resolves `api.current_project_access()` and permits only a bounded approved source-release DTO. Every Auth/repository/persona readiness flag remains false and no application route consumes the facade. See the [Data API containment runbook](SUPABASE_DATA_API_CONTAINMENT_RUNBOOK_2026_07_16.md). It is not executed and not apply-ready.

Pending SOURCE-01 adds five RLS-enabled, direct-grant-closed custody tables: source catalog, immutable releases, artifacts, status events and ingestion receipts. Composite tenant/release plus actor organization/project-membership FKs close cross-scope custody writes. Legacy registry backfill defaults to `restricted` and `registered_unverified`; bounded `api.current_source_releases()` exposes only an explicit `approved` metadata projection to the caller-scoped owner/admin/analyst/viewer context and omits arbitrary quality/lineage summary JSON, object paths, source URIs, secrets and `client_viewer`. This is an unapplied schema contract, not connected-source evidence: no provider is connected, no write API is opened and provider writes remain blocked.

SOURCE-02 is staged only as a pure `reserve_or_replay` claim v1. Execution/idempotency hashes bind exact environment, tenant, connector/provider/parser, rights, broker, endpoint/network/body and acquisition-window inputs; actor is omitted only from the shared acquisition key. The unsigned claim is correlation-only with authorization `none`; external registry/plan/hash revalidation, trusted execution and transactional SOURCE-01 writing remain mandatory. The registry is empty, Production is denied and there is no fetch/env/secrets/persistence or atomic pre-fetch reservation writer. The claim is not source activation, authorization or proof of reservation.

Repository replay infrastructure is evidenced on functional/evidence head `e999c5a07d3ced6c95f2eb44f6a5f03a9c17caea`, tree `73b7c198813d6aede795b8b186bd4d58e741b181`. GitHub Quality Gate run `29500488408` succeeded; app job `87627894974` passed. DB job `87627894968` completed clean 71/71, a synthetic local exact-ten-ledger-prefix/pre-ledger-repair/three-pending-migration/security-surface rehearsal and a second 71/71 pass. Quality artifact `8376235675` and database artifact `8376300064` preserve separate receipts. The rehearsal is not a current-development clone, live-derived upgrade replay, drift, live apply or DB-01 certification. Local Docker remains unavailable; Data API containment, live JWT/Storage/source personas, advisor parity and SOURCE-01 remain open.

The review-only Storage owner-path policy no longer evaluates direct caller joins against protected base/Auth tables. It delegates one exact organization/project/role decision to narrow `SECURITY DEFINER geoai_private.has_storage_project_role()`, keeps authenticated object fetch/signing operation-aware so bucket listing is denied, and excludes `client_viewer` from raw objects. It remains unapplied and is not Storage readiness evidence.

## Current audit branch

| Candidate receipt | Verified value |
| --- | --- |
| Functional/evidence head | `e999c5a07d3ced6c95f2eb44f6a5f03a9c17caea` |
| Git tree | `73b7c198813d6aede795b8b186bd4d58e741b181` |
| GitHub Quality Gate | Run `29500488408`, success |
| Application job | `87627894974`, success |
| Supabase replay/rehearsal/pgTAP | Job `87627894968`, success; clean `Files=1, Tests=71` PASS; synthetic ledger-prefix rehearsal PASS; second `Files=1, Tests=71` PASS |
| Quality artifact | `8376235675`, `geoai-quality-evidence-29500488408`, digest `sha256:dcabdae37373a7c7ca7676cd0761c5c56e7b2ffb8c35104ec1ed0330dfb39de2` |
| Database artifact | `8376300064`, `geoai-database-evidence-29500488408`, digest `sha256:c9297dbde840bef1c289fb1aac55a2c3ee743a1be7411c49a59e10df6ed552f1` |
| Vercel Preview | `dpl_CY7oNavQwu5ddkhRRLaR3FWTd3d9`, READY on exact head; [deployment](https://geoai-oni3o8lwu-geoaidev.vercel.app) |
| Preview HTTP matrix | `/`, `/workspace`, `/explore`, `/api/health`, `/api/platform/activation-status` returned 200 as applicable; source pack returned 503 with `activationAllowed:false` and zero sources; invalid climate coordinates returned 400; security headers were present |
| Browser evidence | Unclaimed: local headless launch is blocked by a system Unix-socket restriction; HTTP evidence is not browser/mobile/keyboard/print evidence |

The 2026-07-16 full-system audit is an unreleased [Draft PR #97](https://github.com/mmgolikov/geoai-mvp/pull/97) candidate. It adds project-scoped browser-only public-demo artifacts under a versioned demo-only namespace with Auth-transition cleanup; browser-local analysis/scoring; 403-before-body server generation/mutation containment; strict CSV/GeoJSON/AOI quotas and revalidation; fail-closed unknown-project/canonical report ID handling; summary-only public report-package collections; server-evidence-receipt and validation-attestation gates; a manifest-driven private/no-store boundary for all project/identity GET responses; `/explore` environment wiring; and regression controls. User-uploaded/user-drawn raw content, geometry and derived coordinates remain local. The canonical AOI validator rejects non-finite/out-of-WGS84 coordinates, wrong tuple arity and unsupported antimeridian crossings; its 11-persona adversarial contract covers one representative Dubai polygon and ten negative cases. Public diagnostics are static/sanitized and withhold infrastructure inventories. Anonymous source routes use bounded, explicit allowlisted `compact_public_v1` DTOs only (`contractVersion: 1.3`, manifest `1.6`, `liveRegistryIncluded:false`) and statically import the reviewed manifest plus compact quality totals rather than deep snapshots; per-source zero/count/use truth is contract-tested. Exact Preview UTF-8 sizes are data-sources 5,164 B, readiness 4,411 B, manifest 18,284 B, sources 5,164 B, status 8,221 B and source-lineage 4,292 B. Lazy-loading the Workspace comparison, express-result and report-preview surfaces reduced the local production-build First Load JS measure from 252 kB to 218 kB (approximately 13.5% gzip); browser flows and Core Web Vitals remain unverified. `/demo` is a 307 redirect to `/workspace`. None of this changes Production, applies Supabase migrations, changes external credentials or activates providers.

Candidate application code no longer imports or needs a service-role credential/direct database URL and disables public Supabase repositories before AUTH-01. It accepts only modern `sb_publishable_` keys, ignores `.env.operator`, statically scans tracked files for key/DB/private-key shapes and requires project/SHA/migration-tree-bound operator receipts. A privileged Supabase credential was observed across historical public Preview deployments; owner-controlled [ENV-01](CODEX_BACKLOG_2026_07_16.md#env-01--public-vercel-credential-evacuation-and-rotation) must rotate/revoke it, remove every Preview/Development/override value and create a fresh exact-SHA deployment. Redeploying an old deployment ID is insufficient.

All earlier candidate receipts are superseded and must not be reused. The exact candidate authority is the receipt table above. See the repository [Full System Audit](FULL_SYSTEM_AUDIT_2026_07_16.md), [Confluence authority](https://geoaimvp.atlassian.net/wiki/spaces/PH/pages/12320972) and GitHub [execution program #96](https://github.com/mmgolikov/geoai-mvp/issues/96).

## Design authority — read-only verification

[Figma file `TAzDqOvRCw1mQGMU3Y4S9H`](https://www.figma.com/design/TAzDqOvRCw1mQGMU3Y4S9H) has 61 pages. Node `169:2` remains `00 — CURRENT MASTER / START HERE`; `217:3` remains `00 — WIP MASTER / NOT CURRENT`, and child `217:19` still carries the stale `Current Production after PR #54` label. Identity `465:5` is named `IDENTITY-GATE-04 ... PASS · FOUNDER APPROVED`, but governance still blocks legal/public release; older `413:2` remains Founder Review. [FigJam `hjy7prEcRySkqPvJYWIwwX`](https://www.figma.com/board/hjy7prEcRySkqPvJYWIwwX) root `0:1` is empty. No Figma/FigJam mutation or Product/design promotion was performed, and design labels are not code-parity or release evidence.

## Technical gates before protected or real data

1. Execute and evidence the selected development Data API/identity boundary, upgrade replay, full-chain anonymous-grant retirement and live RLS persona evidence; the exact-head ephemeral clean-replay receipt is complete but does not satisfy these live gates.
2. ENV-01 evacuation/rotation of privileged credentials from public Vercel scopes, with exact-deployment evidence; it may run alongside DB work but must close before Auth integration.
3. Request-scoped Auth/RBAC and real membership enforcement.
4. Protected Storage pipeline and user-context signed URL tests.
5. Execute and evidence the staged source-custody model, trusted worker write boundary, provider rights/receipts and public projection; schema presence alone does not activate providers.
6. Before protected/upstream AI use: AI quotas/privacy/rate limiting and observability. This is not an S0 blocker for deterministic public-demo fallback.
7. Owner decision for any Production or source activation.

Production URL: [geoai-mvp.vercel.app](https://geoai-mvp.vercel.app). Vercel project: [geoaidev/geoai-mvp](https://vercel.com/geoaidev/geoai-mvp).

Independent reviewer approvals are not required in the current phase. This does not waive the technical/evidence gates above.

Required caveat: **Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.**
