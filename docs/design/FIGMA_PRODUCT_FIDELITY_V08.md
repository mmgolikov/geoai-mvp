# Figma Product Fidelity v0.8

Status: design correction active / implementation blocked

## Summary

Updated Figma Product Design to align with the real current `/workspace` product structure.

## What changed in Figma

- `01 — Product Design` now starts with `v0.8 — production-prototype fidelity pass`.
- Current v0.8 is placed first / leftmost.
- Previous v0.7 is placed to the right as a rejected mismatch reference.
- Versions are not layered on top of each other.
- The workspace frame is rebuilt around the actual product layout:
  - top navigation;
  - map-first main canvas;
  - 380px right AnalysisPanel;
  - B2B/B2C tabs;
  - project block;
  - role/scenario block;
  - map-first / criteria-first mode;
  - custom query;
  - candidate search;
  - selected point;
  - footer CTA.

## Prototype flow

A visible scenario flow map is included:

1. Workspace opens in map-first mode.
2. User selects point / AOI / candidate.
3. Right panel CTA runs analysis.
4. Analysis / Compare / Report replace main canvas.
5. Projects / Readiness preserves source lineage.

A native Figma reaction was attempted on the current frame. It still needs manual verification in Figma before claiming the design is a fully clickable prototype.

## Source-of-truth logic

The design follows the current app layout: `/workspace` renders `TopNavigation` and `WorkspaceShell`; `WorkspaceShell` uses the main canvas plus a 380px right panel.

## Decision

No implementation handoff is approved. Codex prompt remains blocked until owner visual review and clickable prototype verification.
