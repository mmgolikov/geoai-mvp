# RTM-001 Requirements Traceability Matrix

Status: Review source artifact  
Owner: GeoAI Product / System Analysis  
Confluence target: 04.12 Requirements Traceability Matrix

## Purpose

Trace product, UX, data, API, report and governance requirements to implementation evidence and acceptance checks.

## Matrix

| Requirement ID | Requirement | Source document | Artifact link | Implementation target | Acceptance evidence |
|---|---|---|---|---|---|
| PR-001 | Workspace preserves selected spatial context | 02.01 MVP Overview | WF-001 | Workspace shell, map state | Map-first flow smoke and visual QA |
| PR-002 | Scenario selection is visible and stable | 02.06 Scenario Matrix | WF-001, WF-002 | Scenario panel | User can switch and run scenario without state loss |
| PR-003 | Dashboard shows summary, scores, risks and evidence | 05.04 Result Model | API-001, RPT-001 | Dashboard renderer | Dashboard renders structured result without invented fields |
| PR-004 | Custom query updates active analysis lineage | 04.07 Analysis Lifecycle | STATE-001 | Analysis state model | Query refinement updates current result state |
| PR-005 | Comparison works for two or more candidates | 04.10 Criteria First Wireflow | WF-002 | Compare dashboard | At least two candidates compare and export |
| PR-006 | Report export matches visible dashboard | 02.08 Report Data Mapping | RPT-001 | Report routes | Exported snapshot matches dashboard data |
| PR-007 | Project switching does not mix analyses | 07.04 Engineering Handoff | DOM-001 | Project state/store/API | Segment/project isolation QA passes |
| PR-008 | Source mode and confidence are visible | 05.05 Source Confidence Rules | DATA-LINEAGE-001 | Evidence UI/report appendix | Source/confidence labels visible in UI and report |
| GOV-001 | No unsupported official/pilot/production claims | 09.09 Current Delivery State | SRC-001 | UI, docs, reports | Data honesty QA passes |
| SEC-001 | No secrets or service credentials exposed | 07.08 Technical Roadmap | SEC-001 | API/status docs | Secret hygiene checks pass |

## Maintenance rule

Update this matrix after every merged PR that changes product flow, data model, API payload, report structure, evidence handling, source confidence, design state or release gate.
