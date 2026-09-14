# Landing Strict Layout QA v1.8

Date: 2026-07-08  
Branch: `design-audit-v1`  
PR: #42 — `Add design audit and workspace product-fidelity v1.2`  
Figma file key: `TAzDqOvRCw1mQGMU3Y4S9H`

## Executive Summary

This document records the landing-page design QA micro-pass after ReportPreview cleanup v1.7.

The landing source was audited from `app/page.tsx`. A Figma prototype frame was created to bring the landing page into the current design review set.

Current landing Figma frame:

`Prototype / Landing — strict layout QA v1.8`

Node:

`166:2`

Implementation remains blocked.

No Codex implementation prompt.  
No implementation PR.  
No production deployment.  
No changes to `main`.  
No Supabase/API/runtime changes.

## Source Audit

Landing code source:

`app/page.tsx`

The source includes:

- `LandingHeader`
- `LandingHeroMap`
- product strip
- decision layers
- workflow cards
- scenario examples
- outputs
- mandatory caveat

## Figma Changes

Created:

`Prototype / Landing — strict layout QA v1.8`

The frame includes:

1. Landing header.
2. Hero map background.
3. Hero title and body copy.
4. Primary `Open workspace` CTA.
5. Secondary `View projects` CTA.
6. Mandatory screening caveat.
7. Product strip with five workflow blocks.
8. Decision intelligence section with four decision layers.
9. Workflow section with three workflow cards.
10. Scenarios section with six scenario chips.
11. Outputs section with five output chips.
12. QA note bar.

## QA Corrections Applied

Screenshot QA found two immediate visual issues:

1. `Workspace` nav label wrapped inside the nav button.
2. Hero caveat text was too long for the reserved zone.

Corrections:

- `Workspace` nav button widened and text box resized.
- Hero caveat shortened to: `Screening hypothesis; official validation required.`

## QA Result

| QA item | Result |
|---|---:|
| Landing source coverage | Pass |
| Header / nav containment | Pass after correction |
| Hero title/body containment | Pass |
| Primary and secondary CTA labels | Pass |
| Product strip | Pass |
| Decision layers | Pass |
| Workflow cards | Pass |
| Scenario chips | Pass |
| Output chips | Pass |
| Mandatory caveat | Present |

## Remaining Governance

Landing has now been added to the design review set, but the whole design is still not approved for implementation.

Required before Codex:

1. Manual Figma Present walkthrough across all prototype frames.
2. Final current-master consolidation review.
3. Explicit founder approval for engineering handoff.

## Current Decision

Landing strict layout QA v1.8 is added and visually corrected for the immediate nav/caveat issues.

Implementation remains blocked.

Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.
