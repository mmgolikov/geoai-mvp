# GeoAI Figma V6 Manual QA Gate

Status: manual QA gate active, implementation blocked  
Date: 2026-07-05  
Figma file: GeoAI — Design HQ / GeoAI Light

## Summary

The V6 design has moved from creation mode to manual QA and correction mode.

Figma updates:

1. Page `7 — Figma Redesign QA`: added `V6 manual QA gate` panel.
2. Page `0 — HQ`: added `V6 manual QA gate / latest` status panel.

## Current gate

Codex remains blocked until pages 2, 3, 4 and 6 pass visual review against the approved documentation set.

## Pages to review

| Figma page | QA focus | Status |
| --- | --- | --- |
| 2 — Design system | Component coverage and token discipline | Review |
| 3 — Landing page | Hierarchy, density, product preview, CTA spacing | Review |
| 4 — Main product | Eight sections, content mapping, no decorative cards | Review |
| 6 — Responsive QA | Section-specific tablet/mobile behavior | Review |
| 7 — Figma Redesign QA | QA log and issue tracking | Active |

## Correction priorities

1. Remove dead or ornamental cards.
2. Balance whitespace in large desktop frames.
3. Keep color accents semantic only: neutrals + blue/teal/sand + status colors.
4. Avoid clipped or tiny business text.
5. Ensure evidence/status is near each score, recommendation and report output.
6. Confirm mobile/tablet are separate compositions, not squeezed desktop frames.

## Required approval before Codex

Codex implementation prompt can only be prepared after:

1. Design System V6 visual QA is complete.
2. Landing V6 visual QA is complete.
3. Main Product V6 visual QA is complete.
4. Responsive QA V6 visual QA is complete.
5. Confluence status is updated with QA result and remaining known limitations.

## Next work

1. Perform manual visual QA pass.
2. Apply Figma correction pass.
3. Update Confluence with QA result.
4. Prepare implementation brief only after approval.
