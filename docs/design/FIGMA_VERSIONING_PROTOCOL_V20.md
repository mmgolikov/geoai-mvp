# Figma Versioning Protocol v2.0

Date: 2026-07-08  
Branch: `design-audit-v1`  
PR: #42 — `Add design audit and workspace product-fidelity v1.2`  
Figma file key: `TAzDqOvRCw1mQGMU3Y4S9H`

## Executive Summary

Founder QA identified that the previous canvas organization still allowed old/current-looking frames to remain in the top review zone, visually overlapping the new current walkthrough row.

A stricter versioning protocol was applied:

1. The top of the Product Design canvas now contains only the current walkthrough row.
2. All non-current top-level frames were moved down into archive sections.
3. Archive sections are grouped by frame type / version family.
4. The current row always starts with `00 — CURRENT MASTER / START HERE`.
5. When a new version is created, the previous current set must be moved down into archive before the new current set is placed on top.

Implementation remains blocked.

No Codex implementation prompt.  
No implementation PR.  
No production deployment.  
No changes to `main`.  
No Supabase/API/runtime changes.

## Problem

The prior canvas organization pass placed a current row label and current frames, but older design frames still remained in the same visual/top area. This created the impression that new screens were layered on top of old screens.

Specific issue observed by founder:

- old `Workspace Product Fidelity` / prior audit content appeared behind or above the new current row;
- current and archive artifacts were visually mixed;
- the page could not be used as a reliable source of truth.

## Protocol Applied

### Current zone

Only these frames remain in the top current zone:

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

### Archive zone

All non-current top-level frames were moved below the current row.

Archive sections include:

- `A — Product / screen-set archive`
- `B — Prototype states archive`
- `C — Landing archive`
- `D — Design system archive`
- `E — QA / governance archive`
- `F — Previous versions archive`
- `Z — Other archive`

The script detected and archived 20 non-current top-level frames.

## Verification Result

Post-organization verification found:

| Check | Result |
|---|---:|
| Current top-row frames | 12 |
| Archived non-current frames | 20 |
| Non-current frames remaining in top zone | 0 |

## Ongoing Versioning Rule

When creating a new design version:

1. Duplicate / preserve the existing current row.
2. Rename the preserved set as archive / previous.
3. Move the preserved set down into the appropriate archive section.
4. Place the new current row at the top of the Product Design page.
5. Prefix current frames with numeric order: `00`, `01`, `02`, etc.
6. Keep `00 — CURRENT MASTER / START HERE` as the leftmost frame.
7. Never mix current and archive frames in the top row.
8. Never treat archive/governance/reference frames as implementation-ready.

## Current Decision

The Product Design page is now structured as:

- top: current version only;
- below: archive grouped by section and version family.

Manual Figma Present walkthrough can proceed from the top current row, left to right.

Implementation remains blocked until explicit founder approval.

## Data Honesty

Mandatory caveat remains:

**“Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.”**

No official/live/cadastral/valuation/production-ready claims were introduced.
