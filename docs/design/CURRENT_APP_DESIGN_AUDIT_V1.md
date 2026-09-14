# GeoAI Current App Design Audit v1

Status: parallel design track / no implementation approval  
Date: 2026-07-07  
Branch: `design-audit-v1`  
Base: current `main`  
Scope: design audit only

## Executive summary

The new design work must stay parallel to active development and must not affect `main`, PR #41 or any dev_4 engineering work.

The design direction must fit the current GeoAI application as implemented, not a future re-architecture. The correct design strategy is prototype-faithful visual improvement: preserve current UX logic and improve visual clarity, hierarchy, density and enterprise polish.

## Separation from active development

Active development work is not duplicated here. This design audit does not touch code, APIs, data contracts, report rendering, source-lineage implementation, product hardening, Supabase, Vercel production or runtime behavior.

The design track may document visual requirements and prepare Figma direction only.

## Current app UX to preserve

- top navigation;
- workspace main canvas;
- right command panel;
- bottom primary action placement;
- map-first flow;
- criteria-first flow;
- analysis, comparison and report as main canvas states;
- Project Hub with Data Readiness / Source Lineage;
- report/export flow;
- source/evidence/data honesty treatment.

## Current Figma status

Existing Figma work includes prototype-faithful direction on page `14 — Prototype-faithful Visual Redesign` and manual QA gate on page `15 — Manual QA Gate`.

Current Figma design is not implementation-ready. It is directionally correct but still too schematic for design-to-code handoff.

## Design gaps

| ID | Gap | Impact | Required action |
| --- | --- | --- | --- |
| D-01 | Current frames are schematic | Cannot hand off to Codex | Refine visual detail without UX changes |
| D-02 | Projects / Readiness treatment needs enterprise polish | Source-lineage value may look too raw | Improve table/card hierarchy while preserving fields |
| D-03 | Right command panel states need more precise styling | Current product control logic may be underrepresented | Create polished setup/result/error states |
| D-04 | Mobile/tablet composition needs app-specific QA | Risk of squeezed desktop cockpit | Define prototype-faithful responsive patterns |
| D-05 | Evidence/caveat placement must be visually standardized | Data honesty risk | Add visible evidence/caveat pattern to all decision states |

## Data Readiness / Source Lineage design requirement

Projects / Readiness must show:

- source group name;
- status;
- data mode;
- record count if available;
- confidence;
- caveat;
- next validation step.

The UI must not claim official/live integration or decision-grade validation.

## Required caveat

Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.

## Design work roadmap

1. Freeze current-app UX contract.
2. Refine Figma page 14 into polished prototype-faithful frames.
3. Build a dedicated Projects / Readiness Data Readiness frame.
4. Build final right command panel states.
5. Build mobile/tablet responsive variants from current app logic.
6. Run manual visual QA.
7. Produce design handoff package only after pass.

## Current decision

Design implementation remains blocked.

No Codex implementation prompt should be prepared yet.
