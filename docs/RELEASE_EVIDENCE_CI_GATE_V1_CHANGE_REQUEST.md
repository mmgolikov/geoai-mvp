# GeoAI Release Evidence and CI Gate v1 — Change Request

## Document control

| Field | Value |
| --- | --- |
| Change Request | CR-DEV6-001 |
| Work package | WP-009 |
| Version | v1.1 |
| Status | Released baseline / CR-DEV7-002 extension in review |
| Owner | GeoAI Engineering / Delivery OS |
| Source of truth | Confluence REL-EVID-001 and AUD-DEV6-001 |

## Problem

The v1.0 Quality Gate is released and runs for pull requests and manual dispatch. PR #81 exposed the remaining control gap: the exact merge commit had no direct GitHub Actions run, and permanent Spatial B1/B2A checks were not part of the workflow. CR-DEV7-002 adds push-to-`main` evidence and the spatial source-contract regressions without changing Product or deployment behavior. The source-level Workspace regression check must not be described as responsive browser certification.

## Business reason

A non-deploying CI gate reduces regression risk, makes failures traceable and prevents unsupported production, pilot, official-data or security claims from passing unnoticed.

## Users

- GeoAI founder / release approver
- GeoAI Delivery OS
- Engineering / Codex
- Product Design and QA
- Data and security reviewers

## Affected surfaces

No product UI, API response, database, authentication or design surface is intentionally changed.

## Engineering impact

- Add a GitHub Actions pull-request workflow.
- Execute existing TypeScript, build, access, RLS-plan, Workspace and API-contract checks.
- Add a conservative source claim scan for unsupported affirmative data/readiness wording.
- Preserve non-secret evidence files as a short-lived workflow artifact.

## Data impact

None. The workflow runs against local/demo fallback and performs no external writes.

## Design impact

None. Responsive screenshot automation remains a separate WP-010 gate unless safely added later.

## Risks

1. A claim scan could create false positives if negated or validation-context wording is not recognized.
2. Local built-server startup can fail or time out in CI.
3. A green static/API workflow could be overinterpreted as responsive, security or production-readiness certification.

## Mitigations

- Scan only user-facing source roots and retain context for reviewed matches.
- Fail only clear affirmative prohibited wording.
- Record browser/responsive evidence as pending unless implemented separately.
- Keep all readiness and data-honesty caveats explicit.

## Acceptance criteria

1. Workflow runs for pull requests to `main`, pushes to `main` and manual dispatch.
2. Workflow uses Node.js 22 and `npm ci`.
3. TypeScript, build, access-decision, static RLS-plan, Workspace-panel, Spatial B1, Spatial B2A and API-contract checks run.
4. Core UI routes and seeded print routes return HTTP 200 on the local built server.
5. Data-honesty claim scan produces a JSON evidence file and fails on clear unsupported affirmative claims.
6. Workflow uploads non-secret evidence artifacts even after a failed step where possible.
7. Workflow does not deploy, configure environments, run migrations, create users, enable hard access or write external data.
8. Browser/responsive certification is not claimed by this work package.

## Out of scope

- Production deployment
- Vercel environment changes
- Supabase migrations or writes
- Auth, membership or RLS behavior changes
- Product or Figma changes
- Official/live data integrations
- Merge approval

## Required caveat

**Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.**
