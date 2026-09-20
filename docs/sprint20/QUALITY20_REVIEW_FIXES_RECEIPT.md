# Quality20 Review Fixes Receipt

Status: Local Candidate correction; not Released

## Authority

- Worktree: `/private/tmp/geoai-quality20-review-fixes`
- Branch: `codex/quality20-review-fixes`
- Starting commit: `87bf3d90dc45381713b26fbe708cbed6cbb5efab`
- Result commit: the commit containing this receipt
- No push, hosted-system mutation, Auth/environment change, Preview, or Production action is included.

## Corrective scope

1. Source-geometry relation parsing now fails closed when stitched outer shells duplicate, intersect, touch, or nest. Valid disjoint shells and valid holes remain supported.
2. Create preflight execution failures distinguish unavailable worker, bounded timeout, geometry-processing failure, and an exhausted bounded search. Technical failures preserve the draft and last valid result and provide an explicit retry. They do not claim that a layout is physically impossible.
3. The Create panel's primary brand accents align with the existing `#087f8c` Product palette. Warning and geometry-semantic colours are unchanged.
4. Positive browser fixtures use an AOI that the unchanged local solver can actually place. The former small AOI is retained as a negative solver fixture rather than weakening preflight.
5. Mobile result checks target the current shared 2D/3D preview and verify selected mode, ready canvas, saved geometry metadata, active alternative and matching KPI state.

## Verification

- `npm run lint`: PASS.
- `npm run build`: PASS; 81/81 routes generated.
- `node scripts/quality20-review-fixes-check.mjs`: PASS; six independent shell-topology fixtures plus valid-hole/disjoint preservation, preflight copy/retry, and palette checks.
- `npm run test:point-to-object-map-replacement`: PASS.
- `npm run test:point-to-object-find`: PASS.
- `npm run test:data-honesty`: PASS; 463 files, 0 findings.
- `tests/e2e/point-to-object-create-reliability.spec.ts`: PASS; 8/8 in one Chromium run, one worker, zero retries.
- The first sandboxed browser launch aborted before page creation with Chrome `SIGABRT` / process-control `EPERM`. The identical test command passed outside that sandbox restriction; this was an execution-environment failure, not a Product assertion failure.
- `npm run test:point-to-object-create`: core and preflight checks passed; the aggregate command's route checker was blocked by the shared dependency tree resolving the extensionless `next/headers` import under direct Node ESM. The optimized application build passed and this correction does not change that route.

## Claim boundary and limitations

This correction is local Candidate evidence only. It does not certify hosted data, Auth, Storage, Source custody, pilot readiness, Production readiness, demand, pricing, WTP, ROI, or official planning/valuation status.

Mandatory product caveat remains unchanged:

> Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.
