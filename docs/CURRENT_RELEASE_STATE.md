# GeoAI Current Release State

Status: Active current-release authority
Last verified: 2026-08-16
Owner: GeoAI Release Governance
Authority: Current repository release interpretation and candidate boundary
Successor: A newer externally verified release receipt

## Executive Summary

GeoAI Production is available as a browser-local public screening experience. It is not certified for protected client data, live official source use, production-ready operation or pilot-ready operation.

External read-only verification on 2026-08-16 found:

| Item | Verified state |
| --- | --- |
| GitHub `main` | `7f323c4227f2409f3fe2d4d68be48a30176f4e2a`; merge commit for PR #113 |
| Production deployment | `dpl_4yBHCo1eZ7N6GYQWGAg1EdQGwFTE`; READY |
| Production alias | [geoai-mvp.vercel.app](https://geoai-mvp.vercel.app) |
| Health | `/api/health` returned HTTP 200 with CSP, HSTS, `nosniff` and frame-deny headers |
| Production Supabase | Not configured |
| Public workflow | Browser-local deterministic screening |
| Protected operation | Not activated |

Live authority is external post-release GitHub, Vercel and Confluence evidence. Repository policy is defined in [`RELEASE_AUTHORITY_POLICY.json`](RELEASE_AUTHORITY_POLICY.json); [`LAST_VERIFIED_RELEASE_SNAPSHOT.json`](LAST_VERIFIED_RELEASE_SNAPSHOT.json) is historical evidence and must not be relabelled as current when newer external evidence exists.

## Released Product Boundary

Released `main` provides:

- Landing, Login, Workspace, Explore, Project Hub, Dashboard, Comparison and printable report routes;
- Map-first and Criteria-first browser workflows;
- browser-local project, analysis, comparison and report continuity;
- deterministic screening results and explicit evidence/validation context;
- fail-closed protected server mutations;
- sanitized public status routes.

Released `main` does not prove:

- protected identity or organization/project membership enforcement;
- confidential tenant isolation or private document custody;
- live official DLD, GeoDubai or other authority integration;
- official parcel, zoning, cadastral, ownership or valuation status;
- complete operational monitoring, recovery or support controls;
- production-ready, pilot-ready or enterprise-ready maturity.

Do not enter confidential, regulated, sensitive or client-protected information into the public browser-local workflow.

## Active Candidate

Draft PR [#143](https://github.com/mmgolikov/geoai-mvp/pull/143) is open from `product/gcc-real-estate-decision-platform-v1`, based on exact released `main@7f323c4227f2409f3fe2d4d68be48a30176f4e2a`.

Candidate objective:

- focus Product on UAE-first/GCC-expandable real-estate decisions;
- prioritize development sites, redevelopment, acquisition, portfolio and household property decisions;
- make tourism secondary;
- simplify Workspace-to-result transition;
- use one decision snapshot across Dashboard and reports;
- modernize Project Hub without duplicating Data Readiness;
- preserve explicit illustrative provenance and fail-closed source activation;
- establish a successor candidate Figma authority and exact-head QA gate.

Draft PR #143 is not merged and has not been deployed to Production. It does not authorize secrets, Production environment changes, Supabase migrations/writes, hard Auth, protected Storage or live source activation.

Candidate authorities:

- [Change Request](CR_GCC_REAL_ESTATE_DECISION_PLATFORM_V1.md)
- [Product and Market Strategy](GCC_REAL_ESTATE_PRODUCT_AND_MARKET_STRATEGY_V1.md)
- [Market Research](GCC_REAL_ESTATE_MARKET_RESEARCH_2026_08.md)
- [Figma Authority](FIGMA_GCC_REAL_ESTATE_AUTHORITY_V1.md)
- [QA Checklist](GCC_REAL_ESTATE_TRANSFORMATION_QA_CHECKLIST.md)
- [Draft Release Receipt](RELEASE_GCC_REAL_ESTATE_DECISION_PLATFORM_V1.md)
- [Confluence candidate control](https://geoaimvp.atlassian.net/wiki/spaces/PH/pages/25591809)

## Data And Integrations

| Source group | Current posture | Decision boundary |
| --- | --- | --- |
| DLD / Dubai Pulse | Manual/local snapshot path | No live official integration; official validation required |
| OSM / Geofabrik | Open geospatial context | Not official municipal GIS, parcel or planning evidence |
| Overture Maps | Metadata/local release path | Disabled unless an approved source release exists |
| Open-Meteo / NASA POWER | Screening context | Not engineering, insurance or certified climate-risk evidence |
| Copernicus / Sentinel | Catalogue/metadata availability | No imagery custody or processing claim |
| Saudi Arabia / Qatar / Oman | Research and metadata/readiness only | No enabled analytical adapter in the candidate |

Current local datasets are small and illustrative. Fixed candidate scores, geometries and market rows must be labelled **Illustrative local screening context**. Metadata availability does not mean integration, and a basemap does not establish source evidence.

## Supabase State

Development project: `geoai-dev`, ref `pphdqkurxneyagvnnjdt`, region `eu-west-1`.

Fresh management evidence reports the project inactive. Fresh physical migration/schema/RLS/Auth/Storage read-back was unavailable, so historical counts are not current certification. Production runtime does not have Supabase configured.

No Supabase migration, data write, Auth change, RLS/grant change, Storage change, secret or environment mutation is part of Draft PR #143.

Before any protected activation, the owner must separately approve and evidence:

1. exact-target database and migration state;
2. permanent request identity and existing-user Auth personas;
3. organization/project membership and negative cross-tenant checks;
4. RLS and protected API enforcement;
5. private Storage policies and custody tests;
6. rollback, recovery, monitoring and incident controls.

## Design State

Released Figma authority remains Product System v3.2.2 at node `1797:2` in file `TAzDqOvRCw1mQGMU3Y4S9H`.

Draft PR #143 uses candidate successor page `1956:11` with authority board `1956:12`. It covers Landing, Workspace, Dashboard, Project Hub and Reports. The candidate page is not released design authority until owner review and an accepted release receipt.

## Release Gates For Draft PR #143

- dependency audit with zero accepted Production vulnerabilities;
- type check and Production build;
- API, security-header, data-honesty and documentation checks;
- scenario, decision-result parity, source-provenance, map-lifecycle, Workspace and Project Hub contracts;
- normalized-data validation and readiness dry-run;
- responsive B2B/B2C browser journeys at 390x844, 430x932, 768x1024, 834x1112, 1366x768 and 1440x900;
- mobile full-screen map selection and direct result transition;
- Dashboard/report parity and physical PDF checks;
- zero serious/critical Axe findings and accepted-route console errors;
- independent critical review of the exact final SHA;
- permanent GeoAI Quality Gate and exact-head READY Preview.

None of these gates authorizes merge or Production promotion by itself.

## Current Blockers

1. Production has no protected data plane.
2. Development Supabase physical state is not freshly certified.
3. Live source rights, custody and source-to-indicator influence are not proven.
4. Saudi Arabia, Qatar and Oman do not have enabled market adapters.
5. Fixed local context is not statistically representative or valuation-grade.
6. Draft PR #143 still requires final exact-head evidence and owner review.

## Required Claim Boundary

Never represent current output as official parcel proof, official zoning, cadastral validation, ownership verification, certified valuation, an approved site, guaranteed best use, live DLD integration, live GeoDubai integration, production-ready or pilot-ready.

Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.
