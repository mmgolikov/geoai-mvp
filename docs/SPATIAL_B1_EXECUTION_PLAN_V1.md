# Spatial B1 Execution Plan v1

## Control

| Field | Value |
| --- | --- |
| Change Request | `CR-DEV6-011` |
| Status | Approved for controlled implementation; draft PR only |
| Base | `2a38d6afeafda80b5fd59a73f3e9bb9eac141d4a` |
| Production baseline | `dpl_Bc8VSdFeiLbCYAy9CDKzeDM2gfNy` |
| Research authority | `CR-DEV6-010`, draft PR #69 and founder decision `DEC-SPATIAL-PHASE-A-001` |

## Objective

Implement the versioned spatial contract, deterministic source snapshot builder, source and attribution manifests, stable GeoAI feature identities, geometry-quality evidence and a read-only Dubai open-context geometry bundle.

B1 must not activate the new geometry as the default Product layer source. Product-visible migration belongs to B2.

## Approved source candidates

- OSM / Geofabrik working candidate: `gcc-states-260712.osm.pbf`.
- Source-data timestamp reported at Phase A review: through `2026-07-12T20:22:00Z`.
- Overture Maps working candidate release: `2026-06-17.0`.

Candidate status is not completed ingestion. B1 must obtain the exact assets from official locations, calculate SHA-256 checksums, record byte sizes and source metadata, generate attribution, and record the licence/public-distribution disposition.

## Mandatory focus AOIs

1. Dubai Marina / JBR / Palm context.
2. Downtown / Business Bay / Meydan context.
3. Dubai South / Jebel Ali context.

Creek / DXB is not mandatory in the first snapshot.

## Initial layer set

1. Open Transport Context.
2. Open Spatial Anchors.
3. Sample AOIs on Real-World Geometry.
4. Focus-AOI Open Building Context.
5. Open Land-Use and Water Context.
6. Open Construction Monitoring Targets.

Environmental derived zones, market metrics, DLD/Dubai Pulse data and official GIS are out of B1.

## Delivery workstreams

### B1-A — Source acquisition and legal evidence

- verify official source endpoints;
- download exact candidate assets in CI or a controlled build environment;
- calculate SHA-256 and byte size;
- generate OSM and Overture attribution records;
- document adapted-database and public-normalized-output treatment;
- block publication if rights or source identity are unresolved.

### B1-B — Canonical contract and repository

- implement versioned dataset, feature, metric, lineage and quality contracts;
- implement stable feature-key and source-alias rules;
- implement a static read-only dataset repository and resolver;
- preserve synthetic geometry as an explicit fallback;
- keep raw provider schemas inside adapters.

### B1-C — Deterministic spatial builder

- implement OSM and Overture extraction adapters;
- retain exact OSM `node/<id>`, `way/<id>` and `relation/<id>` identities during export and reject missing or generated identities;
- classify OSM records from each feature's own tags and geometry, then reject referenced-member leakage and cross-layer duplicates;
- clip to the approved non-official processing envelope and seeded target-anchor extraction areas;
- use pinned Shapely and pyproj operations in EPSG:32640 for validity, repair, area, length, topology, point-on-surface and distance, then reproject accepted output to EPSG:4326;
- rank candidates separately for each seeded target using documented category, name, area, distance and freshness rules inside non-overlapping 1,000 metre metric selection areas and a maximum 750 metre anchor distance;
- normalize transport, anchors, buildings, land use, water, construction and selected AOIs;
- record every transformation and output checksum;
- produce deterministic manifests and quality reports.

### B1-D — Geometry and data-honesty QA

- validate geometry type, coordinate range, closure, emptiness and self-intersection;
- verify area/length plausibility and simplification displacement;
- verify stable-key, provider-ID, geometry-checksum and alias-set uniqueness, including within-layer and cross-layer collision reports;
- keep machine validity separate from independent source-alignment review status and prevent a fully valid/release-ready state while that review remains pending;
- generate one neutral-grid source-alignment PNG per required target without protected map imagery;
- verify source, release, licence, attribution, freshness and lineage fields;
- normalize OSM epoch seconds/milliseconds to canonical UTC while preserving raw and epoch values, without populating observation time;
- classify transport, anchor, land-use, water, construction and building records with layer-specific conservative source categories;
- preserve multilingual display, source, local, English and alternate names with explicit canonical, source-stable, snapshot-provisional or derived identity scope;
- preserve Overture theme licence and each declared source-record licence as separate provenance layers;
- reject official, parcel, zoning, cadastral, planning or hazard claims for open data.

### B1-E — Packaging and no-activation evidence

- commit only small normalized fixtures after licence review;
- keep large geometry in short-lived CI or GitHub release artifacts;
- do not add new Production environment variables;
- keep the open bundle inactive by default;
- prove existing Product routes and reports are unchanged;
- run the permanent GeoAI Quality Gate and Vercel Preview smoke.

## Required outputs

- canonical TypeScript contracts;
- source adapter interface and implementations;
- deterministic builder commands;
- source download manifest;
- attribution and licence manifest;
- stable feature-key registry;
- provider-versioned alias/crosswalk history and Python/TypeScript canonical-key parity evidence;
- target-specific top-10 candidate tables and feature-level freshness evidence;
- attribution and distribution specification with repository publication approval held false;
- machine-readable attribution URLs and artifact `LICENSES/NOTICE.md`;
- exact independent-review record for the three selected AOIs, bound to reviewed provider IDs and geometry hashes;
- normalized dataset manifests;
- geometry-quality report;
- deterministic rebuild report;
- feature-count and asset-size report;
- selected-AOI map-alignment evidence;
- no-default-activation evidence;
- draft release note.

## Acceptance gate

B1 is complete only when:

1. exact source identities and checksums are independently reviewable;
2. attribution and public-distribution treatment are recorded;
3. canonical contracts compile and are covered by source-level tests;
4. repeated builds from the same inputs produce matching normalized checksums;
5. every accepted feature has a stable key, provider alias, lineage, validation status and geometry quality;
6. the mandatory focus AOIs use recognizable real-world open-context geometry;
7. invalid or unverifiable features are excluded rather than silently accepted;
8. small repository fixtures remain within approved limits;
9. large data remains outside the Git repository;
10. new open layers remain inactive by default;
11. existing Workspace, Project Hub, dashboard, comparison and report flows show no regression;
12. the PR remains draft and unmerged pending founder review.

The selected AOIs may carry `reviewed_with_conditions` only when their provider IDs and geometry hashes exactly match the independent audit artifact. All other source features remain pending review. This source-alignment decision is not official validation.

## Release safety

Do not:

- merge or deploy Production;
- merge PR #69;
- change Production Supabase, migrations, Auth/RLS, hard access or Storage policies;
- add secrets or new Production environment variables;
- activate DLD, Dubai Pulse, GeoDubai or Municipality integrations;
- label open geometry as official.

## Required caveat

**Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.**
