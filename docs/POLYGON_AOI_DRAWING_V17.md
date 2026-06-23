# GeoAI Polygon AOI Drawing v1.7

Release scope: workspace polygon drawing for user-defined screening areas of interest.

Update note: AOI Library + GeoJSON Import/Export v1.8 extends this drawing workflow with project-scoped save, reopen, rename, delete, GeoJSON import, and GeoJSON export actions. See [AOI Library + GeoJSON Import/Export v1.8](AOI_LIBRARY_GEOJSON_IMPORT_EXPORT_V18.md).

## Purpose

Polygon AOI Drawing v1.7 lets a user define a custom area directly on the Dubai map before running Express Analysis, adding an item to comparison, or preparing a report. It is intended for early investor, developer, lender and planning demo workflows where the user wants to screen an approximate site boundary instead of a single point.

## User Workflow

1. Open `/workspace`.
2. Click `Add polygon` in the map overlay control.
3. Click map vertices to draw the AOI.
4. Move the cursor to preview the next segment.
5. Click near the first vertex to close the polygon.
6. Review compact AOI metadata in the command panel.
7. Run Express Analysis, add to comparison, or export the report.

While drawing:

- `Undo vertex` removes the last vertex.
- `Cancel` exits drawing mode.
- `Esc` cancels drawing.
- `Backspace` or `Delete` removes the last vertex, except while typing in an input or textarea.

After a polygon is accepted:

- `Replace polygon` starts a new drawing.
- `Delete polygon` clears the current AOI.
- v1.8 adds project library actions to save, reopen, rename, delete, import, and export AOIs.

## Validation

The client validates the polygon before accepting it:

- minimum 3 distinct vertices;
- closed ring repeats the first coordinate at the end;
- no duplicate consecutive vertices;
- lightweight self-intersection check;
- minimum area: 100 sq m;
- maximum area: 500 sq km;
- coordinate order: `[lng, lat]`.

If validation fails, the map control shows a user-facing message and the AOI is not selected for analysis.

## Measurements

Accepted AOIs include:

- approximate area in sq m and sq km;
- approximate perimeter in meters and kilometers;
- centroid;
- bounding box;
- vertex count.

Measurements are client-side approximations for screening only. They are not survey, cadastral, engineering or legal measurements.

## Analysis Integration

User-drawn AOIs are passed through the existing selected-target flow as `user-drawn-aoi` targets.

Express Analysis uses:

- AOI centroid for context services;
- AOI geometry and bounding box for map/report display;
- area, perimeter and vertex count for narrative context;
- source lineage: `user_drawn_polygon`;
- confidence: `validation_required`;
- data mode: `user_provided`.

OpenAI prompts and deterministic fallback both preserve the caveat that a drawn AOI is not an official parcel, zoning, cadastral, planning, ownership or entitlement boundary.

## Report And Comparison Integration

Reports include:

- map context with the polygon;
- AOI measurements;
- source status;
- validation caveat.

Comparison mode supports AOI items alongside map points and demo objects. AOI scoring remains deterministic and conservative: user-drawn polygons carry validation-required risk posture until official/customer-approved boundaries are supplied.

## Data Honesty

Required caveat:

> screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.

User-drawn AOIs must never be described as:

- official parcel boundaries;
- official zoning boundaries;
- cadastral validation;
- ownership verification;
- planning approval;
- certified valuation.

## Known Limitations

- Vertex editing after polygon completion is deferred.
- Polygon holes and multipolygons are not supported in v1.7 or v1.8.
- Area/perimeter measurements are approximate client-side calculations.
- AOIs can be saved to the v1.8 project AOI Library using browser-local/API fallback continuity, but durable production-grade spatial storage is still not complete.
- GeoJSON import/export in v1.8 supports Polygon features only.
- No official GIS, parcel, cadastral, zoning or ownership source is connected by this feature.

## QA Checklist

- Draw a 3+ vertex polygon and close it by clicking near the first vertex.
- Confirm the live preview segment follows the cursor.
- Confirm vertex handles are visible during drawing only.
- Confirm accepted polygon styling is polished and not edit-mode heavy.
- Confirm invalid/self-intersecting polygons are rejected.
- Confirm tiny polygons below 100 sq m are rejected.
- Confirm command panel shows area, perimeter, vertices, source and validation status.
- Confirm Express Analysis works for the AOI.
- Confirm report preview and printable report include AOI details.
- Confirm comparison supports adding an AOI.
- Confirm point and demo object selection still work.
- Confirm map does not jump after selection.
