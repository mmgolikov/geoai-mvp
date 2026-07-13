# Realistic Demo Spatial Baseline — Research Execution Status

## Workstream status

| Workstream | Status | Current output | Exit condition |
|---|---|---|---|
| Source and licensing | In progress | Initial official-source matrix and no-go rules | Verified UAE/Dubai source matrix with license and attribution controls |
| GIS geometry engineering | Queued | Current synthetic geometry inventory and target layer methodology | Reproducible Dubai AOI extraction specification and sample open-context snapshot |
| Spatial data architecture | In progress | Spatial Dataset Envelope v1 | Reviewed canonical types, stable identity rules, manifests, and adapter interface |
| Derived analytics | Queued | Coastal/heat/construction methodology outline | Approved reproducible method, thresholds, uncertainty, and freshness policy |
| Product/data-honesty QA | In progress | Validation labels and acceptance gates | Complete QA matrix for map, reports, attribution, freshness, and claims |

## Current-state source inventory

- Hand-authored spatial seed: `src/data/spatial-seed/dubai-spatial-seed.ts`
- Compatibility facade: `src/data/demo-layers.ts`
- Current spatial adapter: `src/lib/spatial-data-adapter.ts`
- Existing open fixture loader: `src/lib/open-geodata/baseline-loader.ts`
- Existing open fixture manifest: `data/normalized/open_geodata_ingestion_report.json`
- Existing mock point API: `/api/demo-objects`

## Research branch controls

- Branch: `research/realistic-demo-spatial-baseline-v1`
- Base: `852603469549cba934718737513eff0542aeb34b`
- Scope: documentation and research only
- PR #63: untouched
- Product code: unchanged
- Production: unchanged

## Immediate next outputs

1. `UAE_SPATIAL_SOURCE_MATRIX_V1.md`
2. `DUBAI_AOI_AND_EXTRACTION_SPEC_V1.md`
3. `SPATIAL_SNAPSHOT_MANIFEST_V1.md`
4. `STABLE_FEATURE_KEY_REGISTRY_V1.md`
5. `GEOMETRY_QUALITY_AND_TOPOLOGY_QA_V1.md`
6. `OPEN_CONTEXT_LAYER_METHODOLOGY_V1.md`
7. `PHASE_B_ENGINEERING_BRIEF_V1.md`

## Decision gate before Product implementation

Product implementation remains blocked until the research package confirms:

- permitted source use and required attribution;
- reproducible extract and snapshot process;
- canonical feature and metric contracts;
- topology and geometry-quality gates;
- stable identity and versioning;
- honest UI labels and report lineage;
- controlled migration path from synthetic fallback to open-context and later validated sources.

## Required caveat

**Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.**
