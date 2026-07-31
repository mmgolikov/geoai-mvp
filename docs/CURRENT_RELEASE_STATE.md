# GeoAI Current Release State

Status: Active derived release authority
Last verified: 2026-07-31
Owner: GeoAI Release Engineering
Authority: External post-release evidence is the live authority; Vercel determines runtime, GitHub determines code and merge state, Supabase determines physical data state, approved Figma nodes determine design intent, and Confluence records decisions.
Successor: None — this is the active concise derived authority; fresher primary evidence supersedes its facts until this document is refreshed.

Repository lifecycle policy: [`RELEASE_AUTHORITY_POLICY.json`](RELEASE_AUTHORITY_POLICY.json)  
Historical evidence snapshot: [`LAST_VERIFIED_RELEASE_SNAPSHOT.json`](LAST_VERIFIED_RELEASE_SNAPSHOT.json)  
Machine-readable control-plane index: [`GEOAI_PROJECT_REGISTRY_V1.json`](GEOAI_PROJECT_REGISTRY_V1.json)

## Executive status

GeoAI Production is a public demo prototype. It is **not** a confidential-pilot, protected-data, official-source, production-ready or pilot-ready system.

| Item | Current verified state |
|---|---|
| GitHub repository | `mmgolikov/geoai-mvp` |
| Production branch | `main` |
| Released pull request | #113, merged |
| Production commit | `7f323c4227f2409f3fe2d4d68be48a30176f4e2a` |
| Release Quality Gate | run `30157607614`, SUCCESS; included built-app API/route smoke |
| Vercel team / project | `geoaidev` / `geoai-mvp` |
| Production deployment | `dpl_4yBHCo1eZ7N6GYQWGAg1EdQGwFTE` |
| Deployment state | READY; exact Git SHA matches `main` |
| Production alias | `geoai-mvp.vercel.app` |
| Registered rollback point | `dpl_5JeKmSRVNTuHsLTRjfVdwTvH9Jbi` |
| Recent runtime-error check | zero errors returned for the previous seven days at the 2026-07-31 audit |
| Fresh visual QA in this audit | not executed; rerun before any new release decision |

External GitHub, Vercel and Project Hub post-release evidence remains the current operational runtime authority. Repository policy, registry and snapshot files provide validated schemas, navigation and historical/derived evidence only.

## Active candidates — not Production

| Workstream | Branch / PR | Verified boundary |
|---|---|---|
| DLD controlled ingestion foundation v1 | PR #118; `agent/dld-controlled-ingestion-foundation-v1`; current head `3c27d97a87b1d8fda7c1aeee543ea594dbfcd00d` | Preview candidate. Required DLD and Quality workflows failed. Development schema/table contracts only; seven DLD tables have RLS enabled, zero policies and zero payload rows; not an official or live DLD integration. |
| Rosimushchestvo Moscow pilot v1 | `pilot/rosimushchestvo-moscow-v1`; head prefix `c735200c` | Separate Preview candidate. Not merged, not Production and not customer-approved. Sample/generated data must be labelled. |
| Control Plane and Audit Acceleration v1 | PR #120; `ops/geoai-control-plane-v1` | Documentation, registry and read-only validation only. No protected action authorised. |

## Data foundation

### `geoai-dev`

- project ref: `pphdqkurxneyagvnnjdt`;
- region/status: `eu-west-1` / `ACTIVE_HEALTHY`;
- PostgreSQL: `17.6.1.141`;
- migration ledger: 12 entries; latest `20260726152858 dld_demo_http_client_v1a`;
- preceding DLD migration: `20260726151724 dld_demo_ingestion_foundation_v1`;
- public base tables: 20;
- source-registry snapshot rows: 5;
- external-data snapshot rows: 5;
- confirmed Auth users: 0.

DLD foundation tables are present in `geoai_dld_feature` and `geoai_dld_private`:

- `area_month_metrics`, `category_metrics`, `scoring_features`;
- `areas`, `dataset_releases`, `ingestion_runs`, `sanitized_records`.

All seven have RLS enabled, zero policies and estimated zero payload rows. This means the current foundation is closed by default but has no accepted persona/policy semantics. Physical schema readiness does not prove source access, licensing, lineage, snapshot ingestion, scoring activation or official integration.

### `geoai-auth-rehearsal`

Project ref `bkmfcjzalcvdsdvyxpgi`; rehearsal-only environment; not Production authority. No identifying user data is recorded here.

### Open security decisions

- Supabase security advisor and physical catalog report RLS disabled on `public.spatial_ref_sys`.
- Seven DLD tables have RLS enabled but zero policies; explicit persona, grant and policy review is required before any access activation.

No automatic SQL remediation, migration or access change is authorised.

## Design authority — read-only verification

- Figma file: `TAzDqOvRCw1mQGMU3Y4S9H`;
- executable Start Here: `1797:2`;
- executable prototype: `1482:2`;
- runtime alignment: `1749:21157`;
- correction receipts: `1819:11`, `1825:11`;
- delivery cockpit: `1495:53`;
- component authorities: `1670:2`, `1673:2`.

Agents should read affected nodes/components rather than the complete file unless a full design audit is required.

## Documentation and control-plane authority

- machine-readable registry: [`GEOAI_PROJECT_REGISTRY_V1.json`](GEOAI_PROJECT_REGISTRY_V1.json);
- historical verified release snapshot: [`LAST_VERIFIED_RELEASE_SNAPSHOT.json`](LAST_VERIFIED_RELEASE_SNAPSHOT.json);
- release policy: [`RELEASE_AUTHORITY_POLICY.json`](RELEASE_AUTHORITY_POLICY.json);
- source/delta protocol: [`GEOAI_SOURCE_AUDIT_AND_DELTA_PROTOCOL_V1.md`](GEOAI_SOURCE_AUDIT_AND_DELTA_PROTOCOL_V1.md);
- QA/audit runbook: [`GEOAI_AUTOMATED_QA_AND_AUDIT_RUNBOOK_V1.md`](GEOAI_AUTOMATED_QA_AND_AUDIT_RUNBOOK_V1.md);
- control-plane validator: [`../scripts/geoai-control-plane-check.mjs`](../scripts/geoai-control-plane-check.mjs).

The registry and snapshot are derived indexes. If they conflict with fresher primary evidence, mark them stale and refresh them; do not reinterpret the primary source to fit the document.

## Data-honesty requirement

> Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.

Do not claim official parcel/zoning/cadastral/ownership/valuation validation, approved site, guaranteed best use, live DLD/GeoDubai integration, production-ready or pilot-ready status without current evidence and required approval.

## Protected actions

This authority does not permit:

- merge;
- Production deployment, promotion or rollback;
- Supabase migration or source-data mutation;
- authentication/hard-enforcement change;
- RLS, grant, function or Storage change;
- secret or environment-variable change.

## Next decision

Review Draft PR #120 after all final-head checks pass. Before any later release approval, refresh primary evidence and run candidate-specific route, visual, data-honesty, documentation and rollback checks.