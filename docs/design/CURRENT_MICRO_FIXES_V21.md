# Current Micro Fixes v2.1

Date: 2026-07-08  
Branch: `design-audit-v1`  
PR: #42 — `Add design audit and workspace product-fidelity v1.2`  
Figma file key: `TAzDqOvRCw1mQGMU3Y4S9H`

## Executive Summary

Founder visual QA identified three remaining minor current-frame issues after the current-row and archive/versioning cleanup:

1. Landing hero caveat was still visually too close to / outside the hero card boundary.
2. Selected AOI map overlay had broken label/value layout.
3. Project Hub right-side B2B/B2C / project control card looked visually detached from the hero area.

These issues were fixed directly in the current frames. No new design version row was created because the scope is a minor current cleanup pass.

Implementation remains blocked.

No Codex implementation prompt.  
No implementation PR.  
No production deployment.  
No changes to `main`.  
No Supabase/API/runtime changes.

## Figma Frames Updated

| Screen | Node | Change |
|---|---:|---|
| Landing / current v1.8 | `166:2` | Hero caveat containment |
| Selected AOI / current | `119:106` | Bottom-left Selected AOI card cleanup |
| Project Hub / current | `119:971` | Right control card anchoring and chip cleanup |

## Changes Applied

### 1. Landing — hero caveat containment

Updated nodes:

- `166:23` — `Hero panel`
- `166:32` — `Hero caveat`
- created `Hero caveat container`

Change:

- Increased hero card height to reserve space for caveat.
- Added a small validation/caveat container inside the card.
- Kept caveat text inside the hero card:

`Screening hypothesis; official validation required.`

QA result:

- caveat no longer exits the hero card;
- hero CTA row remains readable;
- no overlap with product strip.

### 2. Selected AOI — bottom-left compact card

Updated nodes:

- `119:154` — `Selected overlay`
- `119:155` — `Selected overlay label`
- `119:156` — `Selected overlay value`

Change:

- Rebuilt bottom-left overlay as one-line compact card.
- Label changed to `Selected AOI`.
- Value kept as `Business Bay waterfront`.
- Both label and value are vertically centered.

QA result:

- no broken text wrapping;
- no crooked label/value layout;
- compact card reads as product UI.

### 3. Project Hub — control card anchoring

Updated nodes:

- `143:1247` — `Control card`
- `143:1248` — `Segment bg`
- `143:1249` / `143:1251` — B2B/B2C segments
- `143:1253` — active project label
- `143:1254` / `143:1255` — project selector
- `143:1256` / `143:1257` — Open workspace button
- `143:1258` / `143:1259` — Run new analysis button
- `143:1246` — Scenario chip text

Change:

- Reduced / repositioned the control card so it fits inside the hero area instead of hanging below it.
- Kept B2B/B2C, active project selector, and actions in separate lanes.
- Changed scenario chip text from a wrapping form to `Site screening`.

QA result:

- control card no longer appears detached below the hero area;
- scenario chip no longer wraps;
- project controls read as part of the Project Hub hero composition.

## Screenshot QA

Screenshot QA was performed after the changes on:

- `166:2` — Landing / current v1.8
- `119:106` — Selected AOI / current
- `119:971` — Project Hub / current

Result:

- Landing caveat containment: pass.
- Selected AOI compact card: pass.
- Project Hub control card anchoring: pass.
- Project Hub scenario chip text fit: pass.

## Current Decision

These are current-frame fixes, not a new implementation handoff.

The next gate remains:

1. Manual Figma Present walkthrough across the current row.
2. Founder approval.
3. Only then: Codex implementation branch prompt.

## Data Honesty

Mandatory caveat remains:

**“Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.”**

No official/live/cadastral/valuation/production-ready claims were introduced.
