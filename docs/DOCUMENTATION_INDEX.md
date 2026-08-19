# GeoAI Documentation Index

Status: Active navigation authority
Last verified: 2026-08-19
Owner: GeoAI Documentation Governance
Authority: Sole repository navigation and lifecycle precedence
Successor: None; any replacement must update this file
Operational dashboard: [Confluence Project Hub](https://geoaimvp.atlassian.net/wiki/spaces/PH/overview) (`partial`; last repository read-back predates PR #113)
Navigation: [Current Release State](CURRENT_RELEASE_STATE.md) · [Product Baseline and Readiness](PRODUCT_BASELINE_AND_READINESS.md) · [Architecture](architecture.md) · [Data Strategy](data-strategy.md) · [Roadmap](roadmap.md) · [QA Checklist](qa-checklist.md)

This index is the repository entry point for current documentation. Active authorities below win over dated snapshots, old change requests, receipts and release notes. Historical files remain in place as point-in-time evidence; use the [Superseded Document Register](SUPERSEDED_DOCUMENT_REGISTER.md) before relying on them operationally.

## Start here

| Need | Current authority | What it answers |
| --- | --- | --- |
| Repository overview | [README](../README.md) | Supported prototype behavior, setup, routes and public-demo restrictions |
| Exact released tuple | [Current Release State](CURRENT_RELEASE_STATE.md) | GitHub SHA, PR, Vercel deployment, runtime stage, CI and release boundary |
| Product scope and readiness | [Product Baseline and Readiness](PRODUCT_BASELINE_AND_READINESS.md) | Market direction, core flow, released visual baseline, readiness and S0 blockers |
| External authority status | [External Authority Registry](EXTERNAL_AUTHORITY_REGISTRY.json) | Confirmed, partial, blocked and unverified external evidence with write boundaries |
| Implemented system | [Architecture](architecture.md) | Current code behavior and trust boundaries |
| Data and source rules | [Data Strategy](data-strategy.md) | Source rights, custody, evidence and activation sequence |
| Delivery order | [Roadmap](roadmap.md) | Dependency order before protected-pilot activation |
| Verification | [QA Checklist](qa-checklist.md) | Required static, build, runtime, browser and evidence checks |
| Release and change discipline | [Release/Changelog Contract](RELEASE_CHANGELOG_CONTRACT.md) | Change Request, release evidence, changelog and rollback requirements |
| Current change authorization | [WP-DEV13-002 Exact-Head Evidence Closure, Phase A](WP_DEV13_002_EXACT_HEAD_EVIDENCE_CLOSURE_PHASE_A.md) | Independent-review remediation, three-commit partition and blocked external gate plan |
| Predecessor change authorization | [WP-DEV13-001 Change Request](WP_DEV13_001_PRODUCTION_BASELINE_RECOVERY_CHANGE_REQUEST.md) | Original local-only scope, risks, acceptance criteria and rollback |
| Current source audit | [Production Baseline Source Audit — 2026-08-18](PRODUCTION_BASELINE_SOURCE_AUDIT_2026_08_18.md) | Read-only GitHub, Vercel, runtime, CI, docs and local migration evidence |
| Superseded and duplicate material | [Superseded Document Register](SUPERSEDED_DOCUMENT_REGISTER.md) | Files to preserve but not use as current authority |
| Change history | [Changelog](../CHANGELOG.md) | Released, unreleased and historical changes |
| Agent operating rules | [AGENTS.md](../AGENTS.md) | Implementation, validation and non-authorization rules |
| Stable release schema | [Release Authority Policy](RELEASE_AUTHORITY_POLICY.json) | Evidence precedence and receipt schema; it intentionally contains no current tuple |
| Generated lifecycle | [Lifecycle Manifest](DOCUMENT_LIFECYCLE_MANIFEST.json), [Archive Index](DOCUMENT_ARCHIVE_INDEX.md) | Machine-derived lifecycle and successor for every in-scope Markdown document |

## Cross-confirmed current baseline

These facts must agree across all active release-fact documents:

| Fact | Current value |
| --- | --- |
| Released PR | GitHub PR #113, merged |
| Released `main` | `7f323c4227f2409f3fe2d4d68be48a30176f4e2a` |
| Released `release/production` | `7f323c4227f2409f3fe2d4d68be48a30176f4e2a` |
| Vercel Production | `dpl_4yBHCo1eZ7N6GYQWGAg1EdQGwFTE`, `READY`, canonical alias `https://geoai-mvp.vercel.app`, exact SHA |
| Released visual/product baseline | Product System v3.2.2 correction contained in PR #113; preserve Production behavior and visuals |
| Runtime stage | `public_demo_prototype` |
| Access and persistence | `public_demo_only`; `browser_local`; `demo_public`; soft access; confidential pilot blocked |
| Pilot backend | `not_production_ready_or_pilot_ready` |
| S0 blockers | DB-01 canonical replay/RLS; AUTH-01 request-scoped identity/membership; STORAGE-01 protected evidence; SOURCE-01 real-source custody |
| Sources | `sample_fallback`, `manual_import_ready`, `permission_required` or `planned`; no live official integration |
| Latest exact-SHA Quality Gate | Run `31946738874`: `partial` evidence and overall failure at Production dependency audit; database replay job passed; downstream application checks were skipped |
| Historical exact-SHA green gate | Run `30158549978`: successful point-in-time evidence only |
| Rollback deployment | `unverified` for the PR #113 release tuple; select and verify before any future Production action |
| Repository evidence freshness | Current release/runtime window expires `2026-08-25T18:03:54Z`; refreshed Supabase management-metadata windows expire `2026-08-20T20:07:43Z`; documentation gate fails after expiry |
| Maturity | Public-demo prototype; not Production-ready and not pilot-ready |

The mandatory caveat is:

> Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.

## Authority and lifecycle boundaries

### External systems

- GitHub release refs, PR #113 and the Vercel deployment/alias chain were read-only verified on 2026-08-18 and are `confirmed` in the external registry.
- Production route/API responses were read-only observed; browser rendering was observed at desktop and mobile widths. This does not certify protected or real-user personas.
- Figma and Confluence receipts are `partial`: repository evidence exists, but no current PR #113 write/read-back cycle was authorized or performed.
- Local Supabase migration custody is `confirmed` only as a static repository contract: one pre-ledger reconciliation, ten immutable development-ledger migrations and seven pending migrations; `liveApplyReady:false`.
- GeoAI_main observed management metadata only: `geoai-dev` is `INACTIVE` and `geoai-auth-rehearsal` is `ACTIVE_HEALTHY`. Both authorities are `partial`; their physical schema/ledger/rows/advisors/RLS/policies/PostgREST/Storage/source state is `unverified`. Production protected persistence is `blocked`.

### Released Product System

The Production runtime at PR #113 is the current visual/product authority. Product System v3.2.1 CR 10.02, its registry, token manifest, component mapping and QA receipt are preserved historical provenance that led to the released v3.2.2 correction; they no longer describe an unmerged current candidate. They do not authorize Figma writes, page-body redesign, Auth, Supabase, Storage, source activation or another release.

Draft PR #143 (`product/gcc-real-estate-decision-platform-v1` at `e92fb5d8e8d83de72ee4c4376d958ce598c00536`) is an excluded non-authority. Its design/UI must not be copied, cherry-picked, recreated or treated as release evidence. Any future salvage requires file-level review and explicit inclusion in an approved Change Request.

### Historical operating material

- [Full System Audit — 2026-07-16](FULL_SYSTEM_AUDIT_2026_07_16.md), [Codex Backlog — 2026-07-16](CODEX_BACKLOG_2026_07_16.md) and the [Data API Containment Runbook — 2026-07-16](SUPABASE_DATA_API_CONTAINMENT_RUNBOOK_2026_07_16.md) are historical/scoped evidence, not active release authority.
- [Historical Last Verified Release Snapshot](LAST_VERIFIED_RELEASE_SNAPSHOT.json) records PR #106 and is superseded by the confirmed PR #113 external chain.
- [Confluence sync map](CONFLUENCE_SYNC_MAP.json), [CHG-19 receipt](CONFLUENCE_CHG19_RECEIPT.json) and earlier receipts are historical integrity evidence. They do not establish current PR #113 Confluence authority.
- `CR-*`, dated audits, receipts and release notes remain scoped evidence unless this index explicitly promotes them.

## Topic navigation

### Product and UX

- Current scope, regions, flow and visual boundary: [Product Baseline and Readiness](PRODUCT_BASELINE_AND_READINESS.md).
- Implemented UI constraints and known debt: [Architecture](architecture.md#known-architectural-debt).
- Current verification requirements: [QA Checklist](qa-checklist.md).
- Historical Product System provenance: [CR 10.02](CR_10_02_DESIGN_FOUNDATION_SHARED_SHELL.md), [authority registry](DESIGN_SYSTEM_V3_2_AUTHORITY_REGISTRY.json), [token manifest](DESIGN_FOUNDATION_TOKEN_MANIFEST_V3_2.json), [component mapping](DESIGN_FOUNDATION_COMPONENT_MAPPING_V3_2.md) and [QA receipt](DESIGN_FOUNDATION_SHARED_SHELL_QA_RECEIPT.md).

### Data, spatial and sources

- Current policy: [Data Strategy](data-strategy.md).
- Released bounded source-package evidence: [CR-DEV8-001](CR_DEV8_001_CONTROLLED_OPEN_CONTEXT_SOURCE_CONNECTION_PACK_V1.md) and its [QA evidence](CR_DEV8_001_QA_CHECKLIST.md).
- Spatial geometry remains blocked by delivery, distribution, attribution, retention and rollback decisions tracked in GitHub Issue #80.
- DB-01 remains an S0 blocker; local migration custody is not hosted replay/RLS proof.

### Security, Auth and Storage

- Trust boundary: [Architecture](architecture.md#request-and-trust-boundaries).
- Activation checks: [QA Checklist](qa-checklist.md).
- Historical rehearsal/operator evidence: [Supabase Auth Rehearsal Receipt](SUPABASE_AUTH_REHEARSAL_RECEIPT_2026_07_16.json) and [Data API Containment Runbook](SUPABASE_DATA_API_CONTAINMENT_RUNBOOK_2026_07_16.md).
- No active authority claims request-scoped Auth/RBAC, protected Storage, real-source custody or Production Supabase readiness.

### Delivery and governance

- Current ordering and holds: [Roadmap](roadmap.md).
- Current external evidence status: [External Authority Registry](EXTERNAL_AUTHORITY_REGISTRY.json).
- Exact change authorization: [WP-DEV13-002 Exact-Head Evidence Closure, Phase A](WP_DEV13_002_EXACT_HEAD_EVIDENCE_CLOSURE_PHASE_A.md); [WP-DEV13-001](WP_DEV13_001_PRODUCTION_BASELINE_RECOVERY_CHANGE_REQUEST.md) is its preserved predecessor.
- Historical backlog items require re-triage against the current product baseline before implementation.

## Documentation lifecycle

| Class | Rule |
| --- | --- |
| Active authority | Has an explicit `Status` and `Last verified`, is listed in **Start here**, and is updated with affected behavior |
| Release/control evidence | Retains exact historical facts and states its released or superseded scope |
| Historical snapshot | Remains in place; current navigation points to its successor |
| Draft/target | States that it is not implemented and cannot be used as runtime evidence |

Every change affecting release facts, APIs, trust boundaries, sources, activation or operator workflow must update this index or demonstrate that no current-truth change is needed. `npm run test:documentation-current-truth` enforces core cross-document invariants; semantic review remains mandatory.
