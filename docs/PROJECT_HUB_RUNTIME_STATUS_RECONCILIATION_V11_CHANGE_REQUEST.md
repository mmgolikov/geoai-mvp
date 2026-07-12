# CR-DEV6-008 - Project Hub Runtime Status Reconciliation v1.1

## Status

Approved for draft implementation from `main` at `8051390bb41cbffb3382dc092a9772ef3b452889`. This change request does not authorize merge or Production deployment.

Confluence source: `CR-DEV6-008 - Project Hub Runtime Status Reconciliation v1.1`, page `5505938`.

## Problem

Project Hub previously derived executive runtime labels from unresolved client state and several independent API fields. That allowed a neutral loading state, public demo availability, confidential access gates, repository fallback, and technical blockers to be presented as competing conclusions.

Historical rejected labels included `Sample pilot`, `Pilot access`, an initial `Local Fallback Only`, `Client-ready memo generation`, and `manual snapshot ready` without an attached verified snapshot. They are recorded here only as before-state evidence and are not approved Product wording.

Report cards also joined stored scenario and target fields without normalization. A stale analysis record could therefore repeat the same target twice.

## Required Contract

`src/lib/platform/runtime-status-contract.ts` is the canonical read-only executive contract shared by `/api/pilot-backend/status` and hydrated Project Hub rows. It derives:

- environment;
- access mode;
- repository mode;
- public demo workflow availability;
- confidential-pilot gate status;
- Supabase/schema runtime reachability;
- Storage runtime reachability;
- Audit, access-enforcement, and RLS status rows;
- the required data-honesty caveat.

Before hydration, Project Hub renders only neutral `Checking` rows for the public demo workflow, confidential pilot, and Auth. Detailed blockers and next actions remain in Advanced project diagnostics after hydration.

## Wording Corrections

- Reports / Memos uses: `Review-ready screening memo previews remain connected to the workspace result and report flow.`
- A manual connector path without attached verified snapshot evidence uses: `manual import path available; no verified snapshot attached`.
- Storage distinguishes `not connected in this runtime`, `configured but not verified`, and `reachable in this runtime`.

These are display corrections only. Connector records, Storage resources, and database data are not changed.

## Report Metadata

Compact Project Hub report metadata reuses `src/lib/report-display-normalization.ts`. Scenario and target are trimmed and compared case-insensitively after whitespace and punctuation normalization. Duplicate target values are replaced by a meaningful project scenario where available. Comparison scenario and compared-item summary remain separate.

Printable report contracts, captured maps, report values, and PDF pagination are unchanged.

## Scope

- `src/lib/platform/runtime-status-contract.ts`
- `app/api/pilot-backend/status/route.ts`
- `components/project-dashboard/project-dashboard.tsx`
- `src/lib/report-display-normalization.ts`
- `scripts/runtime-status-contract-source-check.mjs`
- this change request and the v1.1 release note

PR #59 is historical source reference only. Its branch and commit history are not modified, rebased, merged, or copied.

## Verification

- Offline contract matrices for Production public demo, Preview read-only evidence, neutral initial state, and incomplete hard-access evidence.
- Source checks for API/UI contract use, approved wording, connector state, Storage state, metadata normalization, and stale Project Hub labels.
- Standard lint, workspace, data-honesty, API-contract, build, route, hydrated browser, permanent Quality Gate, and Vercel Preview checks.

## Constraints

No Supabase migration or write, Auth user or membership change, RLS policy change, Storage bucket or policy change, environment variable, secret, Figma change, Production configuration, merge, or Production deployment is authorized.

Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.
