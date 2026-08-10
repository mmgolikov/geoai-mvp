# GeoAI Current Release State

Status: Active derived release authority — PR #120 HOLD  
Last verified: 2026-08-10
Owner: GeoAI Release Engineering  
Authority: Live authority is external post-release primary-source evidence. This document is a concise derived index and cannot replace fresh GitHub, Vercel, Supabase, Figma, Confluence or Google Drive read-back.  
Successor: None — fresher primary evidence supersedes this file until it is refreshed.

Repository lifecycle policy: [`RELEASE_AUTHORITY_POLICY.json`](RELEASE_AUTHORITY_POLICY.json)  
Historical/derived snapshot: [`LAST_VERIFIED_RELEASE_SNAPSHOT.json`](LAST_VERIFIED_RELEASE_SNAPSHOT.json)  
Machine-readable index: [`GEOAI_PROJECT_REGISTRY_V1.json`](GEOAI_PROJECT_REGISTRY_V1.json)

## Executive status

GeoAI Production remains a **released public demo prototype**. It is not a protected/confidential pilot, official-source service, production-ready or pilot-ready decision system.

| Item | Verified state — 2026-08-10 |
|---|---|
| Repository | `mmgolikov/geoai-mvp` |
| Released source | `main` at `7f323c4227f2409f3fe2d4d68be48a30176f4e2a` |
| Released pull request | #113, merged |
| Production deployment | `dpl_4yBHCo1eZ7N6GYQWGAg1EdQGwFTE` |
| Production state / alias | READY / `geoai-mvp.vercel.app` |
| Production source SHA | `7f323c4227f2409f3fe2d4d68be48a30176f4e2a`, exact match to `main` |
| Runtime errors | No Vercel runtime errors returned for the checked 7-day interval |
| Control-plane candidate | PR #120, Draft / HOLD; pre-audit head `34b818ad0a6cd867c3b3f4627c17ee1f03f82e31` |
| Pre-audit PR #120 checks | Control Plane Audit `30673892088` SUCCESS; Quality Gate `30673892071` FAILURE |
| Quality failure scope | Documentation current-truth only; database replay job was SUCCESS |
| PR #120 Preview | `dpl_3Q3pUZuNs4Ky2m2t42JJqAoPfuHG`, READY Preview on pre-audit head |

## Active candidates — not Production

| Workstream | Exact evidence | Boundary |
|---|---|---|
| DLD controlled ingestion foundation v1 | PR #118; branch `agent/dld-controlled-ingestion-foundation-v1`; head `3c27d97a87b1d8fda7c1aeee543ea594dbfcd00d` | Draft/Preview foundation; PR narrative contains older-head drift; no accepted source/evidence/scoring activation. |
| Rosimushchestvo Moscow prototype v1 | `pilot/rosimushchestvo-moscow-v1-dev`; head `722e5166f37168ddaa8ccb7bf83bfcb6c9681b4e`; Preview `dpl_DNqStSdLGqt5FiK6ZJXAGY4t19Gm` READY | Separate Preview-only prototype; unmerged; not Production or pilot-ready. |
| Rosimushchestvo Federal v2 prototype | `pilot/rosimushchestvo-federal-v2-dev`; head `a9ac367b556a6127a138c02793b33e2b97972ff9`; Preview `dpl_9YtXAAQGQGr1WVWw1nT8fH5QPt7k` READY | Separate Preview-only prototype; not Production, official or pilot-ready. |
| Architecture rendering package | PR #84; branch `dev7-architecture-rendering-exact-mapping-v1`; head `ace74cd1e0ab4736e8560c730267a43d43134aa7` | Draft/HOLD; committed source + SVG render package exists, but named current-main acceptance/publication is not proven. |
| Control Plane and Audit Acceleration v1 | PR #120; branch `ops/geoai-control-plane-v1` | Documentation, derived registry and internal consistency checks only; Draft/HOLD. |

## Production runtime

Vercel directly reports Production `dpl_4yBHCo1eZ7N6GYQWGAg1EdQGwFTE` as READY on `main` SHA `7f323c4227f2409f3fe2d4d68be48a30176f4e2a`. The canonical alias remains `https://geoai-mvp.vercel.app`. The checked seven-day runtime-error query returned no errors. Production health/status endpoints were reachable during this audit.

This is public-demo runtime evidence only. It does not prove protected Auth, tenant isolation, Storage custody, official source execution, confidential-pilot readiness or enterprise operation.

## Supabase state — current management plane and physical-readback limitation

### Development — `pphdqkurxneyagvnnjdt`

Current Supabase project metadata reports:

