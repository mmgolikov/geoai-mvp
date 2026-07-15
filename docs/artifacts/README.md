# GeoAI Architecture Artifact Registry

This directory is the version-controlled architecture evidence package for GeoAI. Confluence remains the documentation and approval hub; GitHub stores canonical sources, deterministic SVG renders, implementation mappings and automated freshness evidence.

Package: `CR-DEV7-003` v1.0

Publication gate: **Not passed**

Runtime represented: current public demo, synthetic/local fallback and soft access

## Controlled artifacts

| ID | Canonical source | Render | Status |
|---|---|---|---|
| C4-001 | `c4/C4-001-system-context.puml` | `rendered/C4-001-system-context.svg` | Review |
| C4-002 | `c4/C4-002-container-architecture.puml` | `rendered/C4-002-container-architecture.svg` | Review |
| C4-003 | `c4/C4-003-spatial-b2a-components.puml` | `rendered/C4-003-spatial-b2a-components.svg` | Draft |
| BPMN-001 | `bpmn/BPMN-001-core-analysis-flow.puml` | `rendered/BPMN-001-core-analysis-flow.svg` | Review |
| STATE-001 | `state/STATE-001-analysis-lifecycle.puml` | `rendered/STATE-001-analysis-lifecycle.svg` | Review |
| SEQ-001 | `sequence/SEQ-001-analysis-request-sequence.puml` | `rendered/SEQ-001-analysis-request-sequence.svg` | Review |
| ERD-001 | `erd/ERD-001-core-data-model.puml` | `rendered/ERD-001-core-data-model.svg` | Review |
| DATA-LINEAGE-001 | `lineage/DATA-LINEAGE-001-spatial-evidence-flow.puml` | `rendered/DATA-LINEAGE-001-spatial-evidence-flow.svg` | Review |
| ACT-001 | `activity/ACT-001-spatial-package-activation.puml` | `rendered/ACT-001-spatial-package-activation.svg` | Draft |
| DEP-001 | `deployment/DEP-001-current-deployment.puml` | `rendered/DEP-001-current-deployment.svg` | Draft |
| API-001 | `api/API-001-runtime-contracts.puml` | `rendered/API-001-runtime-contracts.svg` | Draft |

Supplemental SQL-001 (`sql/ERD-001-schema-spec.md`) maps ERD-001 to the ordered migration source set; it is not a separate diagram, migration authorization or applied-schema attestation.

`architecture-artifact-manifest.json` is the machine-readable source of artifact identity, status and exact implementation references. `rendered/render-manifest.json` pins the renderer and source/render SHA-256 digests.

`ARCHITECTURE_IMPLEMENTATION_MAPPING_V1.md`, `ARCHITECTURE_TRACE_MATRIX_V1.md` and `ARCHITECTURE_REVIEW_PACKET_V1.md` are the controlled review surfaces. `ARCHITECTURE_PRE_REVIEW_FINDINGS_V1.md` records pre-review corrections and open dispatch blockers; it is not independent approval.

## Reproduce and verify

Rendering uses PlantUML 1.2025.4 with pinned JAR SHA-256 `26518e14a3a04100cd76c0d96cab2d1171f36152215edd9790a28d20268200c1` as a one-time documentation tool, not a Product runtime dependency.

```bash
PLANTUML_JAR=/absolute/path/plantuml-1.2025.4.jar npm run render:architecture
npm run test:architecture
```

The permanent quality gate verifies all required IDs, source and SVG hashes, code paths, mapped symbols, mapping documents, required caveat and non-approved publication state. CI validates committed renders without downloading PlantUML.

## Approval boundary

Rendered does not mean approved. Publication requires independent architecture review, resolution of review findings, corresponding Confluence status change and an explicit publication decision. No artifact in this package authorizes real geometry, B2B/B2C activation, Production Supabase/Auth/RLS/Storage, secrets, environment changes or Production deployment.

Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.
