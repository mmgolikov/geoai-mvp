# GeoAI

Status: Active repository overview
Last verified: 2026-08-16
Owner: GeoAI Engineering
Authority: Current repository/product behavior and local setup
Successor: None; any replacement must update `docs/DOCUMENTATION_INDEX.md`

GeoAI is a spatial decision intelligence workspace for real-estate development, redevelopment, acquisition, investment, portfolio review and household location decisions. The current candidate is UAE-first and GCC-expandable. It connects map and criteria workflows, ranked alternatives, explainable screening results, source lineage, validation gaps and printable reports.

## Current State

External read-only verification on 2026-08-16 found:

- released `main`: merged PR #113 at `7f323c4227f2409f3fe2d4d68be48a30176f4e2a`;
- Production: Vercel deployment `dpl_4yBHCo1eZ7N6GYQWGAg1EdQGwFTE`, READY at [geoai-mvp.vercel.app](https://geoai-mvp.vercel.app);
- Production data plane: browser-local screening; Production Supabase is not configured;
- protected identity, tenancy, private Storage and confidential workflows: not activated;
- live official DLD/GeoDubai integrations: not activated.

Live authority is external post-release GitHub, Vercel and Confluence evidence. Repository policy and historical evidence are defined in [`RELEASE_AUTHORITY_POLICY.json`](docs/RELEASE_AUTHORITY_POLICY.json) and [`LAST_VERIFIED_RELEASE_SNAPSHOT.json`](docs/LAST_VERIFIED_RELEASE_SNAPSHOT.json). A READY deployment does not establish production-ready or pilot-ready status.

Do not enter confidential, regulated, sensitive or client-protected information into the public browser-local workflow.

## Current Candidate

Draft PR [#143](https://github.com/mmgolikov/geoai-mvp/pull/143) implements [GCC Real Estate Decision Platform v1](docs/CR_GCC_REAL_ESTATE_DECISION_PLATFORM_V1.md) on `product/gcc-real-estate-decision-platform-v1`, based on exact released `main@7f323c4227f2409f3fe2d4d68be48a30176f4e2a`.

Candidate scope:

- B2B: development sites, redevelopment, acquisition, commercial/hospitality and portfolio review;
- B2C: ready-home, off-plan/investment property, rent/relocation and overseas-buyer screening;
- tourism context remains secondary;
- one decision result contract across Workspace, Dashboard and reports;
- work-oriented Project Hub with one Data Readiness surface;
- strict source provenance and local-first ingestion controls;
- successor candidate Figma page for Landing, Workspace, Dashboard, Project Hub and reports.

The branch does not authorize merge, Production promotion, secrets, hard Auth, database migration/write or unsupported official/live claims.

## Start Here

Current candidate authorities:

- [Product and market strategy](docs/GCC_REAL_ESTATE_PRODUCT_AND_MARKET_STRATEGY_V1.md)
- [GCC market research](docs/GCC_REAL_ESTATE_MARKET_RESEARCH_2026_08.md)
- [Figma candidate authority](docs/FIGMA_GCC_REAL_ESTATE_AUTHORITY_V1.md)
- [Transformation QA checklist](docs/GCC_REAL_ESTATE_TRANSFORMATION_QA_CHECKLIST.md)
- [Draft release receipt](docs/RELEASE_GCC_REAL_ESTATE_DECISION_PLATFORM_V1.md)
- [Documentation index](docs/DOCUMENTATION_INDEX.md)
- [Current release state](docs/CURRENT_RELEASE_STATE.md)

Confluence candidate control: [10.13 GCC Real Estate Decision Platform v1](https://geoaimvp.atlassian.net/wiki/spaces/PH/pages/25591809).

## Product Flow

1. Choose B2B or B2C, market, role and decision scenario.
2. Start Map-first with a point/object/AOI or Criteria-first with explicit filters.
3. Review and compare ranked candidates.
4. Open the decision dashboard for posture, score, confidence, drivers, risks and evidence gaps.
5. Validate source lineage and next actions.
6. Save the result to Project Hub and open the printable report.

A score is not confidence. Confidence depends on source quality, coverage, recency, rights, lineage and validation state.

## Data Boundary

Registered source groups:

- DLD / Dubai Pulse public real-estate snapshots: manual/local snapshot path only;
- OSM / Geofabrik: open geospatial context;
- Overture Maps: context after an approved local release;
- Open-Meteo and NASA POWER: screening climate/energy context only;
- Copernicus / Sentinel: catalogue metadata unless imagery custody and processing are separately proven.

UAE is the only enabled screening market in the candidate. Saudi Arabia, Qatar and Oman remain metadata/readiness only. Fixed candidate scores, local geometries and local market rows must be presented as **Illustrative local screening context**, not observed market facts.

Metadata availability is not integration. A basemap is not parcel, planning or ownership evidence. No official parcel, zoning, cadastral, ownership or valuation conclusion is produced.

## Runtime And Security

Public-demo analysis and decision scoring run deterministically in the browser. Server generation routes return 403 before body parsing until AUTH-01 provides a permanent non-anonymous request identity. Protected mutations fail closed and browser-local access never grants protected API, Admin, tenant or customer-data authority.

Public email and phone OTP remain existing-user-only with `shouldCreateUser: false`. Registration, hard access, protected Storage and real-user personas require separate approval and evidence.

User-uploaded and user-drawn targets skip market/climate network calls. Raw uploads, AOIs and derived coordinates remain browser-local in the public workflow.

The current migration chain is not apply-ready for development or Production. Supabase CLI `2.109.1` is pinned for controlled local verification. The historical database harness includes a 71-assertion pgTAP contract, but historical test success does not certify the current hosted database state.

## Local Setup

Requirements:

- Node.js 22-24;
- npm;
- optional Mapbox public token for the interactive basemap;
- no server secret is required for the browser-local screening path.

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000).

Do not place service-role credentials or database URLs in browser-exposed variables. Never commit `.env` files or secrets.

## Validation

Core checks:

```bash
npm audit --omit=dev
npm run lint
npm run build
npm run test:api-contract
npm run test:security-headers
npm run test:data-honesty
npm run test:documentation-current-truth
npm run test:document-lifecycle
```

Candidate checks:

```bash
npm run test:gcc-scenarios
npm run test:gcc-workspace-flow
npm run test:gcc-project-hub
npm run test:map-lifecycle
npm run test:source-provenance
npm run validate:external-data
npm run data:sync-source-readiness -- --dry-run
```

Relevant route smoke:

- `/`
- `/login`
- `/workspace`
- `/projects`
- analysis and comparison print routes
- `/api/health`
- `/api/db/health`
- `/api/platform/activation-status`
- `/api/pilot-backend/status`
- `/api/data-sources`
- `/api/data-sources/readiness`
- `/api/external-data/manifest`
- `/api/external-data/status`
- `/api/source-lineage`

## Release Control

- Never work directly on `main`.
- Preview is not Production.
- Do not merge, promote Production, apply migrations, write Supabase data, change Auth enforcement or add secrets without an explicit release action.
- Record exact commit SHA, Quality Gate, Preview deployment, route smoke, browser evidence and remaining limitations.
- Preserve machine compatibility fields while using honest presentation labels.

Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.
