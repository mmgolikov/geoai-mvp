# GeoAI Pilot UX v3.6 - Release Candidate Hardening and Visual QA Freeze

## Summary

GeoAI Pilot UX v3.6 is a final hardening pass on PR #27 before human release-candidate review. It preserves the existing product flow and focuses on dashboard cockpit polish, visual balance and pilot-readiness QA.

## Visual Fixes

- Aligned the yellow Decision Posture card and the score/gauge card in the dashboard cockpit top row.
- Kept the Decision Posture content compact: label, posture, summary and rationale disclosure remain visible without filler copy.
- Added a sixth KPI card, Evidence, so the cockpit KPI grid balances as a 3 + 3 layout in the target desktop viewport.
- Kept KPI values short and caveated; the Evidence KPI describes source basis without claiming official validation.

## Release Candidate Review Scope

- Landing, workspace, dashboard, criteria-first comparison, candidate dashboard switching and projects views.
- Supabase fallback/readiness APIs and data honesty caveats.
- Map-first and criteria-first product flows.
- Route smoke across public app routes and health/status APIs.
- Desktop visual QA at 1440x900, 1600x900 and a MacBook-like wide viewport.

## Validation

- `npm run lint`
- `npm run build`
- Route smoke for `/`, `/workspace`, `/projects`, `/explore`, `/demo`, `/api/health`, `/api/db/health`, `/api/platform/activation-status` and `/api/pilot-backend/status`
- Browser visual QA for map-first analysis, criteria-first comparison and candidate dashboard switching

## Known Limitations

This release candidate does not claim production readiness, live official Dubai data integration, or legal/cadastral/zoning/planning/ownership/valuation validation. Outputs remain screening hypotheses until official or client-approved evidence is validated.
