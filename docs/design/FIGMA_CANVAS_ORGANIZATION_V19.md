# Figma Canvas Organization v1.9

Date: 2026-07-08  
Branch: `design-audit-v1`  
PR: #42 — `Add design audit and workspace product-fidelity v1.2`  
Figma file key: `TAzDqOvRCw1mQGMU3Y4S9H`

## Executive Summary

Founder review identified that the Figma Product Design page was not usable as a design source of truth because frames were scattered across the canvas and mixed current screens, prototypes, quality gates, previous versions and governance artifacts.

A canvas organization pass was applied so the current design can be reviewed left-to-right in one clear row.

Implementation remains blocked.

No Codex implementation prompt.  
No implementation PR.  
No production deployment.  
No changes to `main`.  
No Supabase/API/runtime changes.

## Problem

Before this pass, the page had multiple frame types mixed together:

- current product screens,
- prototype states,
- visual QA / governance frames,
- previous versions,
- archive references.

This made it unclear what to inspect first and which frame represented the latest approved design state.

## Canvas Rule Introduced

The Product Design page now follows this rule:

1. Current versions are shown first.
2. Current screens go left-to-right in the intended walkthrough order.
3. Previous/archive/governance references are separated into a lower archive lane.
4. Current frame names are prefixed with a numeric order.
5. Archive/governance references are not to be treated as implementation-ready product screens.

## Current Walkthrough Row

The following frames were placed into one horizontal current row:

| Order | Frame name | Node |
|---:|---|---:|
| 00 | `00 — CURRENT MASTER / START HERE` | `169:2` |
| 01 | `01 — Landing / current v1.8` | `166:2` |
| 02 | `02 — Workspace setup / current` | `119:2` |
| 03 | `03 — Selected AOI / current` | `119:106` |
| 04 | `04 — Criteria candidates / current` | `119:220` |
| 05 | `05 — ExpressDashboard / current` | `119:366` |
| 06 | `06 — ComparisonDashboard / current` | `119:590` |
| 07 | `07 — ReportPreview / current` | `119:804` |
| 08 | `08 — Project Hub / current` | `119:971` |
| 09 | `09 — Data Readiness / current` | `119:1046` |
| 10 | `10 — Mobile workflow / current` | `119:1134` |
| 11 | `11 — Mobile map picker / current` | `119:1164` |

## Visual Organization Added

Added a visible row label:

`CURRENT — Product + Landing walkthrough row / смотреть слева направо`

Added row rule text:

`Start at 00. Every next frame is the next current screen/state. Previous/archive versions are not part of this row.`

Added archive lane label:

`ARCHIVE / GOVERNANCE REFERENCES — не смотреть как текущий продукт`

## Archive / Governance Lane

Frames with names containing the following patterns were moved into a lower archive/governance lane where possible:

- `/ previous`
- `previous`
- `Hard Layout Rules`
- `Dashboard Layout Governance`
- `Product UI Quality Gate`
- `Traversability QA`

These frames are preserved for reference, but they are not part of the current walkthrough row.

## Current Decision

The Figma Product Design canvas is now organized for founder walkthrough:

1. Start from `00 — CURRENT MASTER / START HERE`.
2. Move horizontally to the right through frames `01` to `11`.
3. Do not treat archive/governance lane frames as current product screens.

Implementation remains blocked until the current row is reviewed and explicitly approved.

## Data Honesty

Mandatory caveat remains:

**“Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.”**

No official/live/cadastral/valuation/production-ready claims were introduced.
