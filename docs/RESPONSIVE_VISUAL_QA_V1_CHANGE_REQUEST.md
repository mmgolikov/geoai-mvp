# GeoAI Responsive Visual QA v1 — Change Request

## Document control

| Field | Value |
| --- | --- |
| Change Request | CR-DEV6-002 |
| Work package | WP-010 |
| Version | v1.0 |
| Status | Evidence-harness implementation review |
| Owner | GeoAI Product Design + QA / Engineering |
| Source of truth | Confluence UX-QA-DEV6-001 and REL-EVID-001 |

## Problem

Current Production has source-level responsive protections and historical browser-review notes, but there is no reusable, current, viewport-specific screenshot and interaction evidence package covering the required phone, tablet, laptop, desktop and print states.

## Business reason

A deterministic responsive QA harness makes regressions visible before future UI merge decisions and separates source/static checks from actual rendered evidence.

## Users

- Founder / design approver
- Product Design and QA
- Engineering / Codex
- GeoAI Delivery OS
- Release reviewer

## Affected surfaces

The harness reads and captures the existing local built application only. It does not intentionally change product UI or runtime behavior.

Audited routes/states:

- Landing
- Workspace initial state
- B2B/B2C scenario separation
- Criteria-first state
- Narrow-screen map picker controls
- Project Hub
- Analysis printable report
- Comparison printable report

## Engineering impact

- Add a read-only GitHub Actions responsive QA workflow.
- Add a dependency-free Node.js Chrome DevTools Protocol harness.
- Produce JSON/Markdown results, Chrome/runtime logs and PNG screenshots.
- Fail the workflow only on P0 findings; preserve P1/P2 findings as review evidence.

## Data impact

None. No external writes, uploads or confidential data are used.

## Design impact

None. The implementation creates evidence against current code; it does not modify Figma or approve a design direction.

## Required viewports

- 390×844
- 430×932
- 768×1024
- 1366×768
- 1440×900

## Acceptance criteria

1. The workflow runs on pull requests to `main` and manual dispatch.
2. The local built app is rendered through headless Chrome at all five viewports.
3. Landing, Workspace and Project Hub screenshots are captured at every viewport.
4. B2C scenario values do not expose B2B scenario IDs.
5. Criteria-first state exposes Candidate Search.
6. Narrow-screen map picker exposes Back to workflow and Run Express Analysis controls.
7. Horizontal overflow is treated as P0.
8. Missing required setup controls/order/primary action/caveat is recorded with severity.
9. Project Hub status contradictions are recorded as P1.
10. Report scenario/source/score/map/caveat issues are recorded as review findings.
11. PNG, JSON, Markdown and logs are uploaded as short-lived workflow evidence.
12. No product, Production, env, Supabase, Auth/RLS, report or Figma change is made.

## Severity policy

- P0: blocks the evidence run and any UI merge/release claim.
- P1: material correction required before design/external approval.
- P2: controlled polish or duplication issue.

## Out of scope

- Product corrections
- Figma changes
- Production deployment
- Environment or secret configuration
- Supabase migrations or writes
- Real Auth/RLS/storage verification
- Full physical-device certification
- Merge approval

## Required caveat

**Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.**
