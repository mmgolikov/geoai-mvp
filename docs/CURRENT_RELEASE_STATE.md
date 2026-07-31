# GeoAI Current Release State

Status: Active derived release authority — PR #120 HOLD  
Last verified: 2026-07-31 23:00 UTC pre-correction source audit  
Owner: GeoAI Release Engineering  
Authority: Live external systems determine operational truth. This document is a concise derived index and cannot replace fresh GitHub, Vercel, Supabase, Figma, Confluence or Google Drive evidence.  
Successor: None — fresher primary evidence supersedes this file until it is refreshed.

Repository lifecycle policy: [`RELEASE_AUTHORITY_POLICY.json`](RELEASE_AUTHORITY_POLICY.json)  
Historical/derived snapshot: [`LAST_VERIFIED_RELEASE_SNAPSHOT.json`](LAST_VERIFIED_RELEASE_SNAPSHOT.json)  
Machine-readable index: [`GEOAI_PROJECT_REGISTRY_V1.json`](GEOAI_PROJECT_REGISTRY_V1.json)

## Executive status

GeoAI Production is a **public demo prototype**. It is not a protected/confidential pilot, official-source service, production-ready or pilot-ready decision system.

| Item | Current verified state |
|---|---|
| Repository | `mmgolikov/geoai-mvp` |
| Released source | `main` and `release/production` at `7f323c4227f2409f3fe2d4d68be48a30176f4e2a` |
| Released pull request | #113, merged |
| Release Quality Gate | `30157607614` — SUCCESS |
| Production deployment | `dpl_4yBHCo1eZ7N6GYQWGAg1EdQGwFTE` |
| Production state / alias | READY / `geoai-mvp.vercel.app` |
| Registered rollback point | `dpl_5JeKmSRVNTuHsLTRjfVdwTvH9Jbi` |
| PR #120 source parent | `e255a94450e3fe359a3cd0ad2050107f6d851bb5`; Draft / HOLD |
| Parent-only checks | `30665626588` and `30665626676` — SUCCESS, but not post-correction evidence |
| PR #120 Preview at parent | `dpl_2zJYuUiMLf6Dn264stqysiikDxKA` — READY Preview, not Production |

## Active candidates — not Production

| Workstream | Branch / exact evidence | Verified boundary |
|---|---|---|
| DLD controlled ingestion foundation v1 | PR #118; `agent/dld-controlled-ingestion-foundation-v1`; head `3c27d97a87b1d8fda7c1aeee543ea594dbfcd00d` | Draft/Preview foundation. Zero DLD payload rows; no official/live integration or scoring activation. |
| Rosimushchestvo Moscow M0 | `pilot/rosimushchestvo-moscow-v1`; head `bd90887c8de10b5ffa85ed6b8adfa1d93f70d316` | Documentation-only M0 authority. |
| Rosimushchestvo Moscow implementation prototype | `pilot/rosimushchestvo-moscow-v1-dev`; head `722e5166f37168ddaa8ccb7bf83bfcb6c9681b4e`; ahead 2 / behind 0 from M0; Preview `dpl_DNqStSdLGqt5FiK6ZJXAGY4t19Gm` READY | Separate prototype stream; Preview only; unmerged; not Production, official, customer-approved or pilot-ready. |
| Control Plane and Audit Acceleration v1 | PR #120; `ops/geoai-control-plane-v1` | Documentation, registry and internal read-only validation only; Draft / HOLD. |

## Data foundation — `geoai-dev`

- project ref: `pphdqkurxneyagvnnjdt`;
- region/status: `eu-west-1` / `ACTIVE_HEALTHY`;
- PostgreSQL: `17.6.1.141`;
- migration ledger: 12 entries; latest `20260726152858 dld_demo_http_client_v1a`;
- public base tables: 20 including `spatial_ref_sys`;
- source-registry snapshot rows: 5;
- external-data snapshot rows: 5;
- confirmed Auth users: 0.

DLD foundation:

- seven tables across `geoai_dld_feature` and `geoai_dld_private`;
- exact zero payload rows;
- RLS enabled on all seven;
- zero policies on every table;
- no official/live integration.

This is fail-closed development metadata/schema readiness. It does not prove access rights, source custody, ingestion, lineage, quality acceptance, scoring activation or pilot readiness.

Open security decision: `public.spatial_ref_sys` has RLS disabled according to the Supabase advisor/catalog read. No remediation is authorised by this task.

## Figma design authority — read-only

Canonical file: `TAzDqOvRCw1mQGMU3Y4S9H`.

Verified authority allow-list:

- `1797:2` — executable Start Here;
- `1482:2` — executable prototype;
- `1749:21157` — runtime alignment;
- `1819:11` — accessibility correction receipt;
- `1825:11` — Product System correction receipt.

Nodes `1670:2` and `1673:2` are absent and are not authorities.

Current metric definitions:

- **68 prototype screens:** direct child frames under `1482:2` named `Prototype /...`; non-screen frames `1482:3` and `1492:2` excluded;
- **35 component sets / 368 variants:** all component sets/components on canonical Product Design System page `68:3`;
- **114 authored reactions:** reactions under `1482:2` excluding instance-expanded IDs beginning with `I`.

Figma intent is not runtime implementation evidence.

## Confluence and Google Drive

Confluence direct current-page version/body is authoritative for decisions and operational narrative. Rovo search snippets are discovery-only and may lag after page updates.

Google Drive folder `1WarJNNQN7kRS3m73bpsHHXOx2pE-9_hO` contains two uncontrolled PDFs and an Archive. Seven Archive category folders were directly verified empty. Drive is supporting storage only; no duplicate decision authority is present.

## Internal validator boundary

`scripts/geoai-control-plane-check.mjs` and the `GeoAI control-plane audit` workflow validate repository schema, boundaries and cross-file consistency. They do not query external systems, do not prove current external truth and cannot recommend or authorise merge.

A green internal result must still be followed by fresh direct read-back of:

1. GitHub;
2. Vercel;
3. Supabase;
4. Figma;
5. Confluence;
6. Google Drive.

## Data-honesty requirement

> Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.

## Protected actions

No merge, ready-for-review, auto-merge, Production action, Supabase mutation, Auth/RLS/grant/function/Storage change, secret/environment change, source activation or Figma mutation is authorised.

## Next decision

Create one atomic correction commit from exact parent `e255a944...`, obtain both new exact-head checks, complete the six-system external Truth Gate and return PR #120—still Draft/HOLD—to Founder / GeoAI Main for the merge decision.
