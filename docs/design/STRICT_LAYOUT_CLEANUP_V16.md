# Strict Layout Cleanup v1.6

Date: 2026-07-08  
Branch: `design-audit-v1`  
PR: #42 — `Add design audit and workspace product-fidelity v1.2`  
Figma file key: `TAzDqOvRCw1mQGMU3Y4S9H`

## Executive Summary

Founder QA found repeated layout defects after the v1.5 dashboard correction. The failures were not limited to one dashboard card; they appeared across the right command panel, Project Hub, Data Readiness and ComparisonDashboard.

This document records the root cause, the v1.6 correction pass, and the process change.

Current Figma frame:

`Product System Reference Audit v1.6 / current`

Current QA frame:

`Design QA & Handoff v1.6 / current`

Final automated result:

| QA item | Result |
|---|---:|
| Top-level prototype frames | 11 |
| Native Figma reactions | 13 / 13 |
| Automated bounds issues | 0 |

Implementation remains blocked.

No Codex implementation prompt.  
No implementation PR.  
No production deployment.  
No changes to `main`.  
No Supabase/API/runtime changes.

## Root Cause

The previous process relied too much on geometry/bounds checks and not enough on rendered screenshot review of actual text behavior.

Bounds checks can confirm that a text box is inside a frame, but they do not guarantee that:

- the visible text is readable,
- the text does not visually collide with another text node,
- a CTA label does not wrap,
- a button does not float over a selector,
- table rows do not visually collide with caveat bars,
- a generated layout matches the product reference.

That is why the same class of error repeated.

## Process Rule Changed

From v1.6 onward:

1. No design screen can pass based only on automated bounds checks.
2. Every updated screen needs rendered screenshot inspection at usable zoom.
3. Any text overlap, wrapped CTA, floating control or component collision is a P0 design defect.
4. Product reference layout wins over generated visual invention.
5. Any repeated defect class must become a named governance rule.

## Defects Fixed in v1.6

### 1. Right command panel

Problem:

- Footer CTA collided with content.
- Selected point/AOI card and candidate search were too tall for the available panel height.
- Disabled buttons and footer text were at risk of being clipped.

Fix:

- Rebuilt command panel as compact reserved sections.
- Footer actions moved fully inside frame bounds.
- Selected card, custom query and candidate search reduced to fixed heights.
- Primary/secondary CTAs use one-line labels only.

### 2. Dashboard

Problem:

- Header, badge and action areas previously competed for space.
- Decision posture copy and score/narrative zones were not sufficiently isolated.

Fix:

- Dashboard frame kept strict layout.
- Title, badge, CTA, decision posture, score, narrative and KPI lanes are separated.
- More modern electric spatial blue palette was applied.

### 3. Project Hub

Problem:

- B2B/B2C selector, project selector and action buttons visually collided.
- Buttons appeared outside the intended control card.

Fix:

- Control card height increased.
- Project selector and action buttons given separate reserved vertical lanes.
- `Open workspace` and `Run new analysis` no longer overlap the selector.

### 4. Data Readiness / Source Lineage

Problem:

- Hero title and subtitle could collide.
- Control card action button overlapped the project selector.
- Source table rows collided with the caveat bar.

Fix:

- Hero title/subtitle/chips separated.
- Data readiness control card uses reserved lanes.
- Source table rows were moved and constrained.
- Caveat bar was moved below the table rows.

### 5. ComparisonDashboard

Problem:

- Candidate card CTA label `Open dashboard` wrapped and overflowed.

Fix:

- CTA label shortened to `Open`.
- Candidate cards rebuilt with fixed score/status/button lanes.
- Comparison table and evidence note constrained.

## Final Screens Checked

The v1.6 pass covered the top-level prototype frames:

- `Prototype / Workspace / Map-first setup — QA v1.4`
- `Prototype / Workspace / Selected AOI — QA v1.4`
- `Prototype / Workspace / Criteria-first candidates — QA v1.4`
- `Prototype / ExpressDashboard — strict layout QA v1.5`
- `Prototype / ComparisonDashboard — QA v1.4`
- `Prototype / ReportPreview — QA v1.4`
- `Prototype / Project Hub — QA v1.4`
- `Prototype / Data Readiness / Source Lineage — QA v1.4`
- `Prototype / Mobile / Workflow panel — QA v1.4`
- `Prototype / Mobile / Full-screen map picker — QA v1.4`
- `Prototype / Traversability QA v1.4`

## Final QA Result

Automated QA after the v1.6 correction returned:

- bounds issues: 0
- native prototype reactions: 13
- top-level prototype frames: 11

Screenshots were also inspected for the problem areas called out by founder QA:

- right command panel,
- ExpressDashboard,
- Project Hub,
- Data Readiness / Source Lineage,
- ComparisonDashboard.

## Data Honesty

Mandatory caveat remains:

**“Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.”**

No official/live/cadastral/valuation/production-ready claims were introduced.

## Current Decision

Design QA is improved after v1.6 cleanup, but implementation remains blocked.

No Codex implementation prompt.  
No implementation PR.  
No production deployment.  
No changes to `main`.  
No Supabase/API/runtime changes.
