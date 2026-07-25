# GeoAI Design Quality Reset v1

Status: V6 draft not approved for implementation  
Date: 2026-07-05  
Owner: GeoAI Product Design / Product Strategy / Engineering  
Related Figma: `GeoAI — Design HQ / GeoAI Light`, page `8 — Design Quality Reset`

## Executive decision

The current V6 Figma draft is **not approved** as an implementation source.

User review identified unacceptable design quality:

- visible text overlaps and collisions;
- primitive card/layout composition;
- uneven whitespace and dead regions;
- too many ad-hoc visual decisions;
- insufficient maturity of product sections;
- too much bulk-generated design without frame-level manual review.

Codex implementation remains blocked.

## Root cause

The issue is not only individual text overlaps. The deeper problem is that Figma screens were generated too quickly and too mechanically. This creates a false sense of progress while the actual design quality remains below the standard required for an enterprise product.

## New quality bar

Future design work must follow this sequence:

1. **Screen content spec** — exact content per screen before drawing.
2. **Wireframe only** — structure, spacing and hierarchy without visual styling.
3. **Visual design pass** — apply GeoAI Light tokens and component design manually.
4. **Responsive variants** — desktop, compact, tablet and mobile per section.
5. **Manual QA screenshots** — visual inspection at target viewports.
6. **Correction pass** — fix all overlaps, spacing, dead cards and content issues.
7. **Approval gate** — only approved screens can feed Codex.
8. **Implementation brief** — prepared only after approval.

## Design principles from this point

| Principle | Rule |
| --- | --- |
| No bulk-generated final UI | Figma automation can create structure, but final screens require manual quality pass |
| Content first | No card without real content source, user question or output |
| One purpose per screen | Every frame must have one dominant decision or task |
| Manual spacing | Large frames must be balanced by human review, not auto-filled |
| No hidden failures | Text may wrap, but must not overlap, clip or collide |
| Enterprise polish | Layout must feel premium, calm and intentional |
| Codex blocked | No implementation until design is visually approved |

## Immediate Figma actions completed

1. Created page `8 — Design Quality Reset`.
2. Marked the current V6 draft as not approved.
3. Added NOT APPROVED banners to key Figma pages:
   - `2 — Design system`
   - `3 — Landing page`
   - `4 — Main product`
   - `6 — Responsive QA`
   - `7 — Figma Redesign QA`
4. Updated HQ with quality reset gate.

## What must happen next

### Step 1 — Content spec by screen

Create a screen-by-screen content specification:

- Start / Scenario Hub
- Workspace / Selected Target
- Evidence / Source Confidence
- Analysis / Decision Dashboard
- Compare / Ranked Shortlist
- Report / Board-ready Memo
- Projects / Portfolio Actions
- Readiness / Pilot Operations
- Landing V6

### Step 2 — Wireframes

Create low-fidelity wireframes only. No final colors or decorative cards.

### Step 3 — Visual design

Apply GeoAI Light visual system manually and check every frame.

### Step 4 — QA

Every approved frame must pass:

- no text overlap;
- no clipped meaningful text;
- no dead cards;
- no uncontrolled colors;
- balanced spacing;
- evidence/status visible near decisions;
- responsive behavior defined.

## Codex gate

Codex must not receive an implementation prompt until:

1. Approved Figma screens exist.
2. Confluence QA status is updated.
3. GitHub design docs reflect the approved direction.
4. User visually accepts the design direction.
