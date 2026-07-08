# Workspace Mobile Panel UX Fixes v1 Change Request

Date: 2026-07-08

## Problem

Mobile and narrow Workspace users see too much project chrome before the main workflow controls. The Project block includes a Details affordance that does not support the core first-screen workflow, and the panel order places Custom Query before Candidate Search.

The role and scenario selectors also need stricter alignment. Scenario choices must come from the selected B2B or B2C segment and selected role, with invalid role/scenario state reset when the user switches segment, role, project, or opens a project through a URL handoff.

## Business Reason

The Workspace is the primary demo workflow surface. On mobile and tablet, users need to reach Project, Role, Scenario, Interaction Mode, Scenario setup, Candidate Search, and Custom Query quickly without stale cross-segment options or dead-end setup states.

## Affected Users

- B2B users screening development, fund, lending, government, infrastructure, insurance, broker, family office, or asset-management hypotheses.
- B2C users screening tourist, home buyer, renter, resident, private investor, or family relocation hypotheses.
- Demo reviewers opening saved projects, existing analyses, or URL-selected projects on mobile/tablet.

## Affected Screens

- `/workspace`
- `/explore` where it reuses the Workspace shell

## Data Impact

No Supabase migrations, writes, buckets, secrets, Auth changes, RLS changes, or Production environment changes are included.

Project selection remains demo/local seed separation only. This change does not create tenant security or production access control.

## Design Impact

No Figma implementation or design-system rewrite is included. The current visual style is preserved.

The Project block is compacted to:

- Project
- Projects
- project selector
- Create

The Details control and its collapsed area are removed.

The mobile/narrow panel order is:

- B2B/B2C toggle
- Project
- Role and Scenario
- Interaction Mode
- Scenario setup
- Candidate Search
- Custom Query

## Engineering Impact

- Add role-scoped scenario mapping on existing stable scenario IDs.
- Use role-scoped scenario options in the Workspace panel.
- Reset role/scenario defaults on segment and role changes.
- Align project-selected and URL-selected Workspace state to project segment/role/scenario metadata where valid.
- Preserve demo/local fallback and existing map, report, export, and Supabase status behavior.
- Add a lightweight regression script for scenario mapping and panel label/order checks.

## Risks

- Current scenario IDs are broader than the target future taxonomy, so some requested role concepts map to existing stable scenario IDs until a deeper scenario/data model expansion is approved.
- Project `primaryScenario` can be older analysis-scenario terminology. Invalid or cross-segment mappings are normalized to the active project segment and role.
- Static panel checks do not replace manual mobile visual QA.

## Acceptance Criteria

- Project Details control is not rendered.
- Project block remains compact and preserves Project, Projects, selector, and Create.
- Candidate Search appears before Custom Query.
- Custom Query label is spelled and cased correctly.
- Scenario options are derived from selected segment and role.
- Segment change resets role/scenario to valid defaults.
- Role change resets scenario to a valid default for that role.
- Project defaults do not force invalid role/scenario selections.
- URL-selected project handoff aligns the Workspace audience to the project segment.
- B2B scenarios do not appear under B2C roles, and B2C scenarios do not appear under B2B roles.
- Existing full-screen mobile map picker and post-analysis dashboard transition remain available.

## Rollback

Revert the Workspace panel, scenario helper, package script, and regression script changes from this branch. No database or environment rollback is required.

## Out Of Scope

- No merge.
- No Production environment changes.
- No hard access enablement.
- No Supabase migrations or writes.
- No Auth or RLS behavior changes.
- No official or live integrations.
- No Figma redesign.
- No map, report, or export behavior redesign beyond preserving the existing mobile map flow.

## Data Honesty Note

Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.
