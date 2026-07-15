# Architecture Pre-review Findings v1

Package: CR-DEV7-003

Candidate state: Pre-review corrections applied; exact-head revalidation pending; independent review not started

Authority boundary: This record is a Codex pre-review quality control. It is not an independent reviewer decision, architecture approval, publication approval, merge authorization or Production authorization.

## Findings register

| ID | Review lens | Finding | Severity | Candidate disposition |
|---|---|---|---|---|
| PRF-001 | Engineering / deployment | DEP-001 visually attributed PR Preview deployment/verification to GitHub Actions although the workflow has no deploy step and Vercel Git integration owns deployment | High | Corrected in DEP-001; exact-head render, CI and Preview evidence must be regenerated |
| PRF-002 | Data / schema | ERD-001 represented `profiles.id` as an Auth FK, added a non-existent `profiles.organization_id`, reversed the analysis-run/decision-score link and used inaccurate AOI/audit field names | High | Corrected against migration source; exact-head render and CI evidence must be regenerated |
| PRF-003 | Security/backend / data | Repeated `create table if not exists` declarations mean migration source presence and table-name readiness do not prove fresh ordered-chain applicability or live applied columns/constraints | High | Open; direct applied-schema verification and any additive reconciliation migration are outside this documentation-only CR |
| PRF-004 | Architecture notation | C4 diagrams used generic PlantUML shapes without explicit C4 semantics | Medium | Corrected with Person, Software System, Container and Component stereotypes; named notation review remains required |
| PRF-005 | BPMN notation | BPMN-001 is a BPMN-aligned activity rendering, not BPMN 2.0 XML | Medium | Explicit limitation retained; reviewer must accept bounded notation or request a separate BPMN XML artifact |
| PRF-006 | Governance | Five required roles are registered, but no named people or GitHub usernames are present in controlled records | Blocking | Open; do not invent or self-assign independent reviewers |
| PRF-007 | Documentation control | Initial manifest reset all artifact versions to v1.0 despite higher controlled predecessor versions | High | Corrected: C4-001/002 v1.4; BPMN/STATE/SEQ/ERD v1.5; DATA-LINEAGE v1.6; new 0.6 groups advance to v1.0; version is enforced in source/render |

## Artifact coverage

The pre-review inspected C4-001, C4-002, C4-003, BPMN-001, STATE-001, SEQ-001, ERD-001, DATA-LINEAGE-001, ACT-001, DEP-001 and API-001 against the implementation map, trace matrix, repository source and exact-head CI/Preview evidence.

## Required next actions

1. Re-render all changed PlantUML sources and refresh source/render digests.
2. Run the permanent architecture, Spatial B2A, lint, build, API, data-honesty and route gates on the corrected exact head.
3. Inspect a same-SHA Vercel Preview and deployment-scoped warning/error/fatal, 4xx and 5xx logs.
4. Assign real people to Product architecture, Engineering, Data/GIS, Security/backend and Documentation control.
5. Record each decision and findings disposition before publication, merge or artifact-state promotion.

Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.
