# GeoAI AOI Library + GeoJSON Import/Export v1.8

Release scope: local-first project AOI assets, GeoJSON Polygon import, and GeoJSON export for reusable screening boundaries.

## Purpose

AOI Library v1.8 turns drawn polygons from one-time map selections into reusable project assets. Users can draw an AOI, save it into the active project, reopen it later, import a GeoJSON Polygon, export a selected or saved AOI, and run Express Analysis on saved or imported AOIs.

This feature is a demo workflow foundation. AOIs are user-provided, uploaded, or demo screening geometry. They are not official parcel, zoning, cadastral, ownership, entitlement, planning, legal, or valuation evidence.

Required caveat:

> screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.

## AOI Asset Model

Saved AOIs include:

- `id`
- `projectId` and `projectKey`
- `name`
- `geometryType: Polygon`
- GeoJSON `Polygon` geometry
- centroid and bounding box
- approximate measurements: area, perimeter, vertex count
- source type: `user_drawn`, `uploaded_geojson`, `demo_object`, or `imported_sample`
- data mode: `user_provided`, `uploaded`, or `demo`
- validation status: `validation_required`, `user_provided_unvalidated`, or `official_validation_planned`
- timestamps
- analysis/report counters for future hardening
- data honesty caveat

The reusable type lives in `src/types/aoi.ts`.

## Workspace Workflow

1. Open `/workspace`.
2. Start polygon drawing from the compact map control or import a GeoJSON Polygon from the command panel.
3. Review compact AOI metadata in the command panel.
4. Optionally edit the AOI name.
5. Save the AOI to the active project library.
6. Reopen, rename, delete, export, analyze, or add the AOI to comparison.

The map control starts or replaces drawing. The command panel remains the place for AOI metadata, Save AOI, Import GeoJSON, Export GeoJSON, Scenario, Custom Query, and primary CTA actions.

## Project Dashboard Workflow

The Project Dashboard includes a compact AOI Library summary:

- saved AOI count;
- source type mix;
- latest saved AOIs;
- area and validation labels;
- actions to open an AOI in the workspace or run analysis.

AOIs are scoped to the active project and should not appear across unrelated project dashboards.

## GeoJSON Import

Supported in v1.8:

- GeoJSON `Feature` with `Polygon` geometry;
- GeoJSON `FeatureCollection` with one `Polygon` feature;
- FeatureCollection with multiple Polygon features imports the first Polygon and shows a warning.

Rejected in v1.8:

- `Point`;
- `LineString`;
- `MultiPolygon`;
- Polygon holes;
- invalid coordinate order or invalid coordinate ranges;
- self-intersecting polygons;
- polygons below the minimum area threshold;
- polygons above the maximum area threshold;
- CRS transformations;
- zipped shapefiles.

Accepted coordinates must use GeoJSON order: `[longitude, latitude]`.

On successful import:

- the AOI becomes the selected workspace target;
- measurements are calculated client-side;
- source type is `uploaded_geojson`;
- data mode is `uploaded`;
- validation status is `validation_required`;
- the user can save the AOI into the project library.

## GeoJSON Export

Export is available for:

- the current drawn AOI;
- the current imported AOI;
- saved AOIs in the project library.

Export format:

- GeoJSON `Feature`;
- `geometry.type: Polygon`;
- properties:
  - `id`
  - `projectId`
  - `name`
  - `sourceType`
  - `dataMode`
  - `validationStatus`
  - `areaSqM`
  - `areaSqKm`
  - `perimeterM`
  - `perimeterKm`
  - `centroid`
  - `createdAt`
  - `caveat`

File naming pattern:

```text
geoai-aoi-[safe-name].geojson
```

Exported files are intended to be re-importable by the same v1.8 workflow.

## API Routes

AOI Library v1.8 adds local/API fallback routes:

- `GET /api/aois?projectId=...`
- `GET /api/aois?projectKey=...`
- `POST /api/aois`
- `GET /api/aois/[id]`
- `PATCH /api/aois/[id]`
- `DELETE /api/aois/[id]`

If durable storage is not configured, the app uses local fallback behavior and browser-local continuity. Serverless fallback storage is non-durable and must not be treated as production persistence.

## Data Honesty Rules

AOIs must be labeled as one of:

- Drawn AOI;
- Uploaded GeoJSON;
- Demo geometry.

Do not describe user-provided or uploaded AOIs as:

- official parcel boundaries;
- official zoning boundaries;
- cadastral validation;
- ownership verification;
- entitlement boundaries;
- planning approval;
- certified valuation;
- approved or guaranteed best use.

## Known Limitations

- No completed polygon vertex editing.
- No Polygon holes.
- No MultiPolygon support.
- No CRS transformation.
- No shapefile import.
- Measurements are approximate screening calculations.
- Browser-local AOI continuity depends on the same browser/device.
- Local API fallback storage is non-durable on serverless platforms.
- Official parcel, zoning, cadastral, ownership, planning, and valuation validation remain future work.

## Future Work

- MultiPolygon support.
- Polygon holes.
- Vertex editing after completion.
- Snapping and topology validation.
- Official/customer-approved boundary validation.
- AOI-linked project data room.
- Durable multi-tenant spatial storage with Supabase/PostGIS or equivalent.
