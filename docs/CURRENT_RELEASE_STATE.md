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
| Main branch protection | **Disabled**; no required status checks enforced at branch-protection level |
| Production deployment | `dpl_4yBHCo1eZ7N6GYQWGAg1EdQGwFTE` |
| Production state / alias | READY / `geoai-mvp.vercel.app` |
| Production source SHA | `7f323c4227f2409f3fe2d4d68be48a30176f4e2a`, exact match to `main` |
| Runtime errors | No Vercel runtime errors returned for the checked 7-day interval |
| Control-plane pre-patch evidence | PR #120, Draft / HOLD; verified head `a95b9d14dfce8b1d524ee4608ea552411a3966df` |
| Pre-patch PR #120 Control Plane Audit | `31354904116` — FAILURE at dependency-free internal consistency check |
| Pre-patch PR #120 Quality Gate | `31354904093` — FAILURE at Production dependency audit; Supabase replay/persona job SUCCESS |
| Pre-patch PR #120 Preview | `dpl_8E5gcHmcXaaBAg5mtsLSQZRKWBTm`, READY Preview on `a95b9d14dfce8b1d524ee4608ea552411a3966df` |
| Post-patch evidence | This documentation correction creates a new candidate head; new exact-head CI and Preview receipts are required before any review decision |

## Production runtime

Vercel directly reports Production `dpl_4yBHCo1eZ7N6GYQWGAg1EdQGwFTE` as READY on `main` SHA `7f323c4227f2409f3fe2d4d68be48a30176f4e2a`. The canonical alias remains `https://geoai-mvp.vercel.app`. The checked seven-day runtime-error query returned no errors.

This is public-demo runtime evidence only. It does not prove protected Auth, tenant isolation, Storage custody, official source execution, confidential-pilot readiness or enterprise operation.

## Active candidates — not Production

| Workstream | Exact evidence | Boundary |
|---|---|---|
| DLD controlled ingestion foundation v1 | PR #118; branch `agent/dld-controlled-ingestion-foundation-v1`; head `3c27d97a87b1d8fda7c1aeee543ea594dbfcd00d` | Draft foundation; PR narrative contains older-head drift; no accepted source/evidence/scoring activation. |
| Rosimushchestvo Moscow prototype v1 | `pilot/rosimushchestvo-moscow-v1-dev`; head `722e5166f37168ddaa8ccb7bf83bfcb6c9681b4e`; Preview `dpl_DNqStSdLGqt5FiK6ZJXAGY4t19Gm` READY | Separate Preview-only prototype; unmerged; not Production or pilot-ready. |
| Rosimushchestvo Federal v2 prototype | `pilot/rosimushchestvo-federal-v2-dev`; head `a9ac367b556a6127a138c02793b33e2b97972ff9`; Preview `dpl_9YtXAAQGQGr1WVWw1nT8fH5QPt7k` READY | Separate Preview-only prototype; not Production, official or pilot-ready. |
| Architecture rendering package | PR #84; branch `dev7-architecture-rendering-exact-mapping-v1`; head `ace74cd1e0ab4736e8560c730267a43d43134aa7` | Draft/HOLD; committed source + SVG render package exists, but named current-main acceptance/publication is not proven. |
| Control Plane and Audit Acceleration v1 | PR #120; branch `ops/geoai-control-plane-v1` | Documentation, derived registry and internal consistency only; Draft/HOLD. |

## PR #120 exact-head gate status before this patch

The verified pre-patch head `a95b9d14dfce8b1d524ee4608ea552411a3966df` is not releasable evidence:

- Control Plane Audit `31354904116` failed at the dependency-free internal consistency check. External Truth Gate and lifecycle sidecar steps were skipped.
- Quality Gate `31354904093` failed at `Production dependency audit`. The database clean replay, deterministic reset, synthetic upgrade rehearsal and persona tests passed.
- The dependency audit reported one **moderate** Next.js advisory, `GHSA-ggv3-7p47-pfv8`. Dependency remediation is not authorised by this documentation audit.
- Because the static job stopped at dependency audit, TypeScript/access/security/data-honesty/documentation/build/runtime/browser stages did not execute on that exact head.

