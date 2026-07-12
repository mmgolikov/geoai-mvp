# GeoAI Workspace, Project Hub and Report Alignment Corrections v1.1

## Release Candidate

- Change request: `CR-DEV6-007`
- Base: `main` at `5ebd67ba7088538607bafa0b671ed177da7822a5`
- Scope: Workspace, analysis dashboard, Project Hub and printable analysis report consistency
- Status: draft PR candidate; no merge or Production deployment is included

## Corrective History

- v1.0 failed founder visual acceptance and independent release audit.
- The earlier validation claim was invalidated when independent Preview testing found HTTP 500 on the seeded analysis report route.
- v1.1 corrects the same draft PR; it does not create a separate release or authorize merge.

## What Changed

- Workspace Scenario setup uses a compact, normal-flow control grid with no nested section scrollbars.
- Custom Query remains in the primary flow and the duplicate Active workflow card is removed.
- The dashboard evidence/limitation row is compact and limited to one visible desktop line while its full wording remains available through `title` and accessible text.
- Decision Posture and Suitability use equal-width cards with matching top, middle and bottom zones and aligned controls.
- Project Hub retains one canonical Data Readiness / Source Lineage section as the final substantive section after all project-work panels.
- Reserved seeded report IDs use complete canonical fixtures when a local or configured legacy seed row is absent or incomplete. Complete configured records and arbitrary user report IDs retain precedence; no record is written or changed.
- Optional report arrays and source-lineage collections are normalized before rendering, preventing the legacy partial-record `.map()` failure.
- The analysis report contract carries an optional captured map snapshot from the existing rendered workspace map. The seeded Marina report includes a committed deterministic browser capture; reports without one use an explicitly labeled fallback.
- Saved-report timestamps are labeled as saved timestamps rather than implying fresh generation.

## Validation Evidence

The final v1.1 evidence is produced from the patched head. Required checks include lint, build, workspace/data-honesty/API contracts, route smoke, a bounded browser artifact, the permanent GeoAI Quality Gate and a READY Vercel Preview. Run, job, artifact and deployment identifiers are recorded in PR #61 after those checks complete.

## Known Limitations

- Captured map context is a browser-rendered screening snapshot, not an official geometry, parcel, survey, zoning or cadastral source.
- Arbitrary legacy durable records without a complete payload remain limited to safely normalized stored fields; only reserved demo IDs receive read-time canonical repair.
- No physical-device certification, external integration or release-readiness claim is included.

## Data Honesty

Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.
