# Figma Compact Structure and Versioning v1

Status: active Figma organization rule  
Date: 2026-07-07  
Branch: `design-audit-v1`  
Scope: design organization only

## Executive summary

The Figma file had too many pages and needed a more compact operating structure.

The design work is now organized around a small set of current section pages. Each section opens with the current version first and keeps its version history inside the page.

No legacy work was deleted. Old pages remain traceable through the archive index.

## Current Figma pages

Use these pages for active work:

1. `1 — Product Design`
2. `2 — Design System`
3. `3 — Responsive QA`
4. `4 — Design QA & Handoff`
5. `5 — Archive Index`

`0 — HQ` remains the entry dashboard.

## Versioning rule

Each active section page must follow this order:

1. Current version / latest state.
2. Version history.
3. Section-specific work blocks.
4. QA notes / open issues.
5. Archive references only if needed.

The first visible frame on every section page must be the current approved or active version.

## Current section status

| Section | Current version | Status |
| --- | --- | --- |
| Product Design | v0.3 prototype-faithful direction | Active / not implementation-ready |
| Design System | v0.2 GeoAI Light current-app system | Active |
| Responsive QA | v0.2 prototype-faithful responsive QA | Active |
| Design QA & Handoff | v0.2 implementation blocked | Active gate |
| Archive Index | v0.1 legacy reference list | Reference only |

## Governance

- Do not add a new Figma page for every small update.
- Add new versions inside the relevant section page.
- Keep the latest version at the top.
- Move old explorations into version history or archive references.
- Do not create Codex handoff from archived drafts.

## Current decision

Design implementation remains blocked until the compact current pages pass manual QA.
