# GeoAI Documentation Index

Status: Active navigation authority
Last verified: 2026-08-10
Owner: GeoAI Documentation Governance
Authority: Repository navigation and lifecycle index; live authority is external post-release primary-source evidence plus direct current Confluence authority pages.
Successor: None; any replacement must update this file and the Confluence Hub through the governed documentation process.

Operational dashboard: [Confluence Project Hub](https://geoaimvp.atlassian.net/wiki/spaces/PH/overview)  
Current release: [Current Release State](CURRENT_RELEASE_STATE.md)  
Release policy: [RELEASE_AUTHORITY_POLICY.json](RELEASE_AUTHORITY_POLICY.json)  
Historical snapshot: [LAST_VERIFIED_RELEASE_SNAPSHOT.json](LAST_VERIFIED_RELEASE_SNAPSHOT.json)  
Machine registry: [GEOAI_PROJECT_REGISTRY_V1.json](GEOAI_PROJECT_REGISTRY_V1.json)

This index is the repository entry point. Exact current runtime, open-PR, database and design facts must be re-read from their primary systems before a decision. Repository snapshots and registries are derived evidence, not a replacement for external truth.

## Current baseline

| Lane | State |
|---|---|
| Released public demo | `main` `7f323c4227f2409f3fe2d4d68be48a30176f4e2a`, merged PR #113 |
| Vercel Production | `dpl_4yBHCo1eZ7N6GYQWGAg1EdQGwFTE`, READY, exact released SHA |
| Control plane | PR #120 Draft/HOLD; weekly docs refresh in review branch; exact-head CI required after patch |
| DLD candidate | PR #118 Draft/Preview; head `3c27d97a87b1d8fda7c1aeee543ea594dbfcd00d`; PR narrative drift remains |
| Supabase development | Management state `INACTIVE`; fresh physical read-back timed out on 2026-08-10 |
| Supabase rehearsal | Management state `ACTIVE_HEALTHY`; database/advisor state inconsistent; fresh SQL timed out |
| Design | Figma `1797:2` current Product System v3.2.2 visual baseline; Engineering/Codex gate CLOSED |
| Artifact publication | PR #84 contains source + SVG render package but remains Draft/HOLD; controlled Drive `Artifacts` folder has 0 direct files |
| Protected pilot | **NO-GO** |
| Enterprise | Target only |

## Start here

| Need | Current authority |
|---|---|
| Repository overview | [README](../README.md) |
| Release/runtime truth | [Current Release State](CURRENT_RELEASE_STATE.md) |
| Release authority policy | [Release Authority Policy](RELEASE_AUTHORITY_POLICY.json) |
| Historical last verified snapshot | [Historical Snapshot](LAST_VERIFIED_RELEASE_SNAPSHOT.json) |
| Machine-readable control plane | [Project Registry](GEOAI_PROJECT_REGISTRY_V1.json) |
| Full critical assessment | [Full System Audit — 2026-07-16](FULL_SYSTEM_AUDIT_2026_07_16.md) |
| Implemented architecture | [Architecture](architecture.md) |
| Data/source rules | [Data Strategy](data-strategy.md) |
| Delivery priorities | [Roadmap](roadmap.md) |
| Verification | [QA Checklist](qa-checklist.md) |
| Executable residual work | [Codex Backlog](CODEX_BACKLOG_2026_07_16.md) |
| Agent instructions | [AGENTS.md](../AGENTS.md) |
| Operator containment | [Supabase Data API Containment Runbook](SUPABASE_DATA_API_CONTAINMENT_RUNBOOK_2026_07_16.md) |
| Change history | [CHANGELOG](../CHANGELOG.md) |
| Document lifecycle | [Generated Lifecycle Manifest](DOCUMENT_LIFECYCLE_MANIFEST.json) |
| Historical archive navigation | [Document Archive Index](DOCUMENT_ARCHIVE_INDEX.md) |
| Confluence synchronization | [CONFLUENCE_SYNC_MAP.json](CONFLUENCE_SYNC_MAP.json) |

## Control-plane and Confluence authorities

Canonical operational navigation is Confluence Project Home `98509`, Current Delivery State `2097153`, Governance `294937`, Agent Operating Mode `786457`, Change Log `98732`, Artifact Master Register `1343521` and Control Plane CR `22052867`.

The repository validator checks schema and cross-file consistency only. It does not query live GitHub/Vercel/Supabase/Figma/Confluence/Drive and cannot authorize merge or Production action.

## Documentation lifecycle rule

1. Primary operational truth comes from the primary system and direct current Confluence authority pages.
2. Active repository documents summarize that truth for engineering use.
3. `LAST_VERIFIED_RELEASE_SNAPSHOT.json` is always historical evidence, even when freshly generated.
4. Generated registries never become current operational authority by being committed.
5. Historical versioned documents remain evidence and must point to a current successor when operationally dangerous.
6. Independent reviewer approvals are not required in the current phase unless a specific artifact/release gate explicitly requires them; the old independent-review prerequisite is historical exact-hash evidence, not a universal current workflow rule.

## Artifact navigation

Repository source-artifact inventory: [Artifacts README](artifacts/README.md). The PR #84 render package remains review evidence only until exact source/version mapping, named acceptance and controlled publication are recorded. Drive presence alone does not promote artifact authority.

Use [Current Release State — Figma design authority](CURRENT_RELEASE_STATE.md#figma-design-authority--read-only) for the current bounded Figma read-only summary. Do not infer runtime implementation from Figma metadata.

## Maturity boundaries

- **Public demo:** released and externally reachable; sample/open/browser-local boundaries remain.
- **Preview:** isolated review deployment; not Production.
- **MVP:** coherent governed Product/technical foundation with known protected-control gaps.
- **Protected pilot:** NO-GO until identity, authorization, data, Storage, recovery and accepted source evidence are proven.
- **Enterprise:** target maturity only.

## Data-honesty requirement

> Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.

## Protected actions

This documentation authority does not authorize merge/close, Production deployment/promotion/rollback, Supabase migration or data mutation, Auth hard enforcement, grants/policies/functions/Storage changes, secrets/env changes, source activation or Figma mutation.
