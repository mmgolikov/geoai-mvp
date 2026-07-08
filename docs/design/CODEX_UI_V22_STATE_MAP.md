# Codex UI v2.2 State Map

Status: isolated preview implementation reference  
Branch: `codex/ui-v22-isolated-preview`  
Approval: `docs/design/CODEX_UI_V22_ISOLATED_PREVIEW_APPROVAL.md`

This note maps the approved Figma v2.2 preview states to the existing React implementation. It is a layout/state reference only; it does not approve merge, production deployment, Supabase changes, auth changes, secrets or environment changes.

## State Mapping

| Component | State | Code mapping |
|---|---|---|
| `AnalysisPanel` | `setup-required` | No selected point, object, AOI or candidate. The command header shows setup guidance and the pinned footer primary action remains disabled. |
| `AnalysisPanel` | `selected-AOI` | A point, object, AOI or candidate is selected. The selected target card is active and the primary footer action can run screening when existing business rules allow it. |
| `AnalysisPanel` | `report-ready` | A current analysis result exists. The command header switches to analysis-ready language and report/export actions remain available through existing callbacks. |
| `ProjectHub` | `control-card` | Segment switcher, active project selector and workspace actions are nested inside the hero card. Project creation is a secondary collapsible block below the card. |
| `DataReadiness` | `control-card` | The Data Readiness / Source Lineage section reuses the same active-project control-card pattern without changing source-lineage data. |
| `DataReadiness` | `route` | `/projects#data-readiness` is the primary first-preview route strategy; `/data-readiness` redirects to that anchored Project Hub section. |
| `ReportPreview` | `action-row` | `Print PDF` and `Back` are grouped inside the report header safe padding. `Print PDF` prepares the printable route first when the route is available, then falls back to browser print only without that route. |

## Caveat

Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.
