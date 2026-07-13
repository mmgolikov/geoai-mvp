# CR-DEV6-009 - Report Connector Readiness Wording Correction v1

## Status

Approved for draft implementation from `main` at `852603469549cba934718737513eff0542aeb34b`. This change request does not authorize merge or Production deployment.

Confluence source: `CR-DEV6-009 - Report Connector Readiness Wording Correction v1`, page `5931019`.

## Root Cause

The printable Validation Governance Appendix formatted the internal connector status `manual_snapshot_ready` as a client-facing readiness statement. That registry status describes an available manual import path; it does not prove that the report contains an attached and reviewed snapshot.

## Evidence Semantics

The current `EvidenceFileAsset` and `EvidenceReviewSummary` contracts do not contain an explicit connector-to-evidence relationship. A verified connector snapshot therefore cannot be inferred from file names, MIME types, notes, provider names, connector configuration, source-registry presence, or unrelated review states.

For current reports, `manual_snapshot_ready` displays as:

`manual import path available; no verified snapshot attached`

The shared pure helper defaults to this conservative state. It preserves an explicit future path for `verified snapshot attached`, but a caller may enable it only after the data model proves connector ID, report linkage, accepted review state, non-expiry, and relevant source/date/category lineage. This package does not add that model or activate that state.

## Scope

- Shared connector display helper in the existing official connector-readiness module.
- Shared Validation Governance Appendix integration for analysis and comparison reports.
- Focused deterministic source-contract check.
- Change Request and release documentation.

## Data Impact

Read-only presentation correction. No report values, maps, layout, PDF configuration, database records, Supabase resources, Auth, memberships, RLS, Storage, environment variables, or secrets are changed.

## Acceptance And Evidence

Acceptance requires standard local checks, seeded report route and wording assertions, unchanged report values and maps, physical Chromium PDF evidence with unchanged A4 page counts, the permanent GeoAI Quality Gate, and a READY Vercel Preview. Exact run, artifact, and deployment identifiers are recorded in the draft pull request.

Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.
