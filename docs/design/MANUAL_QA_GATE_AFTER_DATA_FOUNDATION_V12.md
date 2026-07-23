# Manual QA Gate After Data Foundation v1.2

Status: design QA active / implementation blocked.

## Source audit

- PR #33 is merged to main.
- Data Foundation v1.2 adds source readiness APIs and the Projects Data Readiness / Source Lineage block.
- PR #32 is docs/design-governance only.
- PR #32 branch is still active and must be updated from fresh main before any handoff.

## UX preservation rule

The design must preserve the working prototype UX:

- map-first and criteria-first flows;
- main canvas plus right command panel;
- 380px desktop command panel;
- bottom primary action placement;
- analysis, comparison and report as main canvas states;
- compact first dashboard viewport.

## Data Readiness requirement

Projects / Readiness design must preserve or add treatment for:

- source group name;
- status;
- data mode;
- record count if available;
- confidence;
- caveat;
- next validation step.

## Manual QA issue log

| ID | Area | Issue | Severity | Status |
| --- | --- | --- | --- | --- |
| DQA-01 | Figma V6 old drafts | Prior generated screens may have overlaps and weak layout quality | High | Blocked as implementation source |
| DQA-02 | Prototype faithful frames | Need manual visual review of page 14 | High | Open |
| DQA-03 | Projects/Readiness | Data Readiness / Source Lineage must not be removed | Critical | Protected |
| DQA-04 | Responsive | Mobile must not be squeezed desktop | High | Open |
| DQA-05 | Data honesty | No official/live/production/pilot-ready claims | Critical | Active gate |

## Required Figma corrections

1. Review page 14 frames against current prototype proportions.
2. Add explicit Data Readiness / Source Lineage treatment to Projects / Readiness design states.
3. Verify no text overlaps and no clipped business-critical copy.
4. Keep right panel footer and primary CTA visible.
5. Keep evidence/caveat near every decision output.
6. Do not create Codex implementation prompt until QA passes.

## Decision

PR #32 can be treated as docs/design-governance only, but should not be merged until the branch is updated from fresh main after PR #33 or GitHub reports it mergeable.

Design implementation remains blocked.
