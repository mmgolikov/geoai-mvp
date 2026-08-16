# GCC Real Estate Decision Platform v1

Status: Draft release receipt; not merged or released
Last verified: 2026-08-16
Owner: GeoAI Release Governance
Authority: Candidate receipt for Draft PR #143
Successor: Exact-head release receipt after final evidence or a later owner-approved release note

## Objective

Move GeoAI from a broad spatial demonstration into a focused UAE-first, GCC-expandable real-estate screening and validation workspace for organizations and individuals.

## Candidate scope

- GCC market and competitor research with verified-fact, inference and hypothesis separation;
- UAE-first B2B and B2C real-estate decision catalog;
- successor Figma authority for Landing, Workspace, Dashboard, Project Hub and Reports;
- single decision result contract across Dashboard and reports;
- simplified Workspace-to-result transition;
- work-oriented Project Hub with one Data Readiness surface;
- strict local/open source provenance and local-first ingestion controls;
- dependency and map-lifecycle hardening;
- concise active product, design and QA documentation.

## Source groups

- DLD / Dubai Pulse public real-estate snapshots: manual/local release path only;
- OSM / Geofabrik: open geospatial context;
- Overture Maps: buildings, places and transportation context when an approved release exists;
- Open-Meteo and NASA POWER: screening climate/energy context only when permitted and released;
- Copernicus / Sentinel: catalogue/metadata availability unless imagery custody and processing are separately implemented.

## Validation

Local candidate validation completed on 2026-08-16:

- lint and production build passed;
- API contract, data-honesty, documentation-current-truth and document-lifecycle checks passed;
- GCC scenario, Workspace, Project Hub, decision-result parity, source-provenance, source-readiness and map-lifecycle contracts passed;
- 37 of 37 Playwright/Chromium scenarios passed across the declared mobile, tablet and desktop viewports, with zero accepted-route console errors and zero serious/critical Axe findings;
- 12 Chromium-generated PDFs produced 62 physical pages; page rendering, extracted text, dimensions, blank-page, clipping, overlap and orphan-heading assertions passed;
- the source-readiness sync dry-run prepared five registry and five external-snapshot rows without writing them;
- the production dependency audit reported zero vulnerabilities.

The permanent GitHub Quality Gate, immutable exact-head artifacts, independent review and Vercel Preview receipt are recorded in Draft PR #143 after they complete. This candidate note does not claim merge, release or Production promotion.

## Data honesty

- No live official DLD or GeoDubai integration is claimed.
- No official parcel, zoning, cadastral, ownership or valuation conclusion is represented.
- Customer-facing surfaces use screening/public-open/local context wording while Evidence retains exact provenance and validation state.
- Synthetic or tiny local context is not relabeled as observed market fact.
- Production-ready and pilot-ready status are not claimed.

## Known limitations

- Production remains unchanged and does not have Supabase configured.
- The development Supabase target is not written by this package without separate exact-target, rights, migration, RLS and rollback approval.
- Saudi Arabia, Qatar and Oman remain metadata-only, disabled markets in the current candidate.
- Protected Auth, membership, storage and confidential workflows remain separately gated.
- Current normalized local datasets are not sufficient for valuation or statistically representative market conclusions.

## Release control

- Branch: `product/gcc-real-estate-decision-platform-v1`
- Draft PR: [#143](https://github.com/mmgolikov/geoai-mvp/pull/143)
- Baseline: `7f323c4227f2409f3fe2d4d68be48a30176f4e2a`
- No merge or Production promotion is authorized.

Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.
