# CR-DEV6-010 — Realistic Demo Geospatial Baseline and Live-Data-Compatible Spatial Contract v1

## Status

Research and data-architecture work approved. Product implementation, merge, Production deployment, Supabase migration, Auth/RLS, Storage, environment, secret, and Figma changes remain blocked pending separate approval.

## Authoritative baseline

- Repository: `mmgolikov/geoai-mvp`
- Base SHA: `852603469549cba934718737513eff0542aeb34b`
- Production deployment: `dpl_B3PBaPAiVNghr2s53RSrUvMXsDYD`
- PR #63 remains open, draft, and outside this detached workstream.

## Problem

The current map uses hand-authored synthetic polygons, lines, and points. They are caveated, but several boundaries do not follow recognizable coastlines, road networks, land-use blocks, building footprints, or observed development geometry. This weakens demo credibility and creates a future integration risk if official, customer, licensed, or updated open data requires a different Product model.

## Business reason

GeoAI must demonstrate credible spatial decision intelligence for UAE real-estate and development workflows while remaining explicit that open or derived geometry is not official parcel, zoning, cadastral, planning, ownership, valuation, or certified hazard evidence.

## Users

- UAE developers and development managers
- Real-estate funds and family offices
- Banks and lenders
- Government and urban-planning stakeholders
- GeoAI analysts and pilot delivery teams

## Required outcome

Create a realistic and source-backed demo spatial baseline where:

1. Geometry follows real-world open-context features or reproducible derived-screening methods.
2. Every dataset and feature carries source, release, snapshot, license, attribution, transformation, quality, freshness, and validation lineage.
3. Geometry is separated from time-dependent metrics.
4. Future official, licensed, or client datasets replace source adapters without changing map, dashboard, comparison, or report contracts.
5. Every open or derived layer remains visibly and textually distinguished from validated official or client evidence.

## Product rules

- Realistic does not mean official.
- Open boundaries use `Open-context geometry` or `Open-context boundary`.
- Algorithmic areas use `Derived screening zone`.
- Building footprints and AOIs are never called parcels unless officially validated.
- Risk layers are screening exposure, not certified hazard zones.
- Real-data activation changes adapter, version, and validation state; it does not create a second Product model.

## Target layer catalogue

1. Community and district context
2. Market signal areas
3. Development and construction activity signals
4. Selected asset/AOI examples
5. Transport corridors
6. Infrastructure and activity anchors
7. Coastal and low-elevation exposure
8. Heat and vegetation exposure
9. Construction monitoring targets
10. Future official GIS, licensed, and customer adapters

## Phases

### Phase A — Research and contract

Source/licensing matrix, Dubai AOI specification, layer methodology, canonical data contract, stable identity rules, snapshot manifest, and quality gates.

### Phase B — Open-context geometry foundation

OSM/Overture roads, anchors, buildings, land-use, open-context areas, and selected AOIs.

### Phase C — Derived environmental and construction signals

Copernicus/WorldCover/DEM-derived coastal, heat, vegetation, construction, and development screening layers.

### Phase D — Product integration and QA

Compatibility adapter, source/freshness labels, report lineage, browser evidence, and release governance.

## Acceptance criteria

- No arbitrary hand-drawn geometry remains in the approved migrated layer set.
- Every migrated feature has stable `featureKey`, source feature ID or explicit absence reason, dataset version, snapshot/release ID, attribution, and lineage.
- Every geometry has origin, role, accuracy, validation status, freshness, and quality results.
- Polygon topology is valid; rings are closed; self-intersections and empty geometries are rejected.
- Coordinates, areas, centroids, and lengths pass Dubai-area plausibility checks.
- UI and reports consume one normalized envelope across demo, open, customer, licensed, and official source modes.
- Browser evidence demonstrates recognizable alignment with real roads, coastlines, blocks, buildings, or land-use geometry.
- No official/live integration or decision-grade claim is introduced without evidence.

## Out of scope for Phase A

- Product layer replacement
- Scoring changes
- Production data ingestion
- Supabase schema or migration changes
- Auth, RLS, Storage, environment, or secrets
- Official DLD, Dubai Pulse, GeoDubai, or Municipality integration claims
- Production deployment

## Required caveat

**Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.**
