# GeoAI Explore v1 - Scenario-first MVP Shell

GeoAI Explore v1 adds a scenario-first product layer at `/explore` without replacing the existing map-first workspace, projects dashboard, analysis APIs, comparison views, Data Room or report package flows.

## What Changed

- Added a new `/explore` route with a premium SaaS-style shell for scenario-first spatial decision workflows.
- Added B2C/B2B audience selection and role chips as a lightweight foundation for future onboarding.
- Added a data-driven Explore scenario registry with 10 scenarios: 5 B2C and 5 B2B.
- Added deterministic Dubai demo candidate generation for points, polygons and tourist routes.
- Added local candidate selection, analysis preview, save state, compare tray and safe Workspace handoff.
- Added a dedicated Explore map panel with candidate markers, polygons, routes and a graceful fallback when `NEXT_PUBLIC_MAPBOX_TOKEN` is unavailable.

## Data And Claims

Explore v1 uses sample, open-context and demo-seed records only. It does not connect live official Dubai data and does not validate legal, cadastral, zoning, planning, ownership, valuation, title, entitlement or approval status.

Required caveat shown in the UI:

> Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.

## Known Limitations

- Candidate data is deterministic sample/demo context only.
- Report package creation from Explore is disabled until candidates are attached to saved project/Data Room context.
- Workspace handoff passes safe candidate context through session storage and query parameters, but the existing workspace remains the primary analysis surface.
- Role-based personalization is UI/state-ready only; no registration or onboarding flow is implemented in this sprint.
- Mapbox remains optional; the Explore page shows a simplified fallback map if the public token is missing.

## Suggested Next Sprint

- Read Explore candidate context inside `/workspace` and prefill the selected point/AOI analysis workflow.
- Add a project-scoped saved-candidate model.
- Connect Explore candidates to report package creation through existing project/Data Room APIs.
- Add richer scenario-specific filters and candidate explanation panels.
- Add test coverage for scenario registry integrity and candidate generation.
