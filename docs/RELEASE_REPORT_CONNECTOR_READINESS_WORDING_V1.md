# Report Connector Readiness Wording Correction v1

## Summary

Printable analysis and comparison reports now distinguish an available manual connector import path from an attached verified snapshot. The shared Validation Governance Appendix defaults to the conservative connector evidence state.

## Changes

- Added a pure connector display helper with a conservative default.
- Replaced direct internal-status formatting in the shared report appendix.
- Preserved an explicit future verified-attachment path without activating it.
- Added focused source-contract checks for wording, shared rendering, caveat preservation, and heuristic absence.

## Validation

Release validation covers dependency installation, lint, Workspace regression checks, data-honesty checks, API contracts, runtime-status matrices, the focused connector wording check, build and route smoke. Physical Chromium PDFs must retain five A4 pages for the analysis report and four A4 pages for the comparison report, with unchanged maps and report values. Evidence identifiers are recorded in the draft pull request.

## Data Honesty

The connector registry describes implementation readiness, not report evidence. Current seeded reports do not contain an explicit connector-to-evidence relationship and therefore do not claim that a verified snapshot is attached. No file-name, text, provider, or fuzzy-matching inference is used.

Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.

## Limitations

- A verified attachment state requires a future explicit connector, report, review, expiry, and lineage relationship.
- This release does not ingest snapshots, mutate data, or add official/live integrations.
- Report values, captured maps, layout, PDF dimensions, and pagination are unchanged.
- No Supabase, Auth, memberships, RLS, Storage, environment, secret, Figma, merge, or Production action is included.

## Rollback

Revert the micro-package commits to return to `main` at `852603469549cba934718737513eff0542aeb34b`. No data rollback is required.
