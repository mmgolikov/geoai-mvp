# Design Pass v2.2 — Execution Brief and Results

Date: 2026-07-08  
Branch: `design-audit-v1`  
PR: #42 — `Add design audit and workspace product-fidelity v1.2`  
Figma file key: `TAzDqOvRCw1mQGMU3Y4S9H`

## Executive Summary

This document records the requested design execution pass v2.2.

The founder requested that the design be prepared as an execution-oriented brief and implemented immediately in Figma.

This pass covers:

1. Product-fidelity fixes required before any Codex implementation handoff.
2. Landing enrichment with a branded product visual, icons and lightweight graphic accents.
3. A design-to-code state map to help future Codex work understand active/expanded states and layout intent.

Implementation remains blocked.

No Codex implementation prompt.  
No implementation PR.  
No production deployment.  
No changes to `main`.  
No Supabase/API/runtime changes.

## Change Request

### Problem

The current Figma row was visually much cleaner, but the design was still not fully suitable for future Codex handoff because:

- some product blocks did not map clearly to implementation structure;
- selected/expanded states and active controls were not documented as design-to-code state references;
- some right-side hero control cards still looked visually detached or too close to bounds;
- ReportPreview header/action area needed a safer action layout;
- the landing page was too white/empty and did not communicate the product visually enough.

### Business Reason

Before Codex can implement a refined UI, the design must be both visually strong and structurally legible. Codex should be able to map Figma frames to actual layout patterns, active states and reusable components instead of guessing from decorative mockups.

### Users

- Founder / product owner reviewing product readiness.
- Designer / design-chat maintaining future visual iterations.
- Codex / engineering handoff later, only after founder approval.

### Affected Screens

- `01 — Landing / current v1.8` — node `166:2`
- `07 — ReportPreview / current` — node `119:804`
- `08 — Project Hub / current` — node `119:971`
- `09 — Data Readiness / current` — node `119:1046`
- new `12 — Codex state map / design-to-code reference` — node `179:53`

## Execution Brief

### 1. ReportPreview header/action row

#### Problem

The top report header was too shallow and action placement remained fragile.

#### Fix

- Increase header height.
- Keep title, badge, subtitle and action group in separate horizontal lanes.
- Keep `Print PDF` and `Back` inside safe padding.
- Add a small vertical shift to the report document to preserve visual rhythm.

#### Acceptance Criteria

- No title/subtitle collision.
- No button text overflow.
- Action group is inside header bounds.
- Report document does not collide with header.

### 2. Project Hub control-card anchoring

#### Problem

B2B/B2C and active project controls looked detached from the hero block.

#### Fix

- Use a compact hero-control card nested inside the hero area.
- Apply neutral card border instead of a selection-like blue visual border.
- Keep segment switcher, active project field and action row as distinct lanes.
- Ensure scenario chip text fits on one line.

#### Acceptance Criteria

- Control card sits inside hero area.
- No button or segment leaves the card bounds.
- Scenario chip does not wrap.
- Card reads as a structured right hero control, not a floating widget.

### 3. Data Readiness control-card anchoring

#### Problem

The right-side `Open workspace / Run new analysis` block appeared too detached and vertically misaligned.

#### Fix

- Apply the same reusable hero-control card pattern as Project Hub.
- Top-align label, project field and action row.
- Keep buttons inside bounds.

#### Acceptance Criteria

- Control card is inside hero area.
- No button leaves the card bounds.
- Layout matches Project Hub control-card pattern.

### 4. Landing enrichment

#### Problem

Landing was too white and under-illustrated for an enterprise SaaS / spatial intelligence product.

#### Fix

- Add a right-side branded product hero visual.
- Include map/AOI/dashboard/evidence elements.
- Add small icons to product strip cards.
- Add lightweight evidence coverage and workflow visual accents.
- Keep everything editable in Figma as vector/layout objects.

#### Acceptance Criteria

- Hero has a credible product visual on the right.
- Landing remains light, premium and enterprise SaaS.
- No visual clutter or random colors.
- Product strip text does not overlap icons.
- Source/evidence caveat remains visible.

### 5. Codex-oriented state map

#### Problem

The design lacked a concise map of active/expanded states that could later help Codex understand the intended UI behavior.

#### Fix

Create a new reference frame:

`12 — Codex state map / design-to-code reference`

Node:

`179:53`

The frame lists:

- `AnalysisPanel / setup-required`
- `AnalysisPanel / selected-AOI`
- `AnalysisPanel / report-ready`
- `ProjectHub / control-card`
- `DataReadiness / control-card`
- `ReportPreview / action-row`

#### Acceptance Criteria

- State map is present in the current top row after product screens.
- It is clearly marked as reference only.
- It does not imply implementation approval.

## Figma Changes Applied

### ReportPreview — `119:804`

Updated:

- `119:814` — Report header
- `119:815` — Report title
- `119:816` / `119:817` — Analysis report badge
- `119:818` — Report subtitle/caveat
- `119:819` / `119:820` — Print PDF button
- `119:821` / `119:822` — Back button
- Report document and content shifted down slightly for spacing.

### Project Hub — `119:971`

Updated:

- `143:1247` — Control card
- `143:1248` — Segment background
- `143:1249` / `143:1250` — B2B segment
- `143:1251` / `143:1252` — B2C segment
- `143:1253` — Active project label
- `143:1254` / `143:1255` — Project field
- `143:1256` / `143:1257` — Open workspace
- `143:1258` / `143:1259` — Run new analysis

### Data Readiness — `119:1046`

Updated:

- `143:1405` — Control card
- `143:1406` — Control label
- `143:1407` / `143:1408` — Control field
- `143:1409` / `143:1410` — Open workspace
- `143:1411` / `143:1412` — Run new analysis

### Landing — `166:2`

Added / updated:

- `Hero product visual / shell`
- `Hero product visual / map`
- `Hero product visual / panel`
- `Hero product visual / evidence`
- `Icon mark / product 0..4`
- `Section accent / source coverage`
- `Section accent / workflow mini`
- Product strip title/body spacing and simplified titles.

### State map — `179:53`

Created:

- `12 — Codex state map / design-to-code reference`

## Screenshot QA Result

Screenshot QA was performed on:

- Landing — `166:2`
- ReportPreview — `119:804`
- Project Hub — `119:971`
- Data Readiness — `119:1046`
- Codex state map — `179:53`

### Result

| Frame | Result |
|---|---|
| Landing | Pass after product-strip spacing correction |
| ReportPreview | Pass for header/action row containment |
| Project Hub | Pass for hero-control card containment |
| Data Readiness | Pass for hero-control card containment |
| Codex state map | Pass as reference frame |

## Remaining Gate

This pass improves design quality and implementation readiness, but it does not approve implementation.

The remaining gate is:

1. Manual Figma Present walkthrough of the current row.
2. Founder approval.
3. Separate Codex implementation branch prompt.

## Current Decision

Design pass v2.2 is completed in Figma.

Implementation remains blocked.

## Data Honesty

Mandatory caveat remains:

**“Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.”**

No official/live/cadastral/valuation/production-ready claims were introduced.
