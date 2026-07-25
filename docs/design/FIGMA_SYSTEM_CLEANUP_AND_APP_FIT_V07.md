# Figma System Cleanup and App-Fit v0.7

Status: active Figma correction / implementation blocked  
Date: 2026-07-07  
Branch: `design-audit-v1`  
Scope: Figma organization and design correction only

## Executive summary

Completed a system-level Figma cleanup and issue-based correction pass.

This pass addresses the latest visual review findings:

- Figma page/versioning structure was too noisy and inconsistent.
- Some headings wrapped unnecessarily and overlapped subtitles despite available horizontal space.
- Workspace frames had excessive spacing and looked too empty.
- Landing badge placement overlapped the hero text area.
- Landing product preview did not match the current GeoAI product cockpit.

The design remains parallel to development and does not approve implementation.

## Figma structure cleanup

Active pages are now organized as:

- `00 — HQ`
- `01 — Product Design`
- `02 — Design System`
- `03 — Responsive QA`
- `04 — Design QA & Handoff`
- `05 — Archive Index`

Legacy pages were renamed with an archive prefix and are not handoff sources.

## System title rule

Applied a title guardrail to active pages:

- current section title uses a wide text box;
- no narrow title frames when horizontal space is available;
- subtitle starts below the title zone;
- current version appears first;
- version history stays inside the section page.

## Product Design update

Updated page:

`01 — Product Design`

Current version:

`v0.7 — system cleanup and app-fit correction`

Updated frames:

- Workspace Dashboard v0.7
- Landing current-app preview v0.7
- Projects / Readiness v0.7

## Corrections made

### Workspace

- Reduced excessive gaps between left panel, map and right panel.
- Rebuilt the workspace around the current GeoAI cockpit structure.
- Preserved left rail, top header, Data hub, map canvas and selected asset panel.
- Added source state and next-action modules to avoid dead empty space.

### Landing

- Moved the UAE badge away from the hero title and subtitle collision zone.
- Rebuilt the right product preview around the current product cockpit logic.
- Removed the older abstract dashboard layout.
- Improved evidence confidence placement.

### QA / Handoff

Updated page:

`04 — Design QA & Handoff`

Current version:

`v0.6 — title + versioning + app-fit correction`

Resolved items captured:

- excessive spacing reduced;
- landing badge overlap removed;
- landing product mockup aligned to current cockpit;
- right-side dashboard empty area reduced;
- active pages simplified;
- handoff remains blocked.

## Decision

Design implementation remains blocked.

No Codex implementation prompt has been prepared.

Owner visual review is required before handoff package preparation.
