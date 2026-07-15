# Architecture Trace Matrix v1

Package: CR-DEV7-003

Status: Review; publication not passed

## Required source-activation traces

| Trace | Input | Expected transition | Observable result | Artifact coverage | Automated owner |
|---|---|---|---|---|---|
| Missing bundle | Preview `open_context_preview`; descriptor unavailable | requested → fail closed | `effectiveSourceMode=synthetic_fallback`; reason present; no fixture feature | C4-003, ACT-001, STATE-001, DATA-LINEAGE-001 | `scripts/spatial-b2-integration-check.mjs` |
| Invalid checksum | Preview request; bundle/expected checksum differ | validation → fail closed | zero activated fixture layers; synthetic attribution only for visible synthetic layers | ACT-001, DATA-LINEAGE-001 | `scripts/spatial-b2-integration-check.mjs` |
| Unapproved source mode | licensed/client/official request without B2A approval | request rejected | synthetic fallback with explicit approval reason | C4-003, ACT-001 | `scripts/spatial-b2-integration-check.mjs` |
| Production open-context request | Production + `open_context_preview` | environment guard → reject | synthetic fallback; Preview source control absent | C4-001, C4-003, ACT-001, DEP-001 | source contract + browser evidence |
| Approved controlled fixture | Preview/dev + eligible controlled non-real bundle | checks pass → activate | controlled fixture layers, non-real feature count, fixture attribution and lineage | C4-003, ACT-001, DATA-LINEAGE-001 | `scripts/spatial-b2-integration-check.mjs` |
| Fixture rollback | controlled fixture selected, then source returns synthetic | obsolete layers removed before sources | obsolete source count 0; invalid fixture object cleared; point/AOI context retained | STATE-001, ACT-001 | `scripts/spatial-b2-integration-check.mjs` |
| Partial layer failure | one fixture layer unavailable/ineligible | per-layer fallback | eligible layer stays active; failed layer maps to declared synthetic fallback | ACT-001, DATA-LINEAGE-001 | `scripts/spatial-b2-integration-check.mjs` |

## Layer, selection and attribution parity

| Visible state | Required source/layer behavior | Required attribution behavior | Selection/lineage behavior |
|---|---|---|---|
| Synthetic local layers visible | enabled synthetic catalogue entries render | local fixture attribution appears only for visible governed layers | synthetic object carries demo/seed status, never official status |
| All synthetic local layers hidden | governed synthetic sources/layers are hidden | their attribution IDs are absent | existing point/AOI remains independent of layer visibility |
| Controlled fixture visible | only checksum-matched reviewed fixture entries render | controlled OSM/Overture attribution-contract records appear; no provider geometry is inferred | canonical feature key, provider feature ID and source record ID remain separately addressable |
| User-uploaded GeoJSON visible | parsed user layer renders separately | user-data attribution is separate from fixture/provider attribution | official validation required; source mode remains user-provided |
| Mapbox usable | native Mapbox attribution remains available | Mapbox record emitted for Mapbox basemap mode | no GeoAI source record is substituted for Mapbox |
| Fallback grid | no Mapbox tile/style request is represented | no Mapbox attribution record in fallback-grid payload | selection remains a demo point coordinate |

## Artifact completeness trace

| Artifact | Source | SVG | Code mapping | Independent approval |
|---|---:|---:|---:|---:|
| C4-001 | yes | yes | yes | pending |
| C4-002 | yes | yes | yes | pending |
| C4-003 | yes | yes | yes | pending |
| BPMN-001 | yes | yes | yes | pending |
| STATE-001 | yes | yes | yes | pending |
| SEQ-001 | yes | yes | yes | pending |
| ERD-001 | yes | yes | yes | pending |
| DATA-LINEAGE-001 | yes | yes | yes | pending |
| ACT-001 | yes | yes | yes | pending |
| DEP-001 | yes | yes | yes | pending |
| API-001 | yes | yes | yes | pending |

The architecture gate checks source/render hashes and implementation symbols. It complements, but does not replace, the spatial integration assertions or independent visual/logical review.

Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.
