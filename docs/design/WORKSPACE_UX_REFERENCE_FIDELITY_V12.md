# Workspace UX Reference Fidelity v1.2

Date: 2026-07-08  
Branch: `design-audit-v1`  
PR: #42 — `Add current app design audit v1`  
Figma file key: `TAzDqOvRCw1mQGMU3Y4S9H`

## Executive Summary

This document records the corrective design pass after founder QA found that `Workspace Visual Layer v1.1 / current` did not match the current product UX reference closely enough.

The correction updates the active Product Design frame to:

`Workspace UX Reference Fidelity v1.2 / current`

This pass is design-only. It does not approve implementation and does not create a Codex handoff.

Current decision remains:

**Design implementation is blocked until founder approval.**

No Codex implementation prompt.  
No implementation PR.  
No production deployment.  
No changes to `main`.

## Founder QA Findings Addressed

Founder feedback identified the following failures in v1.1:

1. Map controls did not match the current product.
2. Right-side setup / command panel did not match the UX reference.
3. Dashboard did not match the reference product structure.
4. Green / teal visual direction was wrong for the product category.
5. Borders, spacing and screen geometry did not match the product.
6. UX reference fidelity is critical and must be treated as a hard requirement.

## Source Audit Used for v1.2

The v1.2 Figma correction was rebuilt from current product code references, not from an abstract dashboard concept.

Key source-of-truth files reviewed:

- `app/workspace/page.tsx`
- `components/top-navigation.tsx`
- `components/workspace-shell.tsx`
- `components/map-workspace-client.tsx`
- `components/analysis-panel.tsx`
- `components/express-dashboard.tsx`
- `tailwind.config.ts`

Important reference facts:

- `/workspace` renders `TopNavigation` and `WorkspaceShell`.
- `WorkspaceShell` uses a two-column grid with `lg:grid-cols-[minmax(0,1fr)_380px]` and height `calc(100vh - 4rem)`.
- Main canvas switches between `ReportPreview`, `ComparisonDashboard`, `ExpressDashboard` and `MapWorkspace`.
- `AnalysisPanel` is always rendered on the right side.
- `TopNavigation` contains a 64px header, left logo/wordmark/subtitle and right navigation links for `Workspace` and `Projects`.
- Map controls are positioned in the map layer: Spatial layers control at top-right, polygon drawing control, bottom-right basemap switcher, selected-object / AOI status overlays.
- Right `AnalysisPanel` section order is: B2B/B2C audience segment, Project, Role/Scenario, scenario summary, Interaction mode, Scenario setup, Custom query, Candidate search, Selected point/object/AOI, AOI tools, Active workflow, footer CTA.
- Footer contains secondary `Add to compare` and primary CTA button.
- `ExpressDashboard` structure is header card, optional candidate switcher, Map Context, decision posture / score gauge, KPI cards, top drivers, top risks, recommended next action, and drill-down modules.

## Figma Changes

### Product Design

Previous intended current frame:

`Workspace Visual Layer v1.1 / current`

New current frame:

`Workspace UX Reference Fidelity v1.2 / current`

Node ID:

`94:26`

Previous v1.1 was preserved left of current as:

`Workspace Visual Layer v1.1 / previous — superseded by UX Reference Fidelity v1.2`

### Screens included

1. `Workspace / Map-first setup — UX reference v1.2`
2. `Workspace / Selected AOI — UX reference v1.2`
3. `Express Dashboard — UX reference v1.2`
4. `Correction notes`

## Corrections Made

### 1. Product geometry

The frame now follows the actual `/workspace` product shell:

- 1440px screen artboard.
- 64px `TopNavigation`.
- Main canvas below navigation.
- 380px right `AnalysisPanel`.
- No decorative outer cockpit shell.
- No extra `Data Readiness` nav item in the top nav mock.
- No large rounded workspace container that does not exist in the product.

### 2. Map controls

Map controls were moved to match product behavior:

- `Spatial layers` control at top-right.
- Polygon drawing control below / near top-right controls.
- Basemap switcher at bottom-right.
- Start overlay at top-left for initial map-first flow.
- Selected AOI / object status overlay near bottom-left.

### 3. Right AnalysisPanel

The right panel was rebuilt to mirror the actual product ordering and density:

- B2B/B2C audience control at the top.
- Project section with project select, `Projects` link and `Create` button.
- Role / Scenario selects.
- Scenario summary with validation caveat proximity.
- Interaction mode buttons.
- Scenario setup disclosure row.
- Custom query textarea.
- Candidate search state.
- Selected point/AOI section.
- Active workflow card.
- Footer with `Add to compare` and primary CTA.

### 4. Express Dashboard

The dashboard was rebuilt away from the earlier generic dashboard mock.

It now follows the product reference structure:

- Header card with title, scenario badge, target badge, `Export`, and `Back to setup`.
- Left `Map Context` card.
- Right decision section with `Decision posture`, score / suitability, executive preview, KPI cards, top drivers, top risks and recommended next action.
- Drill-down modules preview below the first viewport.

### 5. Color direction

The green / teal direction was replaced by a more appropriate blue spatial intelligence palette:

- Deep spatial blue for primary actions / markers: `#183B5B`.
- Spatial blue / infrastructure signal: `#235D8C` / `#2F6DB5`.
- Light map blue-gray: `#DFE8EC`.
- Validation gold accent retained for caveats / conditional status: `#C5A76A`.

This is a design direction and still requires founder approval before any implementation decision.

## Data Honesty Guardrail

The mandatory caveat remains active:

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

## QA Status

| QA item | Status | Notes |
|---|---|---|
| Product shell geometry | Corrected | Matches 64px top nav + main canvas + 380px right panel pattern. |
| Map controls | Corrected | Controls moved to reference positions. |
| Right AnalysisPanel | Corrected | Section order rebuilt from code reference. |
| Dashboard | Corrected | Rebuilt around ExpressDashboard structure. |
| Green palette issue | Corrected | Blue spatial palette applied. |
| Text overlap | Improved | Visual QA correction applied after first screenshot. |
| Native Figma prototype links | Pending | Not verified. Do not claim fully clickable prototype. |
| Pixel-perfect production screenshot match | Pending | Still requires manual browser/Figma comparison. |
| Implementation handoff | Blocked | No Codex handoff until founder approval. |

## Remaining Issues

1. Founder must visually review `Workspace UX Reference Fidelity v1.2 / current`.
2. Manual Figma navigator QA is still required because previous connector calls returned inconsistent page-child listings.
3. Native Figma prototype links are not manually verified.
4. Pixel-perfect browser comparison remains pending.
5. If v1.2 is accepted, Design System palette docs must be updated from teal/green to blue spatial intelligence.

## Handoff Decision

Design implementation remains blocked.

No Codex implementation prompt should be prepared until founder explicitly approves:

1. UX reference fidelity.
2. Blue spatial palette direction.
3. Dashboard structure.
4. Right panel setup density and order.
5. Map control placement.

## Next Actions

1. Founder reviews Figma `Workspace UX Reference Fidelity v1.2 / current`.
2. Design QA checks the frame against the live `/workspace` browser reference manually.
3. If approved, update Design System palette from green/teal to blue spatial intelligence.
4. Then produce a detailed engineering brief.
5. Only after explicit founder approval, prepare Codex implementation handoff.
