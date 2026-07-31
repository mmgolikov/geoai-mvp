# GeoAI Current Release State

**Status:** Current derived release authority  
**Verified:** 2026-07-31  
**Owner:** GeoAI Release Engineering  
**Primary-source rule:** Vercel determines running Production; GitHub determines code/merge state; Supabase determines physical data state; approved Figma nodes determine design intent; Confluence records decisions. This page never overrides fresher primary evidence.

## Executive status

GeoAI Production is a public demo prototype. It is **not** a confidential-pilot, protected-data, official-source, production-ready or pilot-ready system.

| Item | Current verified state |
|---|---|
| GitHub repository | `mmgolikov/geoai-mvp` |
| Production branch | `main` |
| Released pull request | #113, merged |
| Production commit | `7f323c4227f2409f3fe2d4d68be48a30176f4e2a` |
| Vercel team / project | `geoaidev` / `geoai-mvp` |
| Production deployment | `dpl_4yBH4WUUf6GYTemFdSdAxUJQYgsC` |
| Deployment state | READY; exact Git SHA matches `main` |
| Production alias | `geoai-mvp.vercel.app` |
| Recent runtime-error check | zero errors returned for the previous seven days at the 2026-07-31 audit |
| Fresh route/visual smoke in this audit | not executed; use existing release evidence only and rerun before any new release decision |

## Active candidates — not Production

| Workstream | Branch / PR | Verified boundary |
|---|---|---|
| DLD controlled ingestion foundation v1 | PR #118; `agent/dld-controlled-ingestion-foundation-v1`; head `703f37691efb341d14c988383ad785bfda1c5044` | Preview candidate. Metadata, isolated schemas, table contracts and validation harness only; zero source payload rows; not an official or live DLD integration. |
| Rosimushchestvo Moscow pilot v1 | `pilot/rosimushchestvo-moscow-v1`; head prefix `c735200c` | Separate Preview candidate. Not merged, not Production and not customer-approved. Sample/generated data must be labelled. |
| Control Plane and Audit Acceleration v1 | `ops/geoai-control-plane-v1` | Documentation, registry and read-only validation only. No protected action authorised. |

## Data foundation

### `geoai-dev`

- project ref: `pphdqkurxneyagvnnjdt`;
- region/status: `eu-west-1` / `ACTIVE_HEALTHY`;
- PostgreSQL: `17.6.1.141`;
- migration ledger: 12 entries; latest `20260729213222`;
- public base tables: 20;
- source-registry snapshot rows: 8;
- external-data snapshot rows: 8;
- confirmed auth users: 3.

DLD foundation tables are present in `geoai_dld_feature` and `geoai_dld_private`. All seven are RLS-enabled with one policy each and currently have an estimated zero payload rows. Physical schema readiness does not prove source access, licensing, lineage, snapshot ingestion or official integration.

### `geoai-auth-rehearsal`

Project ref `bkmfcjzalcvdsdvyxpgi`; rehearsal-only environment; not Production authority.

### Open security decision

Supabase security advisor reports RLS disabled on `public.spatial_ref_sys`. This is recorded for explicit owner/security review. No automatic SQL remediation or migration is authorised.

## Design authority

- Figma file: `TAzDqOvRCw1mQGMU3Y4S9H`;
- executable Start Here: `1797:2`;
- executable prototype: `1482:2`;
- runtime alignment: `1749:21157`;
- correction receipts: `1819:11`, `1825:11`;
- delivery cockpit: `1495:53`;
- component authorities: `1670:2`, `1673:2`.

Agents should read affected nodes/components rather than the complete file unless a full design audit is required.

## Documentation and control-plane authority

- machine-readable registry: `GEOAI_PROJECT_REGISTRY_V1.json`;
- verified release snapshot: `LAST_VERIFIED_RELEASE_SNAPSHOT.json`;
- release policy: `RELEASE_AUTHORITY_POLICY.json`;
- source/delta protocol: `GEOAI_SOURCE_AUDIT_AND_DELTA_PROTOCOL_V1.md`;
- QA/audit runbook: `GEOAI_AUTOMATED_QA_AND_AUDIT_RUNBOOK_V1.md`;
- control-plane validator: `../scripts/geoai-control-plane-check.mjs`.

The registry and snapshot are derived indexes. If they conflict with a fresher primary source, mark them stale and refresh them; do not reinterpret the primary source to fit the document.

## Data-honesty requirement

> Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.

Do not claim official parcel/zoning/cadastral/ownership/valuation validation, approved site, guaranteed best use, live DLD/GeoDubai integration, production-ready or pilot-ready status without current evidence and required approval.

## Protected actions

This authority does not permit:

- merge;
- Production deployment or promotion;
- Supabase migration or source-data mutation;
- authentication/hard-enforcement change;
- secret or environment-variable change.

## Next decision

Review the control-plane draft PR. Before any later release approval, refresh primary-source evidence and run candidate-specific route, visual, data-honesty, documentation and rollback checks.