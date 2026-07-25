# Prototype UX Preservation Contract v1

Status: binding design input / UX-first rule  
Date: 2026-07-05  
Branch: `geoai-v6-manual-qa`

## Executive rule

The new visual design must preserve the current prototype UX layout and interaction contract. The design pass may improve visual styling, hierarchy, typography, color, surfaces and components, but must not change the product layout logic without a separate approved product change request.

## Source of truth

The source of truth is the current working prototype implementation in GitHub, especially:

- `components/workspace-shell.tsx`
- `components/analysis-panel.tsx`
- `components/express-dashboard.tsx`
- `components/comparison-dashboard.tsx`
- `components/report-preview.tsx`
- `components/map-workspace-client.tsx`

## Non-negotiable UX layout rules

### 1. Workspace shell must remain workspace-first

- The application workspace is not a generic sectioned admin app.
- The main product view is a two-zone workspace: main canvas plus right command panel.
- Desktop layout preserves the current proportion: main work area + fixed right panel around 380 px.
- The workspace height is viewport-bound below the top navigation.
- The main canvas switches between map, analysis dashboard, comparison dashboard and report preview.
- The right panel remains the command/control surface.

### 2. Right command panel is persistent

- The right panel stays visible in the workspace on desktop.
- It contains scenario setup, project context, target context, comparison state, AOI tools, upload/data context and the primary CTA.
- It may be visually redesigned, but its function and position must remain.
- The primary CTA remains in the bottom footer area of the panel.
- The Add to compare action remains above the primary CTA.

### 3. Primary action logic must not change

Current action progression must be preserved:

- Criteria-first before search: Find candidates / update search.
- Candidate selected: Analyze selected.
- Two or more candidates: Compare candidates / compare selected.
- Analysis up to date: Export report.
- Analysis changed: Continue analysis.
- Comparison up to date: Export comparison.
- Comparison changed: Continue comparison.

### 4. Dashboard first viewport must remain compact

- Analysis dashboard first overview must fit within the workspace height.
- The first dashboard view must align visually with the right panel footer.
- Drill-down modules start below the first overview.
- The first dashboard view contains header, map context and decision/score summary.
- Detailed modules appear below, not in the first viewport.

### 5. Comparison dashboard follows the same viewport contract

- The comparison overview must fit inside the workspace height.
- Header, ranked shortlist decision and shortlist matrix are visible first.
- Deeper comparison table/cards appear below the first viewport.

### 6. Report preview is a workspace state

- Report preview replaces the main canvas when active.
- The right command panel remains present.
- Report content can be visually improved, but must preserve report sections, evidence appendix and caveats.

### 7. Map remains central before analysis

- Before analysis or comparison, the main canvas is the map workspace.
- The map must not be reduced to a decorative illustration in the product UI.
- Selected point/object/AOI/candidate remains visible on the map.

### 8. Collapsible density is intentional

- The current prototype uses collapsible details to keep the first viewport usable.
- Design may improve the visual treatment of collapsible sections, but should not expand all secondary content by default.

### 9. Data honesty must stay near decisions

- Evidence/caveat labels must remain visible near analysis, comparison and report outputs.
- Demo/open/uploaded/review source state must not be hidden in secondary pages only.

## What design may change

Allowed:

- Visual styling.
- Typography scale within readability rules.
- Surface treatment, shadows and borders.
- Icons and microcopy.
- Card internal hierarchy.
- Color tokens within the approved palette.
- Spacing polish that does not change main proportions.

Not allowed without approval:

- Replacing the desktop workspace with a new multi-page app shell.
- Removing the persistent right command panel on desktop.
- Moving the primary CTA away from the panel footer.
- Changing the first dashboard viewport contract.
- Turning the map into a minor decorative element before analysis.
- Moving report/export flow out of the existing workspace state logic.

## Design process implication

The next Figma pass must be called:

`Prototype-faithful visual redesign`

It should use the current prototype layout as the wireframe base and apply only visual redesign. The previous fully sectioned product concept should be treated as documentation / future IA reference, not as an immediate replacement for the working prototype UX.

## Codex gate

Codex implementation prompt must explicitly state:

- preserve current UX layout and state flow;
- do not re-architect workspace layout;
- do not replace right command panel with a new section rail;
- do not change primary CTA logic;
- only restyle and harden visual quality.