The internal control-plane validator checks repository schema, boundary and cross-file consistency. It does **not** query live external systems, prove external truth or authorise merge.

## Supabase state — current management plane and physical-readback limitation

### Development — `pphdqkurxneyagvnnjdt`

Current Supabase project metadata reports `geoai-dev`, region `eu-west-1`, status **INACTIVE**, PostgreSQL metadata `17.6.1.141`. Fresh read-only SQL did not complete, so current migration/schema/RLS/policy/grant/source/payload/Storage/Auth physical truth cannot be certified in this audit.

The last successful physical audit remains historical evidence only: migration count **12**, latest migration **`20260726152858`**, source-registry count **5**, external-snapshot count **5**, Supabase Auth user count **0**, seven DLD foundation tables, **zero payload rows**, RLS enabled on those seven tables and **zero policies**. These historical values are retained solely for cross-file consistency and are not promoted to current physical truth while fresh read-back is unavailable.

### Auth rehearsal — `bkmfcjzalcvdsdvyxpgi`

Management metadata reports `ACTIVE_HEALTHY`, while the security-advisor endpoint reported the project as hibernated and read-only SQL did not complete. This management/database-plane inconsistency remains unresolved. No wake, migration, grant/policy, Auth, Storage or data mutation was performed.

**Protected pilot remains NO-GO until current physical database evidence is available and accepted.**

## Figma design authority — read-only

Canonical file: `TAzDqOvRCw1mQGMU3Y4S9H`.

Fresh direct metadata verification confirmed node `1797:2` as the Product System v3.2.2 Candidate / founder-approved visual baseline with Engineering/Codex gate CLOSED. The historical authority allow-list remains `1797:2`, `1482:2`, `1749:21157`, `1819:11`, `1825:11`; this audit does not claim a complete independent node-by-node read-back where the connector did not return a fresh response.

Figma intent and founder visual approval are not runtime implementation, merge or release evidence.

## Google Drive supporting storage

Direct read-back of GeoAI root `1WarJNNQN7kRS3m73bpsHHXOx2pE-9_hO` returned exactly five direct children:

- folder `Telegram`;
- file `00_Карта источников.md`;
- file `GeoAI_Dubai_Investor_Deck_v5_final (1).pdf`;
- file `GeoAI.pdf`;
- folder `Archive`.

Therefore the fresh root count is **3 direct files and 2 direct child folders**, not the previous derived value of eight folders. Historical `Artifacts` folder `1Gfglggg6NgJyGEdo7hFZsSDuT-a2OJ3Z` contains **0 direct files**.

Drive remains supporting non-canonical storage. No accepted current rendered BPMN/UML/C4/ERD/wireflow/data-lineage publication package is proven there.

## Artifact state

PR #84 proves that committed source and SVG renders exist in GitHub review history. It remains Draft/HOLD and is not accepted as current architecture authority because current-main mapping, named independent review and controlled publication are open. The historical Drive `Artifacts` folder is empty.

## Repository governance boundary

The GitHub API reports `main` with `protected: false`, protection disabled and no required status checks enforced at the branch-protection level. This is a release-governance risk, not an authorisation to change repository settings.

## Current maturity boundaries

| State | Status |
|---|---|
| Public demo | **RELEASED** |
| Preview candidates | Active, separate, not Production |
| MVP | Coherent product and governed foundations; protected controls incomplete |
| Protected/confidential pilot | **NO-GO** |
| Enterprise | Target only |

## Data-honesty requirement

> Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.

## Protected actions

No merge, PR close, ready-for-review, auto-merge, Production deployment/promotion/rollback, Supabase migration/data mutation, Auth hard enforcement, grant/policy/function/Storage mutation, secret/environment change, source activation or Figma mutation is authorised by this audit.

## Next decision

Keep PR #120 Draft/HOLD. Re-run exact-head Control Plane Audit and Quality Gate for the new documentation-patch head. The six-system Truth Gate remains **partial** because fresh Supabase physical read-back is unavailable. Founder merge review must not treat a derived registry or green internal CI as a substitute for missing external evidence.
