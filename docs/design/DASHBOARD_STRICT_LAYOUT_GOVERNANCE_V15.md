# Dashboard Strict-Layout Governance v1.5

Date: 2026-07-08  
Branch: `design-audit-v1`  
PR: #42 — `Add design audit and workspace product-fidelity v1.2`  
Figma file key: `TAzDqOvRCw1mQGMU3Y4S9H`

## Executive Summary

Founder QA rejected the previous ExpressDashboard mock as visually chaotic: text overlapped, CTA labels wrapped, and dashboard blocks did not have enough reserved space. This document locks non-negotiable layout rules and records the corrective design pass.

The dashboard was rebuilt in Figma as:

`Prototype / ExpressDashboard — strict layout QA v1.5`

The current product audit frame was updated to:

`Product System Reference Audit v1.5 / current`

The design QA / handoff frame was updated to:

`Design QA & Handoff v1.5 / current`

Implementation remains blocked.

No Codex implementation prompt.  
No implementation PR.  
No production deployment.  
No changes to `main`.  
No Supabase/API/runtime changes.

## Non-Negotiable Layout Rules

These rules are now hard constraints for every GeoAI product screen and override visual experimentation.

### 1. No overlap

No text may overlap another text, card, button, border, chart, map or visual object.

Required behavior:

- Title blocks must have reserved height.
- Body text must start after the title block.
- CTA labels must fit on one line.
- Badges must have enough width for their text.
- Cards must not place metrics over narrative copy.

### 2. No overflow

Text cannot leave its card or visual area.

Required behavior:

- Long labels must be shortened, truncated, or wrapped inside a fixed reserved height.
- If a label cannot fit, rewrite the label, not the layout.
- No text may cross card boundaries.
- No text may sit under another component.

### 3. Product grid first

The product shell is not optional.

Required behavior:

- Desktop workspace keeps 64px `TopNavigation`.
- Main canvas remains left of the right command panel.
- Right command panel remains 380px wide on desktop.
- No decorative cockpit shell.
- No invented dashboard system that is not in the product.

### 4. Pinned action safety

Primary actions must stay visible and legible.

Required behavior:

- Right panel content must stop above the pinned footer.
- Footer CTA area must never be covered by selected object / AOI cards.
- Primary and secondary CTA labels must fit on one line.
- Disabled CTA states must remain readable.

### 5. Symmetry and rhythm

Screen layout must look intentionally measured.

Required behavior:

- Cards align to common x/y edges.
- Paired cards use equal heights.
- Gutters use consistent 8px / 12px / 16px / 24px rhythm.
- Left and right dashboard columns must balance visually.
- A row should not contain unrelated card heights unless hierarchy requires it.

### 6. Decision hierarchy

Every decision screen has one primary conclusion.

Required behavior:

- One main decision statement.
- One primary score card.
- One recommended next action.
- Drivers and risks are secondary and balanced.
- Evidence/source lineage stays connected to the decision.

### 7. Modern color discipline

Use a more distinctive modern spatial palette without becoming noisy.

Required behavior:

- Use electric spatial blue for primary actions and selected spatial objects.
- Use midnight blue for product identity and high-contrast anchors.
- Use blue-violet only as a rare signal accent.
- Use validation gold only for caveats / conditional status.
- Do not use green/teal as a primary product accent.
- Do not add random colors for decoration.

### 8. QA gate

Before any design can move toward engineering handoff, it must pass:

- screenshot QA,
- automated bounds QA,
- prototype reaction QA,
- manual Figma Present walkthrough,
- data honesty QA.

## ExpressDashboard v1.5 Correction

The dashboard was rebuilt with strict block geometry:

- Header card with reserved action area.
- One-line `Export` and `Back to setup` buttons.
- Left `Map Context` card with fixed viewport.
- Right decision system card with separate reserved areas for:
  - decision posture,
  - suitability score,
  - narrative,
  - KPI row,
  - top drivers,
  - top risks,
  - recommended next action.
- Drill-down modules moved below the first decision area.
- Right `AnalysisPanel` kept as command panel.

## Modern Palette Correction

The strict dashboard pass applied a stronger modern spatial palette:

| Role | Color | Usage |
|---|---:|---|
| Midnight identity | `#172554` | Logo / deep anchor states |
| Electric spatial blue | `#2F5BFF` | Primary CTA, selected point, active evidence |
| Blue-violet signal | `#6D5EF6` | Rare signal accent / secondary highlight |
| Frosted surface | `#F5F7FB` | Background |
| Frosted map | `#E3EDF6` | Map base |
| Validation gold | `#B7791F` | Conditional state / validation gap |

## Final QA Result

After correction:

| QA item | Result |
|---|---:|
| Top-level prototype frames | 11 |
| Native Figma reactions | 13 / 13 |
| Automated bounds issues | 0 |
| Dashboard button label wrap | Fixed |
| Decision posture text overlap | Fixed |
| Right panel selected-card / footer collision | Fixed |
| Spatial layers badge wrap | Fixed |
| Data honesty caveat | Present |

## Remaining Blockers

1. Manual Figma Present walkthrough still recommended before implementation.
2. Pixel-perfect live browser capture is not claimed in this design-only audit.
3. Engineering handoff and Codex prompt remain blocked.
4. No runtime/API/Supabase/production changes are allowed.

## Current Decision

Dashboard strict-layout QA passes for the current design track.

Implementation remains blocked.

Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.
