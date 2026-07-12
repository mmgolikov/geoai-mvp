# Workspace, Project Hub and Report Alignment Corrections v1.1 Change Request

## Control

- Change request: `CR-DEV6-007`
- Date: 2026-07-12
- Base: authoritative `main` at `5ebd67ba7088538607bafa0b671ed177da7822a5`
- Branch: `dev6-workspace-projecthub-report-alignment-v1`
- Merge and Production release: not approved
- Corrective status: v1.0 failed founder acceptance and independent release audit; v1.1 patches the same draft PR

## Problem

The v1.0 Workspace correction passed review, but the overall package failed acceptance. Seeded print routes could resolve stale partial local records and call `.map()` on absent legacy collections, producing an independently detected HTTP 500 and invalidating the previous report-validation claim. The dashboard evidence row and top-card geometry did not match the requested element or symmetry, Project Hub rendered duplicate Data Readiness sections in the wrong order, and the seeded print path used a schematic rather than a captured map image.

## Business Reason

The demo workflow should present one consistent screening story from setup through dashboard, project review and printable evidence. The same selected target, coordinates, suitability, posture, confidence, validation state and rationale should remain recognizable across those surfaces.

## Affected Users And Screens

- B2B, B2G and B2B2G demo reviewers using `/workspace` and `/projects`.
- Users opening the analysis dashboard and printable analysis reports.
- Workspace breakpoints at 390x844, 430x932, 768x1024, 1366x768 and 1440x900.

## Approved Scope

- Compact Scenario setup and remove nested scrolling from Workspace content blocks.
- Keep Custom Query in the main Workspace flow and remove the duplicate Active workflow block.
- Keep the dashboard evidence row to one visible desktop line while retaining the full caveat through accessible text.
- Rebalance Decision Posture and Suitability as equal-width cards with aligned content zones and controls.
- Balance Project Hub KPI card content vertically.
- Keep one canonical Data Readiness / Source Lineage section after all project-work and diagnostics panels.
- Derive printable analysis identity and decision fields from the same dashboard model.
- Prefer an optional report-payload map capture from the existing rendered workspace map and use a labeled schematic only when no capture exists.
- Resolve known seeded report IDs from canonical complete fixtures only in local/demo fallback, without overriding configured Supabase records or user report IDs.
- Normalize optional legacy report collections before rendering.

## Data And Design Impact

No API contract, Supabase, migration, Auth, Storage, environment, secret or Figma change is included. The existing responsive baseline and visual language are preserved. Map snapshots are captured from the existing browser-rendered map; they are screening context, not official geometry evidence or an external screenshot service.

## Risks And Limitations

- A labeled schematic remains available only when a report has no captured map snapshot.
- Browser viewport checks do not replace physical-device certification.
- Canonical seed precedence is limited to fixed demo IDs in local/demo fallback; it does not repair arbitrary incomplete durable records.

## Acceptance Criteria

- Scenario setup is compact and contains no internal scrollbar.
- Custom Query remains in the main flow; Active workflow is removed.
- Sticky actions remain usable without covering inputs and horizontal overflow is zero at the controlled viewports.
- Dashboard suitability and Decision Posture cards form an equal-width desktop pair with aligned zones and bottom controls.
- The compact dashboard evidence row occupies one line at 1366x768 and 1440x900, with the full limitation exposed accessibly.
- Project Hub KPI cards use their height evenly.
- Exactly one Data Readiness / Source Lineage heading follows every project-work and diagnostics panel.
- Printable analysis output matches dashboard target, coordinates, suitability, posture, confidence, validation state and rationale.
- Both seeded print routes return HTTP 200 with normalized, populated content.
- The seeded analysis report renders a real deterministic map screenshot captured from the existing dashboard map state.
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
