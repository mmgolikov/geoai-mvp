# Figma Workspace UX Fidelity v1.2

Date: 2026-07-08  
Branch: `design-audit-v1`  
PR: #42 — `Add current app design audit v1`  
Figma file key: `TAzDqOvRCw1mQGMU3Y4S9H`

## Executive Summary

Founder feedback rejected the previous `Workspace Visual Layer v1.1 / current` direction as insufficiently faithful to the current product UX reference.

Main issues:

- Map controls were placed as generic decorative UI instead of matching the product.
- The right command panel did not follow the current `AnalysisPanel` hierarchy.
- The dashboard did not follow the current `ExpressDashboard` structure.
- The green/teal palette created an agriculture-like association and was not appropriate for GeoAI real estate / development intelligence.
- Borders, spacing and screen proportions were not close enough to the current product.

This document records the corrective design-only pass `Workspace Visual Layer v1.2 / current`.

Implementation remains blocked.

No Codex implementation prompt.  
No implementation PR.  
No production deployment.  
No changes to `main`.

## Source Audit

The v1.2 correction used current source structure as the design reference:

- `/workspace` renders `TopNavigation` and `WorkspaceShell`.
- `TopNavigation` uses a sticky 64px header with a `G` mark, `GeoAI`, `Spatial decision intelligence`, and nav links for `Workspace` and `Projects`.
- `WorkspaceShell` passes the active state, project, analysis, candidate and panel props into `AnalysisPanel`.
- `AnalysisPanel` is a 380px right-side command panel with scrollable content and a pinned action footer.
- `MapWorkspaceClient` places map controls in product-specific positions: layer controls top-right, polygon control near the right side, and basemap switcher bottom-right.
- `ExpressDashboard` uses a header, `MapContextCard`, decision posture, suitability gauge, KPIs, top drivers/risks and recommended next action.

## Figma Frames Updated

| Page | Frame | Node ID | Status |
|---|---|---:|---|
| `01 — Product Design` | `Workspace Visual Layer v1.2 / current` | `102:2` | Current design correction |
| `01 — Product Design` | `Workspace / Map-first setup v1.2` | `102:11` | Screenshot QA completed |
| `01 — Product Design` | `Workspace / Selected point v1.2` | `102:160` | Screenshot QA completed |
| `01 — Product Design` | `Workspace / Analysis result v1.2` | `102:314` | Screenshot QA completed |
| `02 — Design System` | `Brand Foundation v1.2 / current` | `105:2` | Blue spatial identity update |
| `02 — Design System` | `Design System Components v1.2 / current` | `105:39` | Product hierarchy update |
| `04 — Design QA & Handoff` | `Design QA & Handoff v1.2 / current` | `105:61` | Current QA status |

Previous `v1.1` frames must be treated as rejected/reference only and not used for implementation handoff.

## v1.2 Product Corrections

### 1. Top Navigation

Corrected to match product source:

- `G` mark.
- `GeoAI` title.
- `Spatial decision intelligence` subtitle.
- `Workspace` and `Projects` navigation only.
- Removed decorative `Decision Intelligence` pill, `Data Readiness` nav item, avatar and top caveat from the product screen mock because they do not match current `TopNavigation` source.

### 2. Map Controls

Corrected to product-specific placement:

- `Spatial layers` panel is top-right.
- Polygon drawing control is on the right side below the layer area.
- Basemap switcher is bottom-right with `Streets`, `Light`, `Satellite`.
- Start card remains top-left inside the map workspace.

### 3. Right AnalysisPanel

Rebuilt from the current panel hierarchy:

- Audience segment: B2B / B2C.
- Project block with project selector, `Projects` link, `Create`, `Details`.
- Role / Scenario controls.
- Scenario summary card.
- Interaction mode: Map-first / Criteria-first.
- Scenario setup block.
- Custom query.
- Candidate search.
- Selected point / AOI / object block.
- Pinned footer with evidence mode and primary CTA.

### 4. ExpressDashboard

Rebuilt to follow the current dashboard structure:

- Header with title, scenario/target labels, `Export`, `Back to setup`.
- `Map Context` card on the left.
- Decision module on the right.
- Decision posture block.
- Suitability score / confidence module.
- KPI cards.
- Top drivers and top risks.
- Recommended next action.

### 5. Color Direction

Green/teal direction is deprecated for the core product UI.

v1.2 proposes:

- Deep Gulf Blue: `#1C4E80`.
- Deep Spatial Blue: `#123A5A`.
- Signal Blue: `#2563EB`.
- Spatial Cyan: `#36A9C7`.
- Neutral product foundation: `#F6F8FB`, `#FFFFFF`, `#DDE3EA`, `#172033`, `#5F6B7A`.
- Validation amber remains for caveats/risk only: `#C5A76A`, `#FFF7E6`.

## Screenshot QA Result

Screenshot QA was completed for:

- `Workspace / Map-first setup v1.2`.
- `Workspace / Selected point v1.2`.
- `Workspace / Analysis result v1.2`.

Corrections made during QA:

- Fixed title/steps overlap in the Start card.
- Fixed layer badge text wrapping.
- Fixed selected AOI panel footer clipping.
- Fixed dashboard title/caveat overlap.
- Fixed decision posture text overlap.
- Fixed gauge text/bar overlap.
- Fixed top navigation `Workspace` wrapping.

## Data Honesty Guardrail

Mandatory wording remains:

**“Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.”**

Do not claim:

- production-ready
- pilot-ready
- live official integration
- official parcel
- official zoning
- cadastral validation
- ownership verification
- certified valuation
- approved site
- guaranteed best use

Use:

- screening hypothesis
- public/open context
- sample/open context
- user-provided data
- official/client validation required

## Current QA Status

| Item | Status | Notes |
|---|---|---|
| `v1.1` design direction | Failed | Do not use for implementation. |
| Source audit | Passed | Current product source was inspected before v1.2. |
| Map controls | Passed | Product-specific control positions restored. |
| Right panel hierarchy | Passed | Rebuilt from actual `AnalysisPanel`. |
| Dashboard structure | Passed with caveat | Static design follows source; live app capture still pending. |
| Color direction | Passed for review | Blue/cyan direction replaces green/teal. |
| Native Figma prototype links | Pending | Not manually verified. |
| Implementation handoff | Blocked | Requires explicit founder approval. |

## Remaining Issues

1. Founder visual approval is required for `Workspace Visual Layer v1.2 / current`.
2. Native Figma prototype links are not manually verified.
3. Pixel-perfect live product capture is still pending.
4. Responsive tablet/mobile flows remain a separate pass.
5. Codex handoff must not be prepared yet.

## Handoff Decision

Do not prepare a Codex implementation prompt yet.

Only `Workspace Visual Layer v1.2 / current` may be considered for future implementation planning after explicit founder approval.

`Workspace Visual Layer v1.1` is rejected/reference only.
