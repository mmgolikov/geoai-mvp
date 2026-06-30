# GeoAI Explore v1.1 - Embedded Scenario Command Panel

GeoAI Explore v1.1 moves the Explore scenario workflow into the existing workspace command panel. `/workspace` and `/explore` now share the same map-left, command-panel-right experience, with `/explore` opening the Explore setup controls by default.

## What Changed

- Embedded B2C/B2B audience switching, role selection, scenario selection, scenario summary, setup controls, Custom Query and candidate preview inside the right Analysis Panel.
- Changed `/explore` from a standalone heavy shell to the same workspace-style layout used by `/workspace`.
- Reused the Explore v1 scenario registry, filter schema and deterministic candidate generation model.
- Added Explore candidate overlays to the workspace map for point, polygon and route candidates.
- Enabled candidate preview or map-overlay selection to become the current workspace analysis target for Run Express Analysis.
- Preserved existing map selection, AOI drawing, demo object selection, comparison, report and footer CTA behavior.

## Data And Claims

Explore v1.1 remains a screening workflow. Candidates are deterministic demo/open-context hypotheses and do not validate legal, cadastral, zoning, planning, ownership, valuation, title, entitlement, financing, purchase, rental or development claims.

Required caveat remains:

> Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.

## Known Limitations

- Candidate generation is still local deterministic sample logic, not live official Dubai data.
- Role personalization affects UI state and scenario framing only; onboarding and account-specific personalization are not implemented.
- Explore candidate selection maps to the existing workspace target model; project-scoped saved-candidate persistence is still future work.
- Mapbox remains optional. When a public token is unavailable, fallback markers still allow candidate selection in the demo map.

## Suggested Next Sprint

- Add project-scoped saved Explore candidates and Data Room attachment.
- Add richer scenario-specific explanations for candidate ranking.
- Persist Explore scenario context with analysis runs and report packages.
- Add automated tests for scenario-to-workspace target conversion.
