# Realistic Demo Spatial Baseline — Phase A Research Status

## Executive status

**Phase A multi-agent research package is complete and ready for founder review.**

No Product geometry has been replaced. No merge, Production deployment, Supabase migration/write, Auth/RLS, Storage, environment, secret or Figma action is authorized by this status.

## Workstream status

| Workstream | Status | Delivered output | Review gate |
| --- | --- | --- | --- |
| Agent A — Source and licensing | Complete | `UAE_SPATIAL_SOURCE_MATRIX_V1.md` | Confirm OSM/Overture public-demo distribution/attribution treatment and Phase B source choice |
| Agent B — GIS geometry engineering | Complete | `DUBAI_AOI_AND_EXTRACTION_SPEC_V1.md`, `GEOMETRY_QUALITY_AND_TOPOLOGY_QA_V1.md` | Approve master/focus AOIs, toolchain and topology thresholds |
| Agent C — Spatial data architecture | Complete | `SPATIAL_DATASET_ENVELOPE_V1.md`, `SPATIAL_SNAPSHOT_MANIFEST_V1.md`, `STABLE_FEATURE_KEY_REGISTRY_V1.md`, `SPATIAL_ADAPTER_INTERFACE_V1.md` | Approve canonical contract, stable-key rules and two-stage migration |
| Agent D — Derived analytics | Complete | `OPEN_CONTEXT_LAYER_METHODOLOGY_V1.md` | Keep environmental/development derivations outside Phase B until separate approval |
| Agent E — Product/data-honesty QA | Complete | `SPATIAL_DATA_HONESTY_QA_V1.md`, `PHASE_B_ENGINEERING_BRIEF_V1.md` | Approve release gates and B1/B2 delivery split |

## Current-state source inventory

- Hand-authored spatial seed: `src/data/spatial-seed/dubai-spatial-seed.ts`
- Compatibility facade: `src/data/demo-layers.ts`
- Current spatial adapter: `src/lib/spatial-data-adapter.ts`
- Existing open fixture loader: `src/lib/open-geodata/baseline-loader.ts`
- Existing open fixture manifest: `data/normalized/open_geodata_ingestion_report.json`
- Existing mock point API: `/api/demo-objects`

The existing compatibility facade is retained as the intended migration seam. Product components must not import raw provider schemas.

## Research branch controls

- Branch: `research/realistic-demo-spatial-baseline-v1`
- Base: `852603469549cba934718737513eff0542aeb34b`
- Draft PR: `#69 — Research: Realistic Demo Geospatial Baseline v1`
- Scope: documentation and research only
- PR #63: untouched and still separately approval-gated
- Product code: unchanged
- Production: unchanged

## Completed Phase A documents

1. `REALISTIC_DEMO_GEOSPATIAL_BASELINE_V1_CHANGE_REQUEST.md`
2. `SPATIAL_DATASET_ENVELOPE_V1.md`
3. `REALISTIC_UAE_DEMO_SPATIAL_SOURCE_RESEARCH_V1.md`
4. `UAE_SPATIAL_SOURCE_MATRIX_V1.md`
5. `DUBAI_AOI_AND_EXTRACTION_SPEC_V1.md`
6. `GEOMETRY_QUALITY_AND_TOPOLOGY_QA_V1.md`
7. `SPATIAL_SNAPSHOT_MANIFEST_V1.md`
8. `STABLE_FEATURE_KEY_REGISTRY_V1.md`
9. `SPATIAL_ADAPTER_INTERFACE_V1.md`
10. `OPEN_CONTEXT_LAYER_METHODOLOGY_V1.md`
11. `SPATIAL_DATA_HONESTY_QA_V1.md`
12. `PHASE_B_ENGINEERING_BRIEF_V1.md`
13. `REALISTIC_DEMO_SPATIAL_RESEARCH_STATUS.md`

## Research conclusions

### Approved direction

- Use pinned OSM/Geofabrik and Overture releases for the first open-context geometry foundation.
- Preserve theme/source-specific attribution and licence evidence.
- Use stable GeoAI `featureKey` values with provider IDs as aliases.
- Store geometry and temporal metric observations separately.
- Use immutable versioned manifests and checksums.
- Preserve synthetic fallback per layer for rollback.
- Treat Copernicus/WorldCover environmental outputs as derived screening evidence in later phases.
- Keep DLD/Dubai Pulse as a manual/public validation path until dataset-level usage and redistribution are reviewed.
- Keep Dubai Municipality/GeoDubai as an inactive future official adapter until access and lineage are verified.

### Rejected direction

- Arbitrary hand-drawn polygons presented as realistic communities, parcels, zoning or hazard zones.
- Geometry copied/traced from Google Maps or protected commercial sources.
- Unpinned `latest` source in a release bundle.
- Raw provider schemas imported directly into Product components.
- Geometry realism used to promote sample metrics or source confidence.
- Environmental derived polygons shipped without methodology, uncertainty and sensitivity review.

## Phase B delivery recommendation

Use two separate approval-gated draft PRs:

1. **B1 — Contract, Snapshot Builder and Open Geometry Bundle**
   - canonical types;
   - static repository/resolver;
   - synthetic fallback bundle;
   - deterministic OSM/Overture builder;
   - versioned Dubai snapshot and quality evidence;
   - no visible Product activation by default.

2. **B2 — Product Integration, Source Labels and Visual Evidence**
   - compatibility adapter activation;
   - per-layer migration and rollback;
   - map/source labels and attribution;
   - dashboard/report lineage;
   - responsive, performance and PDF evidence.

Environmental derived layers, market metrics and official/client adapters remain separate later packages.

## Open founder decisions

1. Approve the two-PR B1/B2 delivery split.
2. Approve the proposed processing envelope and three mandatory focus AOIs.
3. Approve OSM/Geofabrik plus Overture as Phase B candidate sources subject to final attribution/legal gate.
4. Decide whether normalized clipped open snapshots may be committed to the public repository or must be stored as release artifacts/object storage.
5. Approve the initial visible layer set and feature-density limits.
6. Decide whether PR #63 is merged before Phase B1 branch creation; Phase B1 must use the then-current approved `main`.

## Stop gate before Product implementation

Product implementation remains blocked until the founder approves:

- source/licence strategy;
- exact source releases/snapshots;
- AOI and extraction specification;
- stable identity and manifest contracts;
- B1/B2 delivery split;
- repository/storage policy for normalized spatial assets;
- Product terminology and QA matrix.

## Required caveat

**Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.**