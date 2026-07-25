# Phase A Agent Output Index v1

## Agent A — Source and licensing

- GitHub issue: #64
- Primary deliverable: `UAE_SPATIAL_SOURCE_MATRIX_V1.md`
- Key decision: OSM/Geofabrik and Overture are candidate Phase B open-context sources, subject to final attribution and redistribution review.
- Key exclusions: DLD/Dubai Pulse automated ingestion and Municipality/GeoDubai official geometry remain unapproved.

## Agent B — GIS geometry engineering

- GitHub issue: #65
- Deliverables:
  - `DUBAI_AOI_AND_EXTRACTION_SPEC_V1.md`
  - `GEOMETRY_QUALITY_AND_TOPOLOGY_QA_V1.md`
- Key decision: use a non-official processing envelope and focused AOIs; metric operations in EPSG:32640; outputs in EPSG:4326.
- Key control: no arbitrary hand-drawn boundary in an approved migrated layer.

## Agent C — Data architecture

- GitHub issue: #66
- Deliverables:
  - `SPATIAL_DATASET_ENVELOPE_V1.md`
  - `SPATIAL_SNAPSHOT_MANIFEST_V1.md`
  - `STABLE_FEATURE_KEY_REGISTRY_V1.md`
  - `SPATIAL_ADAPTER_INTERFACE_V1.md`
- Key decision: stable GeoAI identity plus immutable dataset versions; provider IDs as aliases; geometry and metrics separated.

## Agent D — Derived analytics

- GitHub issue: #67
- Deliverable: `OPEN_CONTEXT_LAYER_METHODOLOGY_V1.md`
- Key decision: coastal, heat, development and construction analytics remain derived screening methods in later approval-gated phases.

## Agent E — Product, QA and delivery governance

- GitHub issue: #68
- Deliverables:
  - `SPATIAL_DATA_HONESTY_QA_V1.md`
  - `PHASE_B_ENGINEERING_BRIEF_V1.md`
  - `PHASE_A_RESEARCH_REVIEW_CHECKLIST_V1.md`
- Key decision: B1 contract/builder/snapshot first, then B2 Product integration and visual evidence.

## Cross-agent governance

- Change request: `REALISTIC_DEMO_GEOSPATIAL_BASELINE_V1_CHANGE_REQUEST.md`
- Research status: `REALISTIC_DEMO_SPATIAL_RESEARCH_STATUS.md`
- Decision register: `PHASE_A_DECISION_REGISTER_V1.md`
- Draft PR: #69
- Production and Product code: unchanged
- PR #63: untouched

## Required caveat

**Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.**