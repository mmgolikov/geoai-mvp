# GeoAI AOI-Ready Demo v1.7

Release date: June 23, 2026

Production URL: https://geoai-mvp.vercel.app

Release deployment URL: https://geoai-on6lwrc6t-geoaidev.vercel.app

Release deployment id: `dpl_5W4LMGSV3zMQSLCRjtYCNShHhszd`

AOI workflow commit SHA: `3a74f9f18f6094715347a90a2a88619a833bc725`

## Scope

GeoAI AOI-Ready Demo v1.7 adds an explicit polygon area-of-interest drawing workflow to the existing Dubai/UAE spatial decision intelligence demo. It lets a user draw a custom screening area on the workspace map and carry that user-provided geometry through analysis, comparison, evidence/source lineage, report preview and printable reports.

This release does not add official parcel, zoning, cadastral, ownership, planning or valuation validation. User-drawn AOIs remain screening context only.

Required caveat: screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.

## What Changed

- Added explicit `Add polygon` drawing mode in the workspace.
- Added click-to-place vertices on the Mapbox canvas.
- Added live preview edge while drawing.
- Added snap-to-start closure behavior.
- Added undo, cancel, replace and delete controls.
- Added keyboard shortcuts for drawing mode:
  - `Backspace` removes the last vertex while drawing.
  - `Escape` cancels drawing.
- Added input guards so text editing in the Custom Query textarea is not interrupted by drawing shortcuts.
- Added project-scoped state reset so in-progress drawings and AOI analysis state do not leak between projects.

## Polygon Validation And Measurements

The polygon workflow includes deterministic client-side validation and approximate screening measurements:

- minimum vertex count;
- duplicate consecutive vertex guard;
- self-intersection guard;
- minimum area guard;
- maximum area guard;
- approximate area;
- approximate perimeter;
- centroid;
- bounding box;
- vertex count.

Measurements are approximate screening measurements for demo intelligence workflows. They are not survey-grade measurements and must not be used as legal, cadastral, planning or valuation evidence.

## Supported In v1.7

- Draw polygon by vertices.
- Close polygon with snap-to-start behavior.
- Undo, cancel, delete and replace the current polygon.
- Select a user-drawn AOI as the active target.
- Run Express Analysis for a user-drawn AOI.
- Continue analysis with a custom query on a user-drawn AOI.
- Add a user-drawn AOI to comparison.
- Export an AOI analysis report.
- Include AOI geometry summary in report preview and printable reports.
- Reset drawing/analysis state when switching projects.

## Demo Value

v1.7 makes GeoAI easier to demonstrate for real estate and development workflows where the decision target is not a single point or seeded demo object. A user can outline a proposed development area, land assembly candidate, construction zone or planning corridor and immediately generate a screening-level intelligence memo.

## Data Honesty

User-drawn AOIs are:

- user-provided geometry;
- screening area context;
- approximate polygon measurements;
- validation-required evidence.

User-drawn AOIs are not:

- official parcel boundaries;
- official zoning boundaries;
- cadastral validation;
- ownership verification;
- entitled land;
- approved sites;
- certified valuations;
- guaranteed best-use conclusions.

## Known Limitations

- No vertex editing after polygon completion.
- No polygon holes.
- No multipolygons.
- No GeoJSON import/export yet.
- No saved AOI library yet.
- Measurements are approximate screening measurements.
- User-drawn AOIs are not official parcel, zoning, cadastral, ownership, planning or valuation boundaries.
- The workflow remains a demo decision-intelligence layer, not a production-ready or pilot-ready official-data workflow.

## Recommended Next Sprint

Polygon AOI Library + GeoJSON Import/Export v1.8.