- project: `geoai-dev`;
- region: `eu-west-1`;
- status: **INACTIVE**;
- PostgreSQL version metadata: `17.6.1.141`.

Two fresh read-only SQL attempts in this weekly audit terminated on connection timeout. Fresh migration-ledger, schema, RLS/policy, grant, source-row, payload-count, Storage-object and Auth-user read-back therefore **did not complete**.

The last successful physical audit remains historical evidence only: 12 migrations, latest `20260726152858 dld_demo_http_client_v1a`, five source-registry snapshots, five external-data snapshots, seven DLD foundation tables and zero DLD payload rows. These historical counts are not promoted to current physical truth while the project is inactive/unreachable.

### Auth rehearsal — `bkmfcjzalcvdsdvyxpgi`

Management metadata reports `ACTIVE_HEALTHY`, while the security-advisor endpoint reported the project as hibernated and a read-only SQL attempt timed out. This management/database-plane inconsistency keeps fresh physical verification open. No wake, migration, grant/policy, Auth, Storage or data mutation was performed.

**Protected pilot remains NO-GO until current physical database evidence is available and accepted.**

## Figma design authority — read-only

Canonical file: `TAzDqOvRCw1mQGMU3Y4S9H`.

Fresh direct metadata verification succeeded for `1797:2` and affected visual node `1495:53`:

- `1797:2` — Product System v3.2.2 Candidate; founder-approved visual baseline; Engineering/Codex gate remains CLOSED;
- `1495:53` — `Hero / GeoAI cockpit v1.9 / label-safe / product-primary teal`; sample/open evidence wording is present.

`1797:2` also contains references to receipts `1819:11` and `1825:11`. Independent direct metadata responses for all requested authority nodes were not consistently returned by the connector in this run, so this audit does not claim a fresh six-node independent read-back.

Figma intent and founder visual approval are not runtime implementation, merge or release evidence.

## Google Drive supporting storage

Direct Drive read-back found GeoAI root `1WarJNNQN7kRS3m73bpsHHXOx2pE-9_hO` with:

- three direct files: two architecture/design PDFs plus `GeoAI Investor & Client Intake v1.0 (2026-07-08).docx`;
- eight direct child folders: Archive, Artifacts, Design Exports, Documents, Exports & Reports, QA Evidence, External Datasets and GeoAI Telegram Channel;
- `Artifacts` folder `1Gfglggg6NgJyGEdo7hFZsSDuT-a2OJ3Z`: **0 direct files**.

Drive remains supporting non-canonical storage. No accepted current rendered BPMN/UML/C4/ERD/wireflow/data-lineage publication package is proven there.

## Artifact state

PR #84 contains committed PlantUML/source and SVG render artifacts and therefore proves that a rendered package exists in GitHub review history. It remains Draft/HOLD and is not accepted as current architecture authority because current-main mapping, named independent review and controlled publication are still open. The controlled Drive `Artifacts` folder remains empty.

## Internal validator boundary

`scripts/geoai-control-plane-check.mjs` validates repository schema, boundary and cross-file consistency. It does not query live external systems, prove current external truth or authorize merge.

The pre-audit exact-head Control Plane Audit `30673892088` passed. Quality Gate `30673892071` failed only at `Documentation current-truth checks`; its database replay job passed. The four recorded documentation failures were:

1. broken local anchor in `DOCUMENTATION_INDEX.md`;
2. active release state not expressed with the required verification-date format;
3. historical snapshot label not equal to the required historical label;
4. missing explicit external current-runtime authority phrase.

This weekly patch corrects those documentation defects and refreshes current primary-source evidence. New exact-head CI after the patch remains required evidence.

## Current maturity boundaries

| State | Status |
|---|---|
| Public demo | **RELEASED** |
| Preview candidates | Active, separate, not Production |
| MVP | Coherent Product and governed foundations; protected controls incomplete |
| Protected/confidential pilot | **NO-GO** |
| Enterprise | Target only |

## Data-honesty requirement

> Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.

## Protected actions

No merge, PR close, ready-for-review, auto-merge, Production deployment/promotion/rollback, Supabase migration/data mutation, Auth hard enforcement, grant/policy/function/Storage mutation, secret/environment change, source activation or Figma mutation is authorised by this audit.

## Next decision

Keep PR #120 Draft/HOLD. Obtain new exact-head Control Plane Audit and Quality Gate after this docs-only refresh. The six-system Truth Gate remains **partial** because fresh Supabase physical read-back is unavailable; Founder merge review must not treat the registry or green internal CI as a substitute for that missing external evidence.
