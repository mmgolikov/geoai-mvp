# GeoAI Documentation Index

Status: Active navigation authority
Last verified: 2026-07-16
Operational dashboard: [Confluence Project Hub](https://geoaimvp.atlassian.net/wiki/spaces/PH/overview)
Confluence audit authority: [09.13 Full System Audit — 2026-07-16](https://geoaimvp.atlassian.net/wiki/spaces/PH/pages/12320972)

This index is the repository entry point for current documentation. If a versioned release note, dated snapshot or old change request conflicts with an active document below, the active document wins. Historical files remain immutable evidence of what was believed or released at that time; they are not current operating instructions.

## Start here

| Need | Current authority | What it answers |
| --- | --- | --- |
| Release/runtime truth | [Current Release State](CURRENT_RELEASE_STATE.md) | Exact GitHub SHA, CI, Vercel, Supabase and source activation state |
| Full critical assessment | [Full System Audit — 2026-07-16](FULL_SYSTEM_AUDIT_2026_07_16.md) | Findings, fixes, residual risks and go/no-go boundaries |
| Implemented system | [Architecture](architecture.md) | What the code does now and where trust boundaries stop |
| Data/source rules | [Data Strategy](data-strategy.md) | Source rights, custody, evidence and activation sequence |
| Delivery order | [Roadmap](roadmap.md) | P0/P1/P2 dependencies before Auth, Admin and real sources |
| Verification | [QA Checklist](qa-checklist.md) | Mandatory technical and runtime checks |
| Executable residual work | [Codex Backlog](CODEX_BACKLOG_2026_07_16.md) | Scoped tasks and acceptance criteria |
| Released source package | [CR-DEV8-001](CR_DEV8_001_CONTROLLED_OPEN_CONTEXT_SOURCE_CONNECTION_PACK_V1.md) and [QA evidence](CR_DEV8_001_QA_CHECKLIST.md) | Exact bounded Preview source contract released in PR #87 |
| Change history | [Changelog](../CHANGELOG.md) | Chronological repository changes |

## Cross-confirmed current baseline

The following facts must agree across the Hub, release state, architecture, roadmap and active QA documentation:

| Fact | Current value |
| --- | --- |
| Released PR | GitHub PR #87, merged |
| Released `main` | `2999e7e857989baf53ce58ecfed63550b5896be0` |
| Exact-main CI | Run `29456624801`, 18/18; artifact `8359607780` |
| Vercel Production | `dpl_EAXREH31JKznnGbQYEU8bNqTqagN`, READY on exact SHA |
| Product mode | Public demo; `demo_only`, `local_fallback`, soft access |
| Production database | Supabase not configured |
| Production source pack | HTTP 503; disabled; zero sources |
| Maturity | Not Production-ready and not pilot-ready |

The full-system audit branch is unreleased until its own exact-head GitHub and Vercel Preview evidence exists. It does not authorize a Production deployment, Supabase apply, secret change, Auth activation, real source connection or geometry publication.

## Topic navigation

### Product and UX

- Current UI constraints and performance priorities: [Architecture](architecture.md#known-architectural-debt) and [Roadmap](roadmap.md#p2--product-and-design-quality).
- Stable layout rules: [UI Layout Guardrails](UI_LAYOUT_GUARDRAILS.md).
- Historical product release evidence: files prefixed `RELEASE_GEOAI_`, plus `DEMO_*`, `MVP_*` and dated audit/checkpoint files. These are historical unless linked as current above.

### Data, spatial and sources

- Current policy: [Data Strategy](data-strategy.md).
- Current released source contract: [CR-DEV8-001](CR_DEV8_001_CONTROLLED_OPEN_CONTEXT_SOURCE_CONNECTION_PACK_V1.md).
- Spatial geometry remains governed by [Spatial B1 Release Control](SPATIAL_B1_RELEASE_CONTROL_V1.md), [Attribution and Distribution Spec](SPATIAL_B1_ATTRIBUTION_AND_DISTRIBUTION_SPEC_V1.md) and GitHub issue #80.
- Migration reconciliation remains governed by GitHub issue #85 and the audit [DB-01 task](CODEX_BACKLOG_2026_07_16.md#db-01--canonical-migration-replay-and-rls-evidence).

### Security, Auth and Storage

- Implemented trust boundary: [Architecture](architecture.md#request-and-trust-boundaries).
- Pre-activation checks: [QA Checklist](qa-checklist.md).
- Historical foundations such as `AUTH_*`, `RLS_*`, `SECURE_FILE_STORAGE_*` and `SUPABASE_*` describe intended or prior work. They do not prove active Auth, RLS, Storage or pilot readiness.

### Delivery and governance

- Current ordering and holds: [Roadmap](roadmap.md).
- Current residual tasks: [Codex Backlog](CODEX_BACKLOG_2026_07_16.md).
- Independent reviewer approvals are not required in the current phase. Objective evidence gates remain mandatory.
- Dated `CURRENT_RELEASE_STATE_*`, `CHECKPOINT_*`, `*_CHANGE_REQUEST` and `*_QA_CHECKLIST` files are preserved as release/change evidence and must not be read as the latest state unless this index explicitly links them.

## Documentation lifecycle

| Class | Rule |
| --- | --- |
| Active authority | Has an explicit `Status` and `Last verified`; is listed in **Start here**; must be updated in the same change as affected behavior |
| Release/control evidence | May retain historical SHAs, deployment IDs and decisions; must identify its released or superseded scope |
| Historical snapshot | Immutable point-in-time evidence; current navigation must point to its successor |
| Draft/target | Must say that it is not implemented and must never be used as runtime evidence |

Every change that affects release facts, APIs, trust boundaries, sources, activation or operator workflow must update this index or prove that no navigation/current-truth change is needed. `npm run test:documentation-current-truth` enforces the core cross-document invariants; semantic review is still required.
