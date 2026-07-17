# GeoAI Documentation Index

Status: Active navigation authority
Last verified: 2026-07-16
Owner: GeoAI Documentation Governance
Authority: Sole repository navigation and lifecycle precedence
Successor: None; any replacement must update this file and the Confluence Hub atomically
Operational dashboard: [Confluence Project Hub](https://geoaimvp.atlassian.net/wiki/spaces/PH/overview)
Confluence audit authority: [09.13 Full System Audit — 2026-07-16](https://geoaimvp.atlassian.net/wiki/spaces/PH/pages/12320972)
Navigation: [Confluence Hub](https://geoaimvp.atlassian.net/wiki/spaces/PH/overview) · [Current Release State](CURRENT_RELEASE_STATE.md) · [Full System Audit](FULL_SYSTEM_AUDIT_2026_07_16.md) · [Roadmap](roadmap.md) · [QA Checklist](qa-checklist.md) · [Codex Backlog](CODEX_BACKLOG_2026_07_16.md)

This index is the repository entry point for current documentation. If a versioned release note, dated snapshot or old change request conflicts with an active document below, the active document wins. Historical files remain immutable evidence of what was believed or released at that time; they are not current operating instructions.

## Start here

| Need | Current authority | What it answers |
| --- | --- | --- |
| Repository overview | [README](../README.md) | Supported prototype features, setup, routes and current public-demo restrictions |
| Release/runtime truth | [Current Release State](CURRENT_RELEASE_STATE.md) | Exact GitHub SHA, CI, Vercel, Supabase and source activation state |
| Full critical assessment | [Full System Audit — 2026-07-16](FULL_SYSTEM_AUDIT_2026_07_16.md) | Findings, fixes, residual risks and go/no-go boundaries |
| Implemented system | [Architecture](architecture.md) | What the code does now and where trust boundaries stop |
| Data/source rules | [Data Strategy](data-strategy.md) | Source rights, custody, evidence and activation sequence |
| Delivery order | [Roadmap](roadmap.md) | P0/P1/P2 dependencies before Auth, Admin and real sources |
| Verification | [QA Checklist](qa-checklist.md) | Mandatory technical and runtime checks |
| Executable residual work | [Codex Backlog](CODEX_BACKLOG_2026_07_16.md) | Scoped tasks and acceptance criteria |
| Codex/agent operating instructions | [AGENTS.md](../AGENTS.md) | Current implementation, validation and non-authorization rules for coding agents |
| Supabase operator prerequisite | [Data API Containment Runbook](SUPABASE_DATA_API_CONTAINMENT_RUNBOOK_2026_07_16.md) | Rehearsal owner path executed; development exposure and separate owner decision remain draft/not apply-ready |
| Isolated rehearsal receipt | [Supabase Auth rehearsal receipt](SUPABASE_AUTH_REHEARSAL_RECEIPT_2026_07_16.json) | Exact Free project, migration, hosted pgTAP, API-only HTTP, advisor and residual-risk evidence |
| Continue in a new chat | [Continuation prompt](NEW_CHAT_CONTINUATION_PROMPT_2026_07_16.md) | Self-contained context, rules, integrations, state and next execution order |
| Released source package | [CR-DEV8-001](CR_DEV8_001_CONTROLLED_OPEN_CONTEXT_SOURCE_CONNECTION_PACK_V1.md) and [QA evidence](CR_DEV8_001_QA_CHECKLIST.md) | Exact bounded Preview source contract released in PR #87 |
| Change history | [Changelog](../CHANGELOG.md) | Chronological repository changes |
| Document lifecycle | [Generated lifecycle manifest](DOCUMENT_LIFECYCLE_MANIFEST.json) | Machine-derived active/non-active classification and successor for every in-scope repository Markdown document |
| Historical/scoped archive navigation | [Generated document archive index](DOCUMENT_ARCHIVE_INDEX.md) | Clickable lifecycle and successor sidecar without rewriting point-in-time evidence |
| Confluence synchronization | [Confluence sync map](CONFLUENCE_SYNC_MAP.json), [CHG-19 receipt](CONFLUENCE_CHG19_RECEIPT.json) and prior [CHG-18 receipt](CONFLUENCE_CHG18_RECEIPT.json) | Current 28-page role/authority/successor map plus versioned SHA-256 direct read-back evidence |

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
| Development Supabase | Ref `pphdqkurxneyagvnnjdt`, separate from Production; snapshot `ACTIVE_HEALTHY` on PG `17.6.1.141`; fresh ledger remains exactly ten historical entries with all seven current candidates unapplied; live Data API/Storage/persona/upgrade gates remain |
| Free Auth rehearsal | Ref `bkmfcjzalcvdsdvyxpgi`, separate from development/Production; the first six candidate migrations + owner API operator are applied; hosted pgTAP `183/183`; PostgREST `api` only proven by positive/negative HTTP; zero uncovered domain FKs; rollback-only two-backend table-level invitation concurrency passed. The seventh no-MFA verified-identity migration is prepared but unapplied; real email/phone/Admin, Storage and rendered-browser personas remain open |
| Maturity | Not Production-ready and not pilot-ready |

The full-system audit branch is published as Draft PR #97 but remains unreleased. [Current Release State](CURRENT_RELEASE_STATE.md) is the exact repository candidate-receipt authority; the PR and Confluence evidence register mirror volatile execution links. This does not authorize a merge, Production deployment, Supabase apply, secret change, Auth activation, real source connection or geometry publication.

The newer isolated rehearsal receipt supersedes the earlier statement that runtime pgTAP, Data API containment and all concurrency evidence were wholly unexecuted: pgTAP/API containment and rollback-only table-level invitation concurrency are now executed only on the Free rehearsal. Authenticated RPC/HTTP concurrency remains open. The receipt does not change the older GitHub exact-head evidence, the separate development project or Production.

Candidate-only published truth remains the functional/evidence head `e999c5a07d3ced6c95f2eb44f6a5f03a9c17caea`, tree `73b7c198813d6aede795b8b186bd4d58e741b181`, and successful GitHub Quality Gate run `29500488408`. Application job `87627894974` succeeded. DB job `87627894968` passed clean `Files=1, Tests=71`, a synthetic local exact-ten-ledger-prefix/pre-ledger-repair/three-pending-migration/security-surface rehearsal and a second 71/71 suite. Quality artifact `8376235675` (`geoai-quality-evidence-29500488408`) has digest `sha256:dcabdae37373a7c7ca7676cd0761c5c56e7b2ffb8c35104ec1ed0330dfb39de2`; database artifact `8376300064` (`geoai-database-evidence-29500488408`) has digest `sha256:c9297dbde840bef1c289fb1aac55a2c3ee743a1be7411c49a59e10df6ed552f1`. Preview `dpl_CY7oNavQwu5ddkhRRLaR3FWTd3d9` is READY on the exact head. Its HTTP matrix returned 200 for `/`, `/workspace`, `/explore`, `/api/health` and `/api/platform/activation-status`; source pack 503 with `activationAllowed:false` and zero sources; invalid climate coordinates 400; CSP/HSTS/`nosniff`/frame `DENY` present. Exact UTF-8 sizes remain 5,164/4,411/18,284/5,164/8,221/4,292 B; contract 1.3, manifest 1.6, `liveRegistryIncluded:false`. A newer unreleased candidate simplifies Auth to one email-or-phone screen, removes MFA from the product flow, hides invitation-token mechanics and provides the browser-only mock demo `demo@geoai.space` / `111111`. Its seventh compatibility migration replaces the Admin AAL2 requirement with verified permanent identity but is not applied anywhere. Mode-gated browser loading corrected the detected 285 kB regression to 220 kB for `/workspace` and `/explore`, against the 218 kB pre-Auth candidate baseline. No real email/phone persona is claimed; phone delivery still requires an owner-configured SMS provider. SOURCE-02 exposes only an unsigned, authorization-none `reserve_or_replay` correlation claim; registry/plan/hash revalidation, trusted execution, transactional persistence and atomic pre-fetch reservation remain external/absent. Upgrade/live Data API/JWT/Storage/source-persona/advisor gates remain open. Rendered browser/mobile/keyboard/print evidence is unclaimed; Production remains PR #87.

The personal-account increment at functional head `232fb532db1e5bc1dcf134ca1d616e4506f682f0` adds `/profile`, full-name/region/contact details, a browser-local avatar, registered-email/password actions and default B2B/B2C role propagation into Workspace and Projects. Quality Gate `29572587381` passed and Vercel Preview `dpl_G5vcKVQCHypacP9foGpAJ4Egwu5k` is READY with hosted route checks. It does not use user-editable preferences for authorization, enable verified sign-in-phone mutation or protected Storage, and it changes no live Supabase/Vercel Production state. A newer working-tree candidate restores landing `View demo`/`Leave a request` entry through Auth, automatically continues saved sessions to Workspace and highlights the shared profile icon; its fresh exact-head PR/Preview evidence is pending.

Immediate released-runtime restriction: PR #87 does not isolate user-created server state, and its `/explore` UI can present incorrect Preview/open-context semantics even though the source-pack API is fail-closed. Until Draft PR #97 is merged and deployed, use only built-in synthetic fixtures in Production; do not enter or upload user/client AOIs, CSV, GeoJSON, filenames, evidence or dynamic package data.

## Topic navigation

### Confluence operational map

The machine-readable [Confluence sync map](CONFLUENCE_SYNC_MAP.json) is the complete synchronization contract for the 28-page active/supporting operational authority set, not for every historical page in the space. CHG-19 supersedes CHG-18 for the final local-only Auth/Admin candidate, rollback-only table-level concurrency evidence and corrected 220 kB route baseline while preserving the released PR #87/Production boundary. Direct read-back passed 28/28 with exactly one CHG-19 marker pair, no CHG-16/CHG-17/CHG-18 marker and a recorded SHA-256 for every current body; see the [CHG-19 receipt](CONFLUENCE_CHG19_RECEIPT.json). The legitimate post-CHG-18 design-page v49 edit was explicitly rebased without changing its design/navigation content and became CHG-19 v50. The prior [CHG-18 receipt](CONFLUENCE_CHG18_RECEIPT.json) remains immutable evidence of the previous state. `CR-DEV8-001` (`12320810`) remains historical released evidence and points to Current Delivery State as successor. The other 226 pages remain historical/scoped cleanup inventory under DOCS-01; synchronizing the operational set does not silently certify them as current.

Hub is the operational snapshot; Home is the stable charter. Every evidence change must update Hub plus every affected mapped page after the exact candidate SHA/CI/deployment is final. Hub must directly link GitHub PR #97, execution program #96, the repository Codex backlog, Production/Vercel, Supabase containment, release state, audit, work packages, risks, decisions, security and pilot readiness.

### Product and UX

- Current UI constraints and performance priorities: [Architecture](architecture.md#known-architectural-debt) and [Roadmap](roadmap.md#p2--product-and-design-quality). Read-only Figma/FigJam authority and stale-node findings are recorded in [Current Release State](CURRENT_RELEASE_STATE.md#design-authority--read-only-verification).
- Historical layout reference: [UI Layout Guardrails](UI_LAYOUT_GUARDRAILS.md). Current design authority is [Architecture](architecture.md), this index and the active [QA Checklist](qa-checklist.md); the guardrail file is not independently current.
- Historical product release evidence: files prefixed `RELEASE_GEOAI_`, plus `DEMO_*`, `MVP_*` and dated audit/checkpoint files. These are historical unless linked as current above.

### Data, spatial and sources

- Current policy: [Data Strategy](data-strategy.md).
- Current released source contract: [CR-DEV8-001](CR_DEV8_001_CONTROLLED_OPEN_CONTEXT_SOURCE_CONNECTION_PACK_V1.md).
- Spatial geometry uses the objective tests/rights controls preserved in [Spatial B1 Release Control](SPATIAL_B1_RELEASE_CONTROL_V1.md), the [Attribution and Distribution Spec](SPATIAL_B1_ATTRIBUTION_AND_DISTRIBUTION_SPEC_V1.md) and GitHub issue #80. Any old independent-review prerequisite is historical exact-hash evidence, not a current approval hold; owner activation and objective geometry/rights evidence remain mandatory.
- Migration reconciliation remains governed by GitHub issue #85 and the audit [DB-01 task](CODEX_BACKLOG_2026_07_16.md#db-01--canonical-migration-replay-and-rls-evidence).

### Security, Auth and Storage

- Implemented trust boundary: [Architecture](architecture.md#request-and-trust-boundaries).
- Pre-activation checks: [QA Checklist](qa-checklist.md).
- Development Data API operator decision and live evidence: [Supabase Data API Containment Runbook](SUPABASE_DATA_API_CONTAINMENT_RUNBOOK_2026_07_16.md). The isolated rehearsal owner path is executed and evidenced; development remains a separate draft that is not apply-ready.
- Historical foundations such as `AUTH_*`, `RLS_*`, `SECURE_FILE_STORAGE_*` and `SUPABASE_*` describe intended or prior work. They do not prove active Auth, RLS, Storage or pilot readiness.

### Delivery and governance

- Current ordering and holds: [Roadmap](roadmap.md).
- Current residual tasks: [Codex Backlog](CODEX_BACKLOG_2026_07_16.md).
- Independent reviewer approvals are not required in the current phase. Objective evidence gates remain mandatory.
- Dated `CURRENT_RELEASE_STATE_*`, `CHECKPOINT_*`, `*_CHANGE_REQUEST` and `*_QA_CHECKLIST` files are preserved as release/change evidence and must not be read as the latest state unless this index explicitly links them.
- Confluence IA evidence is recorded in the [Full System Audit](FULL_SYSTEM_AUDIT_2026_07_16.md#s2--governance-and-maintainability): 253 unique descendants plus Hub, maximum hierarchy depth eight, no demonstrated root islands/orphans, known numbering collisions/stubs and two Hub label/target mismatches.

## Documentation lifecycle

| Class | Rule |
| --- | --- |
| Active authority | Has an explicit `Status` and `Last verified`; is listed in **Start here**; must be updated in the same change as affected behavior |
| Release/control evidence | May retain historical SHAs, deployment IDs and decisions; must identify its released or superseded scope |
| Historical snapshot | Immutable point-in-time evidence; current navigation must point to its successor |
| Draft/target | Must say that it is not implemented and must never be used as runtime evidence |

Every change that affects release facts, APIs, trust boundaries, sources, activation or operator workflow must update this index or prove that no navigation/current-truth change is needed. `npm run test:documentation-current-truth` enforces the core cross-document invariants; semantic review is still required.

The generated lifecycle baseline and counts live in [DOCUMENT_LIFECYCLE_MANIFEST.json](DOCUMENT_LIFECYCLE_MANIFEST.json); the [clickable archive sidecar](DOCUMENT_ARCHIVE_INDEX.md) gives every file its recorded lifecycle and successor without modifying historical evidence. Counts are generated and must not become a hand-maintained contract. The earlier manual “80 files without lifecycle language” count is superseded. DOCS-01 remains open for Confluence historical-page lifecycle/IA cleanup.
