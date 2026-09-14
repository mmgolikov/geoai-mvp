# Spatial Blue Design System v1.2

Date: 2026-07-08  
Branch: `design-audit-v1`  
PR: #42 — `Add current app design audit v1`  
Figma file key: `TAzDqOvRCw1mQGMU3Y4S9H`

## Executive Summary

Founder accepted `Workspace UX Reference Fidelity v1.2 / current` as the corrected product direction. This document records the next design-system pass: the GeoAI brand and component system is updated from the previous green/teal direction to a deep spatial blue direction aligned with the current `/workspace` product reference.

This is a design-system and design-governance artifact only. It is not a Codex prompt, not an implementation PR, and not production approval.

Current decision:

**Design direction accepted; implementation remains blocked until explicit handoff approval.**

No Codex implementation prompt.  
No implementation PR.  
No production deployment.  
No changes to `main`.

## Figma Frames Updated

| Active page | Current frame | Node ID | Status |
|---|---|---:|---|
| `02 — Design System` | `Brand Foundation v1.2 / current` | `98:2` | Created and screenshot QA checked |
| `02 — Design System` | `Design System Components v1.2 / current` | `98:47` | Created, visual QA corrected and screenshot QA checked |
| `04 — Design QA & Handoff` | `Design QA & Handoff v1.3 / current` | `98:124` | Updated after acceptance |

Previous `v1.1` frames were preserved to the left as previous/superseded frames.

## Brand Direction

GeoAI should feel:

- premium
- calm
- precise
- evidence-led
- international
- enterprise SaaS
- spatially intelligent
- suitable for UAE real estate / development intelligence
- not generic GIS
- not agriculture / sustainability software
- not dark sci-fi
- not colorful dashboard software

The accepted visual formula remains:

**Apple clarity + Notion discipline + ChatGPT calmness + enterprise geospatial rigor.**

## Palette v1.2

| Token | Hex | Usage |
|---|---:|---|
| `ink` | `#172033` | Primary text, headings |
| `night` | `#0B1220` | Strong text / contrast reference |
| `muted` | `#5F6B7A` | Secondary copy |
| `soft` | `#98A2B3` | Low-emphasis labels |
| `line` | `#DDE3EA` | Borders and separators |
| `surface` | `#F6F8FB` | App background, panel sections |
| `white` | `#FFFFFF` | Cards, controls |
| `brand` | `#183B5B` | Primary CTA, active map controls, selected markers |
| `brand-hover` | `#102F49` | Hover / active blue state |
| `spatial-blue` | `#235D8C` | Links, badges, spatial evidence labels |
| `signal-blue` | `#2F6DB5` | Map selection stroke, active evidence highlights |
| `cobalt-signal` | `#405CFF` | Rare high-signal highlight only |
| `ice` | `#E6F1F7` | Blue-tinted soft badge / selected background |
| `ice-soft` | `#F1F6FA` | Very subtle blue-tinted surface |
| `map-blue-gray` | `#DFE8EC` | Map workspace background / map card base |
| `validation-gold` | `#C5A76A` | Caveats, conditional decision state, validation gaps |
| `validation-soft` | `#FFF9E8` | Caveat bar / conditional card background |
| `critical-red` | `#9F3412` | Blocking / error text |
| `critical-soft` | `#FFF4ED` | Error / blocker background |

Retired as primary UI direction:

| Retired token | Hex | Reason |
|---|---:|---|
| `geo-teal / green` | `#0F766E` | Reads as agriculture/sustainability and conflicts with real estate / investment intelligence positioning. |

## Color Usage Ratio

| Share | Group | Usage |
|---:|---|---|
| 75% | Neutral surfaces | Background, cards, map shells, tables, input fields |
| 17% | Spatial blues | Primary CTA, active tabs, selected AOI, map controls |
| 6% | Evidence blue tints | Badges, source labels, selected states, low-emphasis fills |
| 2% | Validation gold / red | Caveats, blockers, validation gaps, destructive/error states |

Rules:

- Use deep spatial blue for primary actions and selected spatial objects.
- Use blue tints for secondary active / selected states.
- Use validation gold only for caveats, conditional decision posture and validation gaps.
- Use red only for true blockers, destructive actions or errors.
- Do not use green/teal for primary product accents.
- Do not add random colorful pills.
- Do not create decorative empty cards.

## Typography and Spacing

Font:

`Inter`

Rules:

