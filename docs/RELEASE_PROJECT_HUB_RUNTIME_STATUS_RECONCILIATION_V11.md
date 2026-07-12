# Project Hub Runtime Status Reconciliation v1.1

## Summary

GeoAI now derives Project Hub executive runtime rows from the same conservative, read-only contract returned by `/api/pilot-backend/status`. The change removes contradictory loading-state conclusions while preserving detailed technical blockers in Advanced project diagnostics.

## Changes

- Added a pure runtime executive-status contract with explicit demo workflow, confidential-pilot, Auth, repository, Supabase, Storage, Audit, access, and RLS states.
- Added `executiveStatus` to the existing backend status response without removing blockers, next actions, caveats, runtime readiness, or Supabase activation evidence.
- Added neutral pre-hydration Project Hub rows.
- Corrected memo, connector, and Storage display wording.
- Deduplicated compact report scenario/target metadata with case-insensitive whitespace and punctuation normalization.
- Added offline source and matrix checks.

## Preserved Baselines

- PR #60 Workspace responsive behavior is unchanged.
- PR #61 Workspace, Project Hub ordering, report values, captured map, printable layout, and PDF behavior are unchanged.
- Data Readiness / Source Lineage remains the final substantive Project Hub section.

## Validation

Required validation includes `npm ci`, lint, Workspace checks, data-honesty checks, API contracts, the runtime contract source/matrix check, build, local route smoke, hydrated browser evidence, the permanent GeoAI Quality Gate, and a READY Vercel Preview.

## Data Honesty

The public demo workflow may remain available through local/demo fallback while confidential access stays blocked. Runtime evidence does not activate Production Supabase persistence, private Storage, hard access, or live RLS behavior unless those states are explicitly verified in that runtime.

Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.

## Limitations

- Production remains public demo/local fallback under the verified baseline.
- Confidential access remains blocked until Auth, membership, live RLS, Storage scope, Audit, and validation evidence gates are complete.
- Connector readiness remains metadata/display state; no live official integration is introduced.
- No database, Supabase, Auth, RLS, Storage, environment, secret, or Production configuration is changed.

## Rollback

Revert the v1.1 commits to return to `main` at `8051390bb41cbffb3382dc092a9772ef3b452889`. No data rollback is required because this package is read-only.
