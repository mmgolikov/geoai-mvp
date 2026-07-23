# Figma Active Recovery and Design QA v1.2

Date: 2026-07-08  
Branch: `design-audit-v1`  
PR: #42 — `Add current app design audit v1`  
Figma file key: `TAzDqOvRCw1mQGMU3Y4S9H`

## Executive Summary

This document records the correction pass after founder feedback that the previous Figma visual layer did not match the current product UX reference closely enough.

The design direction was changed from an interpreted visual layer to a **strict product-fidelity layer**. The current Figma frame is now:

`Workspace Product Fidelity v1.2 / current`  
Node ID: `108:2`

The previous `Workspace Visual Layer v1.1 / current` was preserved and moved left as a previous version. No implementation approval is granted by this document.

Current decision remains:

**Design implementation is blocked until founder approval.**

No Codex implementation prompt.  
No implementation PR.  
No production deployment.  
No changes to `main`.

## Product Reference Audit

The v1.2 pass was based on the current product code reference:

- `/workspace` renders `TopNavigation` and `WorkspaceShell`.
- `WorkspaceShell` uses a two-column layout: `minmax(0,1fr)_380px`.
- Workspace height is `calc(100vh - 4rem)`.
- The right side is always the real `AnalysisPanel` contract.
- Main canvas states are `MapWorkspace`, `ExpressDashboard`, `ComparisonDashboard` and `ReportPreview`.
- Primary CTA is passed into `AnalysisPanel` and stays pinned in the panel footer.
- Map controls are right-side controls: spatial layers, AOI polygon control, basemap/scale controls.

## Current Figma Frames Created / Verified

| Active page | Current frame | Node ID | Status |
|---|---:|---:|---|
| `01 — Product Design` | `Workspace Product Fidelity v1.2 / current` | `108:2` | Created and screenshot-verified |
| `01 — Product Design` | `PREVIOUS — Workspace Visual Layer v1.1 / previous — superseded by product fidelity v1.2` | `94:26` | Preserved left of current |
| `02 — Design System` | `Brand Foundation v1.1 / current` | `98:2` | Created and screenshot-verified |
| `02 — Design System` | `Design System Components v1.1 / current` | `98:47` | Created and screenshot-verified |
| `03 — Responsive QA` | `Responsive QA v0.1 / current` | `98:98` | Created, overflow-fixed and screenshot-verified |
| `04 — Design QA & Handoff` | `Design QA & Handoff v1.1 / current` | `98:124` | Created and screenshot-verified |

## What Changed in v1.2

### 1. Product geometry corrected

The previous v1.1 frame looked like a decorative product mock and did not follow the actual `/workspace` UX closely enough.

v1.2 now follows the actual product structure:

- `TopNavigation` uses the product reference pattern: logo mark, `GeoAI`, subtitle, `Workspace`, `Projects`.
- `WorkspaceShell` uses main canvas + fixed 380px right panel.
- The right panel is no longer a generic card column; it follows the command-panel structure and pinned footer CTA.
- Screen states remain inside the main canvas.

### 2. Map controls corrected

The earlier frame placed map controls incorrectly.

v1.2 corrects this:

- `Start here` overlay is left/top only for empty map state.
- `Spatial layers` control is placed at top/right.
- AOI polygon control is placed on the right side near the layers control.
- Basemap and scale controls are placed at bottom/right.
- Map visual style now uses blue/slate spatial accents rather than green/teal.

### 3. AnalysisPanel corrected

The previous right panel did not match the current product reference.

v1.2 uses:

- compact workspace command header;
- B2B/B2C segmented control;
- collapsible command sections: `Project`, `Role / Scenario`, `Scenario setup`, `Data sources`;
- selection card;
- custom query card;
- evidence mode label;
- pinned primary CTA footer.

### 4. ExpressDashboard corrected

The previous dashboard looked like an independent BI card layout and not like the current product.

v1.2 follows the product dashboard contract more closely:

- header with title, scenario badge, export/back actions;
- map context card on the left;
- decision posture + suitability / score gauge on the right;
- KPI row;
- top drivers / top risks modules;
- recommended next action module.

### 5. Color direction corrected

Founder feedback: green/teal looked agricultural and was not appropriate for GeoAI real estate / development intelligence.

v1.2 replaces the green/teal feel with a **blue-spatial palette**:

- Deep navy / graphite foundation;
- Signal blue as primary action and spatial highlight;
- restrained cyan / sky-blue for map context;
- amber only for validation gaps and caveats;
- no agricultural green tone.

## QA Result After v1.2

| QA item | Status | Notes |
|---|---|---|
| Product UX reference fidelity | Improved / still needs founder review | v1.2 follows the actual product geometry and control positions more closely. |
| Version lane policy | Pass with caveat | v1.1 preserved left; manual Figma navigator check still required because connector listings were inconsistent. |
| TopNavigation fidelity | Improved | Now follows product component structure. |
| Map control placement | Improved | Controls moved to right-side product pattern. |
| AnalysisPanel fidelity | Improved | Uses command-panel sections and pinned footer CTA. |
| ExpressDashboard fidelity | Improved | Rebuilt around product dashboard structure, not decorative BI cards. |
| Color direction | Improved | Green/teal removed from v1.2 product layer; blue-spatial palette applied. |
| Native Figma prototype links | Pending | Not manually verified. |
| Pixel-perfect production match | Pending | v1.2 is product-fidelity, not yet pixel-perfect production capture. |
| Implementation handoff | Blocked | No Codex handoff until founder approval. |

## Data Honesty Guardrail

The following wording remains mandatory wherever GeoAI outputs decision recommendations, readiness, data source confidence or reports:

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

## Remaining Issues

1. Founder must visually review `Workspace Product Fidelity v1.2 / current`.
2. Manual Figma navigator QA is required because connector page-child listings were inconsistent.
3. Native Figma clickable prototype links are not manually verified.
4. Responsive tablet and mobile flows require a separate dedicated design pass.
5. Pixel-perfect production capture is still pending.
6. Design implementation remains blocked.

## Handoff Decision

Do not prepare a Codex implementation prompt yet.

Implementation can only be considered after:

1. Founder visually accepts `Workspace Product Fidelity v1.2 / current`.
2. Product/design QA confirms reference fidelity, no overlap, no clipped critical copy and no hidden primary actions.
3. Data honesty labels are approved.
4. Native Figma prototype links are manually verified or explicitly waived.
5. A separate engineering brief is prepared and approved.

## Next Actions

1. Founder reviews `Workspace Product Fidelity v1.2 / current` in Figma.
2. Manually verify the Figma version lane ordering.
3. Continue product-fidelity refinement if founder still sees mismatches with the product reference.
4. Update `04 — Design QA & Handoff` if additional QA issues are found.
5. Keep PR #42 as design-governance only.
6. Prepare Codex implementation brief only after explicit founder approval.
