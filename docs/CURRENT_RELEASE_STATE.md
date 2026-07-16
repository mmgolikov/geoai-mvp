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

Project `pphdqkurxneyagvnnjdt` is a development foundation, separate from Production. Read-only verification found 20 public tables, RLS on 19 (`spatial_ref_sys` is the PostGIS exception), ten applied migrations, zero Auth users and zero applied entries for the candidate containment migration. The repository migration filenames are not a portable canonical chain: version `20260618` is reused five times and `20260624` twice.

The live development Data API remains directly exposed. Anonymous reads returned rows from organizations/profiles/projects/memberships plus analyses, reports, comparisons, Data Room, validation, pilot, source/external snapshots and audit events. Source snapshot policies also admit `project_key IS NULL`, making any such row anonymous through PostgREST even when `project_id` is non-null. `anon` retains all four mutation privileges on `public.spatial_ref_sys` and can execute 748 `public` RPCs, including 79 volatile and six `SECURITY DEFINER` functions; `geoai_healthcheck` is SELECT-only. Four Storage buckets are private but `storage.objects` has zero policies, so Storage is unavailable rather than certified. Profile/Auth uniqueness/FK, organization membership, project/member nullability/consistency and AOI write-role semantics also need a single model decision before constraint apply. See the [draft Data API containment runbook](SUPABASE_DATA_API_CONTAINMENT_RUNBOOK_2026_07_16.md). It is not executed and not apply-ready; the owner must choose either disabling the Data API or exposing a dedicated minimal `api` schema.

## Current audit branch

The 2026-07-16 full-system audit is an unreleased [Draft PR #97](https://github.com/mmgolikov/geoai-mvp/pull/97) candidate. It adds project-scoped browser-only public-demo artifacts under a versioned demo-only namespace with Auth-transition cleanup; browser-local analysis/scoring; 403-before-body server generation/mutation containment; strict CSV/GeoJSON/AOI quotas and revalidation; fail-closed unknown-project/canonical report ID handling; summary-only public report-package collections; server-evidence-receipt and validation-attestation gates; a manifest-driven private/no-store boundary for all project/identity GET responses; `/explore` environment wiring; and regression controls. User-uploaded/user-drawn raw content, geometry and derived coordinates remain local. Public diagnostics are static/sanitized and withhold infrastructure inventories. Anonymous source routes use bounded, explicit allowlisted `compact_public_v1` DTOs only (`contractVersion: 1.3`, manifest `1.6`, `liveRegistryIncluded:false`) and statically import the reviewed manifest plus compact quality totals rather than deep snapshots; per-source zero/count/use truth is contract-tested. The final local production runtime measured data-sources/readiness/manifest/sources/status/source-lineage at 5,063/4,467/19,448/5,063/8,158/4,352 B; exact-head remote Preview measurement remains pending. `/demo` is a 307 redirect to `/workspace`. None of this changes Production, applies Supabase migrations, changes external credentials or activates providers.

Candidate application code no longer imports or needs a service-role credential/direct database URL and disables public Supabase repositories before AUTH-01. A privileged Supabase credential was observed in the existing public Preview configuration; owner-controlled [ENV-01](CODEX_BACKLOG_2026_07_16.md#env-01--public-vercel-credential-evacuation-and-rotation) must remove/rotate it and prove an exact deployment without exposing values.

The old candidate evidence—head `bb659131f7f4aa9065fc41ba91359a066738e1dd`, CI `29461582699`, artifact `8361356098`, Preview `dpl_3Az4qbfuLDcVDDK21eiAyYn5XPFJ`, 82/82 files—is superseded and must not be reused; that Preview retains the old diagnostic exposure until replaced. A new exact-head SHA/CI/Preview and negative runtime evidence are pending and must not be invented. See the repository [Full System Audit](FULL_SYSTEM_AUDIT_2026_07_16.md), [Confluence authority](https://geoaimvp.atlassian.net/wiki/spaces/PH/pages/12320972) and GitHub [execution program #96](https://github.com/mmgolikov/geoai-mvp/issues/96).

## Design authority — read-only verification

[Figma file `TAzDqOvRCw1mQGMU3Y4S9H`](https://www.figma.com/design/TAzDqOvRCw1mQGMU3Y4S9H) has 61 pages. Node `169:2` remains `00 — CURRENT MASTER / START HERE`; `217:3` remains `00 — WIP MASTER / NOT CURRENT`, and child `217:19` still carries the stale `Current Production after PR #54` label. Identity `465:5` is named `IDENTITY-GATE-04 ... PASS · FOUNDER APPROVED`, but governance still blocks legal/public release; older `413:2` remains Founder Review. [FigJam `hjy7prEcRySkqPvJYWIwwX`](https://www.figma.com/board/hjy7prEcRySkqPvJYWIwwX) root `0:1` is empty. No Figma/FigJam mutation or Product/design promotion was performed, and design labels are not code-parity or release evidence.

## Technical gates before protected or real data

1. Development Data API/identity-model decision, clean canonical migration replay, full-chain anonymous-grant retirement and live RLS persona evidence.
2. ENV-01 evacuation/rotation of privileged credentials from public Vercel scopes, with exact-deployment evidence; it may run alongside DB work but must close before Auth integration.
3. Request-scoped Auth/RBAC and real membership enforcement.
4. Protected Storage pipeline and user-context signed URL tests.
5. Explicit source visibility/custody and public projection.
6. Before protected/upstream AI use: AI quotas/privacy/rate limiting and observability. This is not an S0 blocker for deterministic public-demo fallback.
7. Owner decision for any Production or source activation.

Production URL: [geoai-mvp.vercel.app](https://geoai-mvp.vercel.app). Vercel project: [geoaidev/geoai-mvp](https://vercel.com/geoaidev/geoai-mvp).

Independent reviewer approvals are not required in the current phase. This does not waive the technical/evidence gates above.

Required caveat: **Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.**
