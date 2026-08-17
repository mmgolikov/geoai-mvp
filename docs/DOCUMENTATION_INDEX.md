# GeoAI Documentation Index

Status: Active documentation authority
Last verified: 2026-08-16
Owner: GeoAI Documentation Governance
Authority: Navigation, precedence and lifecycle for repository documentation
Successor: None; a replacement must update `DOCUMENT_LIFECYCLE_MANIFEST.json`

## Use This Order

1. Read [Current Release State](CURRENT_RELEASE_STATE.md) for released runtime and candidate boundaries.
2. Read [AGENTS.md](../AGENTS.md) for operating rules.
3. Read the released/current authorities and the separately labelled candidate controls below.
4. Use release notes, old Change Requests and receipts only as point-in-time evidence.

Live authority is external post-release GitHub, Vercel and Confluence evidence. [`RELEASE_AUTHORITY_POLICY.json`](RELEASE_AUTHORITY_POLICY.json) defines precedence; [`LAST_VERIFIED_RELEASE_SNAPSHOT.json`](LAST_VERIFIED_RELEASE_SNAPSHOT.json) is historical and cannot override newer direct evidence.

## Current Candidate Controls

Draft PR [#143](https://github.com/mmgolikov/geoai-mvp/pull/143) is the bounded GCC real-estate candidate. It is not merged or released.

Every file in this table has lifecycle `candidate_control`. Candidate controls may govern work on the draft branch, but they are not released/current authority and cannot override `CURRENT_RELEASE_STATE.md` before merge, owner acceptance and an explicit release-state update.

| Question | Current authority |
| --- | --- |
| What is changing? | [CR - GCC Real Estate Decision Platform v1](CR_GCC_REAL_ESTATE_DECISION_PLATFORM_V1.md) |
| Which markets and decisions? | [GCC Real Estate Product and Market Strategy](GCC_REAL_ESTATE_PRODUCT_AND_MARKET_STRATEGY_V1.md) |
| What evidence supports the strategy? | [GCC Real Estate Market Research](GCC_REAL_ESTATE_MARKET_RESEARCH_2026_08.md) |
| Which Figma nodes are candidate authority? | [Figma GCC Real Estate Authority](FIGMA_GCC_REAL_ESTATE_AUTHORITY_V1.md) |
| What must pass? | [GCC Real Estate Transformation QA Checklist](GCC_REAL_ESTATE_TRANSFORMATION_QA_CHECKLIST.md) |
| What is the release boundary? | [Draft Release Receipt](RELEASE_GCC_REAL_ESTATE_DECISION_PLATFORM_V1.md) |

Confluence candidate control: [10.13 GCC Real Estate Decision Platform v1](https://geoaimvp.atlassian.net/wiki/spaces/PH/pages/25591809).

## Released And Current Authorities

### Product And Delivery

| Authority | Purpose |
| --- | --- |
| [README](../README.md) | Product/repository overview and local setup |
| [Changelog](../CHANGELOG.md) | Chronological release ledger |
| [Current Release State](CURRENT_RELEASE_STATE.md) | Released tuple, candidate state and blockers |
| [Roadmap](roadmap.md) | Sequenced delivery packages |

Released Figma authority remains Product System v3.2.2 at `1797:2`. Candidate page `1956:11` does not become released authority before owner acceptance.

### Architecture, Data And Security

| Authority | Purpose |
| --- | --- |
| [Architecture](architecture.md) | Implemented system boundary |
| [Data Strategy](data-strategy.md) | Source, rights, custody, ingestion and validation model |
| [Supabase Data API Containment Runbook](SUPABASE_DATA_API_CONTAINMENT_RUNBOOK_2026_07_16.md) | Fail-closed database operator procedure |

### Point-In-Time Context

The [Full System Audit](FULL_SYSTEM_AUDIT_2026_07_16.md), [Codex Backlog](CODEX_BACKLOG_2026_07_16.md) and [QA Checklist](qa-checklist.md) remain useful historical control evidence. They contain July receipts and references and therefore are not current authorities. Use the Current Release State and the candidate controls above for present decisions.

Current source presentation must distinguish raw machine states from customer labels. Internal values such as `demo_seed`, `mock_fallback` or `sample_fallback` may remain for compatibility, but fixed context presented to a user must say **Illustrative local screening context** and retain the exact caveat.

## Current External State

Read-only verification on 2026-08-16 found:

- `main@7f323c4227f2409f3fe2d4d68be48a30176f4e2a`, merged PR #113;
- Vercel Production `dpl_4yBHCo1eZ7N6GYQWGAg1EdQGwFTE`, READY at [geoai-mvp.vercel.app](https://geoai-mvp.vercel.app);
- Production Supabase not configured;
- Draft PR #143 open and not merged;
- Confluence candidate section 10.13 created without replacing released Current Delivery authority.

This does not authorize merge, Production deployment, Supabase apply/write, Auth enforcement, secrets, protected Storage or live source activation.

## Documentation Lifecycle

[`DOCUMENT_LIFECYCLE_MANIFEST.json`](DOCUMENT_LIFECYCLE_MANIFEST.json) records every Markdown document as `active_authority`, `candidate_control`, generated navigation or historical/scoped evidence. A candidate file always has `currentAuthority: false`; merely creating or committing it cannot promote it to released truth. [`DOCUMENT_ARCHIVE_INDEX.md`](DOCUMENT_ARCHIVE_INDEX.md) is legacy archive navigation, not lifecycle authority, and may lag an unmerged candidate.

Use:

```bash
npm run docs:lifecycle:generate
npm run test:document-lifecycle
npm run test:documentation-current-truth
```

Historical release notes and Change Requests remain immutable point-in-time evidence. Their claims apply only to their exact branch/SHA/environment. Candidate controls govern only their named draft branch. A newer released active authority supersedes historical evidence for current operations without deleting its evidentiary value.

## Confluence Governance

The Confluence Project Hub is the operational entry point. [`CONFLUENCE_SYNC_MAP.json`](CONFLUENCE_SYNC_MAP.json) is the historical machine mapping for the governed page set; direct current page bodies and newer candidate control pages supersede stale search snippets.

Current candidate pages:

- [10.13 Candidate Control](https://geoaimvp.atlassian.net/wiki/spaces/PH/pages/25591809)
- [10.13.1 Market and Product Strategy](https://geoaimvp.atlassian.net/wiki/spaces/PH/pages/25591835)
- [10.13.2 Product UX and Figma Authority](https://geoaimvp.atlassian.net/wiki/spaces/PH/pages/25624577)
- [10.13.3 Data, QA and Release Controls](https://geoaimvp.atlassian.net/wiki/spaces/PH/pages/25526275)

## Review And Evidence Rule

Independent reviewer approvals are not required in the current phase; objective exact-head gates and owner decisions remain authoritative. The old independent-review prerequisite is historical exact-hash evidence, not a standing merge authorization. Draft PR #143 nevertheless includes a deliberately independent critical-agent review because the owner requested an additional challenge gate.

Every release candidate must record:

- exact final SHA and changed files;
- local validation and dependency audit;
- immutable browser/report evidence;
- Quality Gate run and jobs;
- exact Preview deployment and route smoke;
- data/source rights and provenance boundary;
- remaining blockers and rollback point;
- explicit confirmation of no merge or Production action when applicable.

## Required Claim Boundary

Do not claim official parcel, official zoning, cadastral validation, ownership verification, certified valuation, approved site, guaranteed best use, live DLD integration, live GeoDubai integration, production-ready or pilot-ready status without separately approved direct evidence.

Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.
