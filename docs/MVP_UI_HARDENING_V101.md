# MVP UI System Hardening v1.0.1

Date: 2026-06-21

This sprint hardens GeoAI MVP layout quality without changing product scope, scoring logic or data meaning.

## Issues Fixed

- Landing hero dashboard had too much dense text inside the map mockup, causing chips and labels to compete.
- Landing Data & Evidence badges could overflow when status labels were too long.
- Analysis dashboard metadata cards were visually separated from the main decision hierarchy and could create empty vertical gaps.
- Comparison dashboard top section had unused space and needed a stronger decision summary.
- Printable report links could fail if the server/local report record was unavailable immediately after a valid generated report action.
- Report map fallback did not explicitly show selected geometry in all failure/missing-token cases.

## Rules Applied

- Container-first layout: content must fit parent bounds before adding detail.
- No-overflow: `min-w-0`, bounded badges, truncation and wrapping for long names.
- No-overlap: hero map text was reduced and layered above graphics.
- Equal-height rows: comparison top cards now use stretch/flex patterns.
- Information priority: decision and validation content appears before secondary metadata.
- Report maps: selected geometry must be visible, with static fallback if Mapbox is unavailable.
- Printable routes: current report payload is stored as a session fallback before opening the print route.

## Reusable Primitives Added

- `SafeBadge`
- `SafeText`
- `SafeCard`
- `EqualHeightGrid`
- `DecisionSummaryBox`

These primitives are intentionally lightweight and should be used where they prevent recurring overflow, uneven-card or hierarchy issues.

## Report Map Rules

- Screen dashboards may use Mapbox if stable.
- Report/print surfaces must have a stable fallback.
- Fallback maps must show the selected object or compared sites, not a blank grey block.
- Geometry labels must clearly state that official validation is required.

## Printable Route Rules

Preferred flow:

1. Save report payload with `/api/reports`.
2. Store a session fallback payload for the current browser action.
3. Open `/reports/[id]/print`.
4. Render server/local report if found.
5. If missing, render the session fallback.
6. If both are missing, show a recovery message.

## QA Checklist

- Landing hero: no overlapping text, no chip/mini-card collisions, selected site label readable.
- Data & Evidence: all badges stay inside cards at 1728px, 1440px and 1280px.
- Analysis dashboard: map visible, selected geometry/fallback visible, metadata compact.
- Comparison dashboard: top section has Decision Summary, no dead space.
- Printable reports: analysis and comparison reports open after valid generated actions.
- Print preview: map/fallback, data used, validation checklist and next actions are visible.
- Data honesty: no false official/live/cadastral/parcel/zoning claims.

## Remaining Risks

- Browser print/save PDF still depends on the user's browser print engine.
- Session fallback only works in the same browser session that generated the report.
- Pixel-perfect visual QA should still be performed in Chrome before investor/client sessions.
