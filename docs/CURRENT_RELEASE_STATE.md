# GeoAI Current Release State

Status: Active release guidance / review patch  
Last verified from primary sources: 2026-08-17  
Owner: GeoAI Release Engineering / Governance  
Operational dashboard: [Confluence Project Hub](https://geoaimvp.atlassian.net/wiki/spaces/PH/overview)  
Weekly evidence: [Confluence 09.23 Weekly Governance, Source and Release Audit — 2026-08-17](https://geoaimvp.atlassian.net/wiki/spaces/PH/pages/25722881)

## Executive state

**PUBLIC DEMO RELEASED / ACTIVE PREVIEW CANDIDATE / PROTECTED PILOT NO-GO / ENTERPRISE NOT CLAIMED.**

The released Production tuple is unchanged from PR #113. Draft PR #143 is the primary active product candidate, but it is not released and has no Production or implementation approval. Draft PR #120 remains the control-plane candidate and is HOLD because its internal control-plane audit is green while its Quality Gate is red. Current protected-pilot evidence remains incomplete.

## Released baseline

| Item | Verified state |
| --- | --- |
| GitHub default branch | `main` |
| Released `main` SHA | `7f323c4227f2409f3fe2d4d68be48a30176f4e2a` |
| Released PR | [#113](https://github.com/mmgolikov/geoai-mvp/pull/113) |
| Vercel Production deployment | `dpl_4yBHCo1eZ7N6GYQWGAg1EdQGwFTE` |
| Vercel Production state | `READY` |
| Production alias | `https://geoai-mvp.vercel.app` |
| Product stage | Public-demo prototype |
| Protected pilot | **NO-GO** |
| Enterprise readiness | Not claimed |

No merge, Production promotion/rollback, migration, source activation, secret/env change, Auth/RLS/Storage mutation or Figma mutation was performed by the 2026-08-17 audit.

## Active candidate matrix

| Candidate | Exact head | Primary evidence | Release decision |
| --- | --- | --- | --- |
| PR [#143](https://github.com/mmgolikov/geoai-mvp/pull/143) — GCC Real Estate Decision Platform v1 | `e3932d2e41e81fce23bbf3f244e0d70f35e5c5f9` | Quality Gate SUCCESS; Vercel Preview `dpl_83h85HSTCeRxRxjSmMxUQDGhzGWX` READY | **DRAFT / HOLD / NOT RELEASED** |
| PR [#120](https://github.com/mmgolikov/geoai-mvp/pull/120) — Control Plane | `5d2b330976198a815f27f72ef9047dd730b7b8d0` | Control Plane Audit `31359774451` SUCCESS; Quality Gate `31359774457` FAILURE | **DRAFT / HOLD** |
| PR [#118](https://github.com/mmgolikov/geoai-mvp/pull/118) — DLD path | `3c27d97a87b1d8fda7c1aeee543ea594dbfcd00d` | Open Draft; PR narrative still cites older final head | **HOLD** pending rights/custody and documentation reconciliation |
| PR [#84](https://github.com/mmgolikov/geoai-mvp/pull/84) — architecture renders | `ace74cd1e0ab4736e8560c730267a43d43134aa7` | Source + SVG draft package | **DRAFT / HOLD** pending publication and formal artifact review |

PR #143 enables UAE only as the screening market. KSA, Qatar and Oman are metadata/readiness context, not enabled validated markets.

## Runtime boundary

Production is a public-demo runtime. The audit found no relevant Vercel runtime errors in the reviewed seven-day window. Production readiness, protected-pilot readiness and enterprise security are separate states and must not be inferred from Vercel `READY` or public-demo availability.

## Supabase boundary

Fresh management-plane reads on 2026-08-17 returned:

- development `pphdqkurxneyagvnnjdt` (`geoai-dev`): `INACTIVE`;
- rehearsal `bkmfcjzalcvdsdvyxpgi` (`geoai-auth-rehearsal`): `ACTIVE_HEALTHY`.

Migration-ledger and physical-schema read-back did not complete reliably during the audit. Security-advisor output from inactive/waking projects is not accepted as evidence of a clean posture. Historical migration, RLS, grant or Storage counts must not be presented as current physical truth until a fresh read-back succeeds.

No Supabase project wake-up, migration, mutation, grant/policy/function change, Auth change or Storage change was performed.

## Design boundary

Figma file `TAzDqOvRCw1mQGMU3Y4S9H` node `1797:2` remains the founder-approved Product System v3.2.2 **visual** baseline and explicitly keeps Engineering/Codex implementation closed. GCC candidate node `1956:11` is candidate-only and is not released design authority.

The GCC candidate contains numeric source/readiness/custody UI. Those numbers are illustrative/candidate content until reconciled to verified source-state evidence and must not be treated as runtime facts.

## Source and artifact boundary

DLD rights/custody remain unresolved in PR #118. Source/readiness views in PR #143/Figma are not proof of official source activation or legal custody.

The governed Google Drive `Artifacts` folder was directly listed on 2026-08-17 and is empty. GitHub source artifacts and PR #84 draft renders therefore do not yet constitute a published, reviewed rendered artifact package.

## Control-plane boundary

The PR #120 validator enforces internal repository consistency, the mandatory caveat, registered external-system identifiers, candidate-not-production rules and protected-action flags. It explicitly does **not** query live external systems and does **not** prove external truth. External receipts from GitHub, Vercel, Supabase, Figma, Confluence and Google Drive remain required.

## Protected-pilot gates still open

Protected-pilot status remains **NO-GO** until current evidence closes Auth/session/tenant enforcement, RLS/policy/grant state, Storage custody and policies, source rights/custody/activation, controlled source-state evidence, and reviewed artifact publication. Public-demo success is not evidence that these gates are closed.

## Required caveat

**Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.**

## Change log

| Date | Change |
| --- | --- |
| 2026-08-17 | Reconciled released PR #113 baseline, PR #143 active candidate, PR #120 control-plane state, current Supabase observability boundary, Figma authority/candidate distinction and Google Drive artifact publication gap. |
