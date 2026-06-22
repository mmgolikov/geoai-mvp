# GeoAI Brand Guidelines

GeoAI is a premium enterprise AI platform for spatial decision intelligence. The product turns sites, polygons, assets and portfolios into decision-ready memos for real estate, development, investment, banking, insurance and public-sector workflows.

This document freezes the approved GeoAI MVP visual identity as the repository baseline. Future UI work should preserve this direction unless a task explicitly asks for a brand change.

## Brand Positioning

GeoAI should feel like an investor-grade B2B/B2G spatial intelligence product for UAE real estate and development decisions. It is serious, board-ready and practical: a map-first workspace that helps users understand what is selected, what it means, what risks exist, what to validate and what to do next.

The product is not a consumer map toy, decorative landing page, technical sandbox or dark operations console.

## Visual Principles

- Light, premium, international and board-ready.
- Minimal but not empty.
- Serious B2B enterprise, not consumer map toy.
- Map-first where spatial context matters.
- Evidence-aware: show source status, limitations and validation needs clearly.
- Every screen should answer: what is selected, what it means, what risks exist, what to validate and what to do next.

## Color Tokens

Use the Tailwind tokens in `tailwind.config.ts` as the primary palette:

| Token | Hex | Use |
| --- | --- | --- |
| `ink` | `#172033` | Primary text and high-emphasis content |
| `muted` | `#5f6b7a` | Secondary text and supporting metadata |
| `line` | `#dde3ea` | Thin borders and separators |
| `surface` | `#f6f8fb` | Soft panels, section backgrounds and neutral cards |
| `brand` | `#174f63` | Primary actions, selected states and key product accents |
| `accent` | `#c5a76a` | Sparse decision/highlight accents |
| `white` | `#ffffff` | Cards and readable surfaces |

Warm page backgrounds may use `#fbfaf7`, `#fbfcfe` or `#f3f6f9` gradients carefully. Avoid introducing new dominant palettes unless a brand task explicitly changes the system.

## Typography Principles

- Use clear, readable hierarchy with calm enterprise density.
- Headings should be confident but not oversized inside dashboards.
- Metadata can be compact, but must remain readable.
- Avoid tiny investor-facing text that becomes illegible in demos or screenshots.
- Long explanations belong in body copy, helper text or report sections, not in button labels.

## Layout Principles

- Use clean grids with consistent spacing.
- Keep map/context and decision-summary cards visually balanced when they are compared side by side.
- Preserve pinned/sticky action footers where command workflows depend on them.
- Avoid horizontal overflow on mobile and tablet.
- Stack cards naturally on smaller screens without forced desktop heights.

## Card And Component Principles

- Prefer `rounded-md` or `rounded-lg`.
- Use thin `border-line` borders.
- Use white or `surface` backgrounds.
- Use `shadow-soft` only for important containers and first-level hero/product surfaces.
- Avoid nested cards unless needed for structured data.
- No text overflow. Use wrapping, line clamp or smaller copy where necessary.
- Equal-height cards are preferred where visual comparison matters.

## Map Styling Principles

- Maps must look credible and production-like.
- Fallback maps must look intentional, not like broken placeholders.
- Avoid heavy square grids and random abstract ellipses.
- Use subtle district labels, coastline hints, roads/corridors and selected geometry.
- Selected geometry must be clear but not cartoonish.
- Never use bright random colors for polygons.
- Map labels and selected-site labels must remain readable and should not clash with layer controls.

## CTA And Button Principles

- Primary: `brand` background with white text.
- Secondary: white or `surface` background, `line` border and `ink` text.
- Maximum 2 primary actions in key CTA rows.
- Keep button labels short and explicit: `Analyze`, `Continue`, `Compare`, `Export`, `Open workspace`, `Launch guided demo`.
- Explanations go into subtitles, helper text or status strips, not long button labels.
- Primary workflow actions should remain visible where they drive the demo.

## Report And Print Styling Principles

- Reports should use the same light enterprise brand as the app.
- Use clear section hierarchy, thin borders and readable white/surface cards.
- Keep print pages compact and controlled; avoid giant blank areas.
- Preserve evidence/source lineage and validation language.
- Do not imply demo, sample or planned data is official.

## Forbidden Patterns

- Heavy dark dashboards.
- Neon colors.
- Random map shapes that do not look spatially meaningful.
- Tiny unreadable text.
- Overcrowded CTA rows.
- More than 2 key buttons in a hero/action footer.
- Broken-looking fallback placeholders.
- `Coming soon` / `Later` blocks visible as primary UI.
- Raw technical debug labels in investor-facing screens.
- New color palettes that compete with `brand`, `surface`, `ink`, `muted`, `line` and `accent`.
