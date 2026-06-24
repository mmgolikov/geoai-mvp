# Report Export & Client Deliverables v0.9

Date: 2026-06-21

GeoAI v0.9 adds a dedicated browser-print deliverable path for saved analysis and comparison reports. This is still an MVP/demo prototype, not a server-generated PDF system and not production/pilot-ready evidence.

## Report Types

### Analysis Report

Single selected point, polygon, uploaded feature, demo object or asset/site.

Includes:

- GeoAI branding and Demo/MVP report badge
- selected target, scenario, coordinates and generated date
- decision posture and executive memo
- selected geometry map context
- score overview
- market/spatial context
- key findings
- opportunities, risks and constraints
- source lineage / data used
- validation checklist
- recommended next actions
- data honesty disclaimer

### Comparison Report

Two to three selected points, demo objects, uploaded features or assets/sites.

Includes:

- GeoAI comparison report branding
- compared sites/assets
- scenario and generated date
- recommended option / winner
- comparison map context
- summary cards and score comparison
- differentiated risks and trade-offs
- source lineage / data used
- validation checklist
- recommended next actions
- data honesty disclaimer

## Printable Route

Dedicated printable route:

```text
/reports/[id]/print
```

The route loads the saved report from the v0.8 report repository. If Supabase is unavailable, it can read the local/browser fallback or seeded demo report records. If the report cannot be found, the page shows:

```text
Report not found. Generate or save a report first.
```

The printable route is a normal full-page report, not a modal and not dependent on hidden Workspace UI.

## Export Behavior

Current MVP export behavior:

- Workspace report preview remains available.
- Report preview includes an "Open printable report" action.
- Project Dashboard saved reports include an "Open printable report" action.
- Printable report page includes only "Back" and "Print / Save as PDF" in the top action row.
- Printable report actions must use a single guarded prepare-and-open flow.
- Never open a print route before the report payload or saved report id exists.
- Use same-tab navigation for printable report routes; do not open async popup windows or duplicate tabs.
- The print action should be controlled to prevent duplicate export actions.
- If preparation fails, show an inline error and do not open a new tab.

PDF export currently uses browser print/save as PDF. Server-side PDF generation is planned and is not implemented in v0.9.

## Map Rendering

The printable report uses a print-safe schematic map block. It avoids relying on interactive Mapbox during print, which reduces the risk of grey/blank map output in PDF.

The map block shows:

- selected target label or compared item labels
- coordinates where available
- geometry type/context where available
- explicit note that official validation is required

Interactive Mapbox remains available in the Workspace/dashboard experience.

## Source Lineage Requirements

Every printable report includes Data Used / Source Lineage grouped into:

- External data used
- Uploaded / client data
- Demo / sample fallback
- Planned validation sources

Each report must keep these distinctions visible:

- used
- available but not used where applicable
- planned validation
- official validation required
- not a live official feed
- not legal/cadastral/zoning/title validation

## Validation Checklist

Every printable report includes a validation checklist:

- Confirm parcel / plot boundary through an authorized municipal or customer-approved source.
- Validate zoning / planning constraints with the relevant authority or approved customer dataset.
- Validate market metrics against an agreed DLD / Dubai Pulse snapshot or customer-approved data.
- Review legal, ownership and title information outside GeoAI before transaction decisions.
- Confirm climate, flood and heat exposure through engineering or insurance-grade assessment if required.
- Confirm construction or progress evidence with agreed imagery and inspection workflow.

GeoAI supports screening and decision preparation, not final legal, cadastral, underwriting or valuation approval.

## Print QA Checklist

Before client sessions:

- Generate an analysis report from `/workspace`.
- Open `/reports/[id]/print`.
- Check browser print preview in Chrome.
- Confirm map block is visible.
- Confirm selected target and coordinates are visible.
- Confirm source lineage is visible.
- Confirm validation checklist is visible.
- Confirm cards do not split awkwardly.
- Confirm long source names and uploaded dataset names wrap safely.
- Generate a comparison report with 2-3 items.
- Confirm comparison score table/cards fit page width.
- Confirm winner/recommendation and differentiated risks are visible.
- Confirm no false official/live source claims appear.

## Known Limitations

- Browser print/save as PDF only; no server-side PDF generation yet.
- Printable map is schematic/print-safe, not a live Mapbox canvas.
- Local fallback reports are development/demo workspace records unless Supabase is configured.
- No authentication, multi-tenant access control or report permissions.
- Uploaded data is local/user-provided context and requires validation.
- Report content remains MVP/demo screening output with deterministic scoring and optional AI narrative.

## Data Honesty Rules

Do not claim:

- official parcel boundary
- official zoning boundary
- live DLD integration
- live GeoDubai GIS
- cadastral validation
- ownership verification
- certified valuation
- production-ready or pilot-ready status

Allowed framing:

- demo/sample/local context
- imported sample/offline snapshot
- open-geospatial baseline fixture
- customer-provided validation-required upload
- planned official validation source
- browser-print deliverable

## v0.9.1 UI Hardening Fixes

The v0.9.1 hardening pass adds:

- safer landing hero dashboard card sizing and shorter map callouts;
- badge containment rules for landing source-lineage cards;
- a comparison dashboard Decision Summary block to remove empty top-row space;
- a session fallback for `/reports/[id]/print` so current analysis/comparison reports can open even when server persistence is unavailable;
- reusable UI guardrails in [UI Layout Guardrails](UI_LAYOUT_GUARDRAILS.md).

## v2.8 Enterprise Report Packages

GeoAI v2.8 adds a structured report package layer on top of saved reports. Packages combine executive memo, AOI factsheet, AI decision memo, deterministic scoring, market/source context, validation governance, evidence review, Data Room, pilot workflow, known limitations and export manifest.

Routes:

- `/api/report-packages?projectKey=...`
- `POST /api/report-packages`
- `/api/report-packages/[id]/json`
- `/api/report-packages/[id]/export`
- `/report-packages/[id]/print`

Required caveats remain:

- screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.
- Report packages are decision-support deliverables, not certified valuation, legal, zoning, planning, cadastral or ownership conclusions.
- Browser print/save as PDF remains the current PDF workflow.

Printable routing rule:

1. Save the report through `/api/reports` where possible.
2. Store a current-session report fallback before opening the print route.
3. Open `/reports/[id]/print`.
4. The route tries the saved report first, then the browser session fallback, then shows a recovery message.

Known limitation: browser session fallback only works from the same browser session that generated the report. Durable cross-device report access still requires configured persistence and future auth/governance.

## v1.0.1 UI System Hardening Addendum

Report/export hardening now includes:

- report map fallbacks that explicitly draw selected geometry or compared-site markers when Mapbox is unavailable;
- compact source/run metadata placement in the analysis dashboard so secondary grey cards do not create empty visual gaps;
- a reusable Decision Summary pattern in comparison output;
- bounded badge and text patterns documented in [UI Layout Guardrails](UI_LAYOUT_GUARDRAILS.md);
- a current-session printable payload fallback before opening `/reports/[id]/print`.

Printable route behavior remains:

1. Load saved report by id.
2. If unavailable, render current browser session fallback.
3. If both are unavailable, show a clear recovery state.

Browser print/save PDF remains the MVP export method. Server-side PDF generation remains planned.
