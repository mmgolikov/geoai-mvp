# Workspace, Project Hub and Report Alignment Corrections v1 Change Request

## Control

- Change request: `CR-DEV6-007`
- Date: 2026-07-12
- Base: authoritative `main` at `5ebd67ba7088538607bafa0b671ed177da7822a5`
- Branch: `dev6-workspace-projecthub-report-alignment-v1`
- Merge and Production release: not approved

## Problem

The Workspace right panel contains nested scrolling and a duplicate Active workflow summary, the dashboard suitability card is wider than the intended desktop composition, Project Hub summary cards leave unused vertical space, and printable report values can diverge from the dashboard presentation. Data Readiness / Source Lineage also appears before the project analyses, comparisons and reports that users need first.

## Business Reason

The demo workflow should present one consistent screening story from setup through dashboard, project review and printable evidence. The same selected target, coordinates, suitability, posture, confidence, validation state and rationale should remain recognizable across those surfaces.

## Affected Users And Screens

- B2B, B2G and B2B2G demo reviewers using `/workspace` and `/projects`.
- Users opening the analysis dashboard and printable analysis reports.
- Workspace breakpoints at 390x844, 430x932, 768x1024, 1366x768 and 1440x900.

## Approved Scope

- Compact Scenario setup and remove nested scrolling from Workspace content blocks.
- Keep Custom Query in the main Workspace flow and remove the duplicate Active workflow block.
- Narrow and rebalance the dashboard suitability card at desktop widths.
- Balance Project Hub KPI card content vertically.
- Move Data Readiness / Source Lineage below analyses, saved candidates/AOIs, comparisons, reports and project files.
- Derive printable analysis identity and decision fields from the same dashboard model.
- Reuse the current deterministic print-safe map renderer for object/AOI context.

## Data And Design Impact

No API contract, Supabase, migration, Auth, Storage, environment, secret or Figma change is included. The existing responsive baseline and visual language are preserved. The rendered map context is schematic and uses the current object/AOI and coordinates; it is not a live official map or an external screenshot service.

## Risks And Limitations

- The print map is a deterministic schematic context block, not survey, parcel, zoning or cadastral evidence.
- Browser viewport checks do not replace physical-device certification.
- Report alignment applies when the report contains the saved analysis payload; legacy records without that payload retain stored fallback values.

## Acceptance Criteria

- Scenario setup is compact and contains no internal scrollbar.
- Custom Query remains in the main flow; Active workflow is removed.
- Sticky actions remain usable without covering inputs and horizontal overflow is zero at the controlled viewports.
- Dashboard suitability and Decision Posture cards form a balanced desktop pair, with confidence and validation metadata on one line.
- Project Hub KPI cards use their height evenly.
- Data Readiness / Source Lineage follows project analyses, comparisons and reports.
- Printable analysis output matches dashboard target, coordinates, suitability, posture, confidence, validation state and rationale.
- Printable analysis output includes a clearly labeled object/AOI map context.
- The required caveat remains visible and no unsupported official/live claim is added.

## Rollback

Revert the single corrective branch changeset. No database, environment, deployment or external-service rollback is required.

## Out Of Scope

- Merge or Production deployment.
- New design or Figma implementation.
- Supabase migrations or writes.
- Auth enforcement, Storage policy or environment changes.
- New map, data or official-source integration.

## Data Honesty Note

Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.
