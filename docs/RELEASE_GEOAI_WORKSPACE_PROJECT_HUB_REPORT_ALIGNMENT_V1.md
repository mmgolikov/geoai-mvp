# GeoAI Workspace, Project Hub and Report Alignment Corrections v1

## Release Candidate

- Change request: `CR-DEV6-007`
- Base: `main` at `5ebd67ba7088538607bafa0b671ed177da7822a5`
- Scope: Workspace, analysis dashboard, Project Hub and printable analysis report consistency
- Status: draft PR candidate; no merge or Production deployment is included

## What Changed

- Workspace Scenario setup uses a compact, normal-flow control grid with no nested section scrollbars.
- Custom Query remains in the primary flow and the duplicate Active workflow card is removed.
- The dashboard suitability card is narrower, with one-line confidence and validation metadata in the approved desktop composition.
- Project Hub KPI cards distribute label, count and support text vertically, and Data Readiness / Source Lineage follows the project content area.
- Both reachable analysis print paths use the dashboard model for selected target, suitability, posture, confidence, validation state and rationale.
- Printable analysis output includes a deterministic object/AOI map context derived from the current geometry label and coordinates.

## Validation Evidence

- `npm run lint`: passed.
- `npm run build`: passed; 56 static pages generated and relevant routes compiled.
- `npm run test:workspace-panel`: passed.
- `npm run test:data-honesty`: passed with zero findings across 265 scanned files.
- `npm run test:api-contract` against the local built app: passed for 12 API contracts.
- Required route smoke: all routes returned HTTP 200.
- Workspace browser checks passed at 390x844, 430x932, 768x1024, 1366x768 and 1440x900 with zero horizontal overflow, no Scenario setup internal scroll and no Custom Query/action overlap.
- Dashboard browser check at 1440x900 confirmed equal top-card heights, a 6 px width delta and one-line confidence/validation metadata.
- Project Hub browser check confirmed vertically balanced KPI content and Data Readiness / Source Lineage after the analyses, comparisons, reports and project files area.
- Printable report browser check confirmed dashboard-aligned identity, coordinates, suitability, posture, confidence, validation state and rationale, plus visible map context and caveat.

## Known Limitations

- Map context is a print-safe schematic, not a live map capture or official geometry source.
- Legacy report records without an analysis payload use their stored fallback report fields.
- No physical-device certification, external integration or release-readiness claim is included.

## Data Honesty

Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.
