# Post-release Quality and Spatial Regression Gate v1 — Change Request

## Document control

| Field | Value |
| --- | --- |
| Change Request | CR-DEV7-002 |
| Work packages | WP-009 / WP-023 |
| Version | v1.0 |
| Status | Implementation candidate |
| Owner | GeoAI Engineering / Delivery OS |
| Branch | `dev7-main-quality-spatial-b2a-regressions-v1` |
| Authoritative base | `cd5f9efe791ff7d5ac46597925bbf17eb60d2754` |

## Current state

PR #81 is merged. Vercel Production deployment `dpl_94Tz2TZG5Pf8k1PGygTBjQBCQAkf` is READY on the exact merge SHA. The released Spatial B2A capability is inactive and fail-closed: Production remains synthetic/local fallback, demo-only and soft access.

The permanent `GeoAI Quality Gate` currently runs for pull requests and manual dispatch, but not for a merge commit pushed to `main`. The existing Workspace and Spatial B2A source-contract checks are also not executed together in the permanent workflow.

## Objective

Create non-deploying, exact-SHA post-merge evidence and permanently protect the released Workspace UX and Spatial B1/B2A fail-closed contracts.

## Changes

1. Trigger the existing Quality Gate for pull requests to `main`, manual dispatch and pushes to `main`.
2. Check out the exact pull-request head for PR runs and the exact event SHA for push/manual runs.
3. Preserve the existing workflow and job names.
4. Record Node, npm and tested commit metadata in the evidence artifact.
5. Run the permanent Spatial B1 contract check and preserve its JSON evidence.
6. Run the permanent Spatial B2A fallback check and preserve its activation, delivery, attribution, lineage and assertion evidence.
7. Preserve TypeScript and build output in addition to the existing static, API, route and runtime evidence.
8. Extend local route smoke to the current release-control routes.
9. Reconcile repository documentation to the merged PR #81 baseline.

## Acceptance criteria

1. The branch is based on exact current `main` SHA `cd5f9efe791ff7d5ac46597925bbf17eb60d2754`.
2. `GeoAI Quality Gate` runs on `pull_request`, `workflow_dispatch` and `push` to `main`.
3. Workflow permissions remain `contents: read`; no deploy or external write step exists.
4. Lint, access-decision, RLS-plan, Workspace, Spatial B1, Spatial B2A, data-honesty, build and API-contract checks pass.
5. Workspace checks preserve canonical Criteria-first then Map-first presentation, scenario defaults, removal of the redundant selection card and one sticky primary action.
6. Spatial checks preserve Production synthetic fallback, zero real geometry, rejected unapproved delivery/distribution states, attribution coverage, stable lineage and rollback hooks.
7. Core Product, health, readiness and seeded report routes return HTTP 200 from the built local application.
8. The evidence artifact records a tested SHA equal to the PR head on pull requests and the event SHA on pushes/manual runs, and contains no secrets, tokens, cookies, user files or real geometry.
9. Repository documentation no longer describes PR #81 as draft or unmerged.
10. The change does not claim browser-responsive, physical-device, security, legal, official-data, production-ready or pilot-ready certification.

## Evidence boundary

This gate is source-contract, build, API and route evidence. It does not replace the accepted 17-screenshot CR-DEV7-001 browser artifact and does not certify rendered responsive behavior. A permanent rendered-browser gate remains a separate approval and CI-cost decision.

## Out of scope

- Product UI or API behavior changes
- Real/open geometry delivery, distribution or activation
- B2B/B2C activation
- Vercel deployment or configuration changes
- Supabase, Auth, RLS, Storage or audit-data writes
- Environment variables or secrets
- Figma or architecture approval
- Merge approval

## Rollback

Revert the single CR-DEV7-002 commit or close the draft pull request. The current Product and Production deployment are unaffected.

## Required caveat

**Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.**
