# Dashboard Layout Governance v1.5

Date: 2026-07-08  
Branch: `design-audit-v1`  
PR: #42 — `Add design audit and workspace product-fidelity v1.2`  
Figma file key: `TAzDqOvRCw1mQGMU3Y4S9H`

## Executive Summary

Founder QA identified that the dashboard still had unacceptable layout failures: text overlap, text leaving intended blocks, floating elements, weak symmetry and insufficient product-reference discipline.

This document locks the hard dashboard layout rules and records the v1.5 correction pass.

Current Figma frames:

- `Product System Reference Audit v1.5 / current` — node `94:26`
- `Dashboard Layout Governance v1.5 / current` — node `129:1485`
- `Design QA & Handoff v1.5 / current` — node `98:124`

This is still design-governance only. It does not approve implementation.

## Dashboard Problem Found

The rejected dashboard state had these defects:

1. Header title and secondary text overlapped.
2. Decision posture title collided with body copy.
3. Query text in the right command panel overlapped supporting text.
4. Header actions did not have enough dedicated space.
5. Decision card and score card competed for space.
6. Dashboard felt like a loose collection of blocks instead of a disciplined product screen.

## Corrections Applied

### ExpressDashboard strict layout correction

The `ExpressDashboard` frame was rebuilt with hard boundaries and shorter, contained text:

- Header title shortened to `Waterfront development screening`.
- Header subtitle moved into a separate text lane.
- Scenario badge, Export and Back actions were assigned dedicated widths.
- Decision posture was reduced to one clear title: `Conditional screening`.
- Decision posture note moved below the title with a fixed text box.
- Score card placed in a separate dedicated column.
- Decision copy shortened and contained in its own text box.
- Query text in the right panel shortened to avoid overlap.
- Dashboard card layout uses explicit columns and fixed heights.

### Native prototype reactions restored

After rebuilding the strict dashboard frame, native prototype reactions were restored:

- `Export` → `ReportPreview`
- `Back` → `Workspace / Selected AOI`

Total verified top-level prototype reactions after v1.5:

- 13 / 13

### Bounds QA

Final automated result:

- ExpressDashboard prototype bounds issues: 0
- All prototype frame bounds issues: 0

## Hard Dashboard Layout Rules

These rules are now blocking handoff gates.

### 1. Text containment rule

No title, paragraph, badge or CTA label may:

- leave its card,
- overlap another text node,
- overlap a sibling component,
- require hidden overflow to appear correct,
- rely on a tiny text box to clip content.

If copy does not fit, shorten the copy or increase the component height. Do not keep the overlap.

### 2. Main/panel boundary rule

For 1440px desktop workspace design:

- Main canvas: `x = 0`, `width = 1060`.
- Right `AnalysisPanel`: `x = 1060`, `width = 380`.
- Dashboard content may not cross into the right panel.
- No floating card may cover the panel boundary.

### 3. Dedicated columns rule

The following items must have their own lanes:

- Header title.
- Header badges.
- Header actions.
- Decision posture.
- Score / suitability.
- KPI cards.
- Top drivers.
- Top risks.
- Recommended next action.

Do not stack a score card on top of a decision card or let badges collide with actions.

### 4. Symmetry / rhythm rule

Use predictable spacing:

- 12px minimum internal gap for dense dashboard areas.
- 16px preferred card padding.
- 20px preferred major section spacing.
- Paired cards must share height.
- Paired columns must align vertically.
- Bottom cards must align to the same baseline.

### 5. Decision-first hierarchy rule

The first viewport must answer:

1. What is the conclusion?
2. Why does it matter?
3. What is the score / confidence?
4. What are the top drivers and risks?
5. What should the user do next?
6. What is the validation caveat?

No generic BI clutter. No decorative metrics without decision relevance.

### 6. Evidence and caveat proximity rule

The validation state must stay near the decision output.

Gold means validation gap / conditional state, not success.

Mandatory caveat remains:

**“Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.”**

## QA Result

| QA item | Result | Notes |
|---|---|---|
| Dashboard text overlap | Pass | Visible overlap removed after screenshot QA. |
| Header lanes | Pass | Title, badge and actions have dedicated space. |
| Decision posture / score layout | Pass | Separate columns; no overlap. |
| Right command panel query text | Pass | Text shortened and contained. |
| Main/panel boundary | Pass | Dashboard content remains inside main canvas. |
| Prototype reactions | Pass | 13 / 13 native reactions verified. |
| Bounds QA | Pass | 0 dashboard and 0 all-prototype bounds issues. |
| Implementation | Blocked | No Codex prompt or implementation PR. |

## Handoff Decision

Dashboard layout governance is now stricter than visual preference: any overlap, text spill, hidden clipping, accidental asymmetry or main/panel boundary violation is a blocking defect.

Implementation remains blocked.

No Codex implementation prompt.  
No implementation PR.  
No production deployment.  
No changes to `main`.  
No Supabase/API/runtime changes.