- Product UI remains dense but readable.
- Right panel uses compact 10–14px labels and controls.
- Dashboard headings use 20–32px depending on hierarchy.
- No unnecessary heading wrapping when horizontal space exists.
- No clipped business-critical copy.
- Line-height target: 120–130% for dense UI, higher only for explanatory text.
- Use the existing product geometry and spacing rhythm before inventing new layout systems.

## Product Fidelity Rules

The design system now explicitly follows the approved `Workspace UX Reference Fidelity v1.2 / current` direction:

1. Do not replace the product with a decorative cockpit.
2. Do not introduce a new navigation rail.
3. Do not create a new admin console layout.
4. Do not add large empty placeholder cards.
5. Do not move primary actions away from the right `AnalysisPanel` footer.
6. Do not hide evidence/source lineage in decorative drill-down only.
7. Keep the current `/workspace` geometry: 64px `TopNavigation`, main canvas, 380px right `AnalysisPanel`.
8. Map controls live inside the map layer.
9. The dashboard follows `ExpressDashboard` anatomy.

## Component Rules v1.2

### TopNavigation

Reference behavior:

- 64px header.
- Left logo mark `G`.
- Wordmark `GeoAI`.
- Subtitle `Spatial decision intelligence`.
- Right nav links: `Workspace`, `Projects`.

Do not add non-reference nav items to product mockups unless they exist in code or are explicitly approved.

### Map controls

Reference controls:

- `Spatial layers` at top-right.
- Polygon drawing control near top-right controls.
- Basemap switcher at bottom-right.
- Start overlay inside map layer.
- Selected AOI / selected object overlay inside map layer.

Do not place map controls in a decorative top toolbar.

### Right AnalysisPanel

Reference order:

1. B2B/B2C audience segment.
2. Project selector / `Projects` link / `Create` button.
3. Role / Scenario controls.
4. Scenario summary.
5. Interaction mode.
6. Scenario setup.
7. Custom query.
8. Candidate search.
9. Selected point/object/AOI.
10. Active workflow.
11. Footer CTA.

Footer behavior:

- Secondary action: `Add to compare`.
- Primary action: `Run Express Analysis`, `Export Report`, `Compare Selected`, etc.
- CTA remains pinned in the footer.

### ExpressDashboard

Reference anatomy:

- Header card.
- Scenario / target badges.
- Export and Back to setup actions.
- `Map Context` card.
- Decision posture card.
- Suitability / score card.
- KPI cards.
- Top drivers.
- Top risks.
- Recommended next action.
- Drill-down modules.

Do not replace this with generic BI dashboard blocks.

### Data Honesty Components

Every decision output must keep caveats near the recommendation:

**“Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.”**

Source lineage should remain adjacent to decision outputs or visible in a clearly connected module.

## Implementation Mapping Preview

This is guidance only. It is not an implementation instruction.

Potential Tailwind token mapping, pending engineering approval:

| Product token | Current / target value | Use |
|---|---:|---|
| `brand` | `#183B5B` | Primary CTA, active map controls, selected markers |
| `brand-hover` | `#102F49` | Button hover / active states |
| `spatial-blue` | `#235D8C` | Links, badges, spatial evidence labels |
| `surface` | `#F6F8FB` | Workspace background / panel sections |
| `line` | `#DDE3EA` | Borders and separators |
| `validation-gold` | `#C5A76A` | Caveats, conditional decision posture, validation gaps |

## QA Status

| QA item | Status | Notes |
|---|---|---|
| Spatial blue direction | Accepted | Founder accepted blue direction after v1.2 correction. |
| Brand Foundation v1.2 | Updated | Current frame created and screenshot QA checked. |
| Components v1.2 | Updated | Current frame created, screenshot QA checked, visual overlaps corrected. |
| Version lane | Pass with manual caveat | Previous v1.1 frames preserved left; manual Figma navigator check remains recommended. |
| Native prototype links | Pending | Not manually verified. |
| Pixel-perfect browser match | Pending | Requires browser/Figma comparison before implementation. |
| Implementation | Blocked | Requires explicit handoff approval. |

## Remaining Issues

1. Manual Figma navigator QA remains recommended because connector page listings have been inconsistent in earlier passes.
2. Native prototype links are still not verified.
3. Pixel-perfect browser comparison is still pending.
4. Engineering brief can now be prepared, but Codex prompt remains blocked until explicit approval.

## Handoff Decision

The design direction is accepted.

Implementation is not yet approved.

Next allowed work:

1. Prepare design-to-engineering brief.
2. Define screen-by-screen implementation acceptance criteria.
3. Map accepted Figma components to existing React/Tailwind components.
4. Keep Codex prompt and implementation PR blocked until explicit founder approval.
