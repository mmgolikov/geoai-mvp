# GeoAI Manual QA Checklist

Use this checklist before demos, Vercel deployments, and milestone checkpoints.

## Environment

- [ ] `.env.local` exists locally when running Mapbox.
- [ ] `.env.local` is not committed.
- [ ] `.env.example` contains only safe placeholder keys.
- [ ] `NEXT_PUBLIC_MAPBOX_TOKEN` is configured locally.
- [ ] `NEXT_PUBLIC_MAPBOX_TOKEN` is configured in Vercel.
- [ ] `OPENAI_API_KEY` is not required for current MVP behavior.
- [ ] `npm run build` passes.
- [ ] `npm run lint` passes.
- [ ] `npm run ingest:dld:snapshot` exits successfully.
- [ ] `npm run ingest:osm:snapshot` exits successfully.

## Map Loading

- [ ] `/workspace` opens without runtime errors.
- [ ] Mapbox basemap loads when token is configured.
- [ ] Safe fallback appears if Mapbox token is missing or invalid.
- [ ] Map remains centered on Dubai on initial load.
- [ ] Map does not jump after point selection.
- [ ] Map does not reinitialize on every click.

## Spatial Layers

- [ ] Spatial layers control is collapsed by default.
- [ ] Active layer count is visible.
- [ ] User can expand layers.
- [ ] User can toggle each layer on and off.
- [ ] `Show all` works.
- [ ] `Hide all` works.
- [ ] Legend is visible when layers are expanded.
- [ ] Layer styles are readable and not overly saturated.

## Point Selection

- [ ] Clicking empty map area selects a point.
- [ ] Marker appears at selected point.
- [ ] Coordinates update in the right command panel.
- [ ] `Run Express Analysis` becomes enabled.
- [ ] Map zoom and center are preserved.

## Object Selection

- [ ] Clicking a demo polygon selects the object.
- [ ] Clicking a demo point selects the object.
- [ ] Clicking a demo line/corridor selects the object.
- [ ] Selected object is highlighted.
- [ ] Right panel shows object name, type, layer, and coordinates.
- [ ] User can run Express Analysis for selected object.

## Polygon AOI Drawing v1.7

- [ ] `Add polygon` starts explicit drawing mode.
- [ ] Clicking vertices draws a boundary line.
- [ ] Moving the cursor shows a live preview segment.
- [ ] Clicking near the first vertex closes the polygon.
- [ ] Vertex handles are visible only during drawing.
- [ ] `Undo vertex` removes the last vertex.
- [ ] `Cancel` and `Esc` exit drawing mode.
- [ ] Invalid/self-intersecting polygons are rejected with a clear message.
- [ ] Accepted AOI shows area, perimeter, vertices, source and validation status in the command panel.
- [ ] Express Analysis works for the user-drawn AOI.
- [ ] Report preview and print route include AOI measurements and validation caveat.
- [ ] Comparison supports adding a user-drawn AOI.
- [ ] Point and demo object selection still work after deleting the AOI.

## AOI Library + GeoJSON Import/Export v1.8

- [ ] Drawn AOI can be saved to the active project AOI Library.
- [ ] Saved AOI appears in the compact Workspace AOI Library block.
- [ ] Saved AOI appears in the Project Dashboard AOI Library summary.
- [ ] Saved AOI can be reopened from Workspace.
- [ ] Saved AOI can be reopened from `/projects` without leaking across projects.
- [ ] Saved AOI can be renamed.
- [ ] Saved AOI can be deleted.
- [ ] Saved AOI can be exported as GeoJSON.
- [ ] Current drawn AOI can be exported as GeoJSON.
- [ ] Valid GeoJSON Feature with Polygon geometry imports successfully.
- [ ] Valid GeoJSON FeatureCollection with one Polygon imports successfully.
- [ ] FeatureCollection with multiple Polygons imports the first Polygon and shows a warning.
- [ ] Point GeoJSON is rejected with a clear message.
- [ ] LineString GeoJSON is rejected with a clear message.
- [ ] MultiPolygon GeoJSON is rejected with `MultiPolygon support is planned.`
- [ ] Polygon holes are rejected with `Polygon holes are not supported yet.`
- [ ] Invalid coordinates are rejected with `Invalid coordinates. Expected [longitude, latitude].`
- [ ] Imported AOI is selected, measurable, and labeled as Uploaded GeoJSON.
- [ ] Imported AOI can be saved, reopened, analyzed, added to comparison, and exported.
- [ ] Exported GeoJSON includes caveat, source type, validation status, centroid and measurements.
- [ ] Exported GeoJSON can be re-imported.
- [ ] Required caveat remains visible: screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.
- [ ] No UI, report or docs copy describes uploaded AOIs as official parcel, zoning, cadastral, ownership, approval or valuation evidence.

## Client Data Room Foundation v1.9

- [ ] `GET /api/data-room?projectKey=dubai-investment-screening-demo` returns 200.
- [ ] `GET /api/data-room?projectKey=developer-land-pipeline-demo` returns 200.
- [ ] `GET /api/data-room?projectKey=bank-asset-review-demo` returns 200.
- [ ] `/projects` shows a compact Client Data Room section.
- [ ] Client Data Room counts are scoped to the active project.
- [ ] Latest assets show at most three records.
- [ ] Add/upload data registers metadata only and does not claim durable file storage.
- [ ] Validation checklist appears with compact status controls.
- [ ] Updating a checklist item persists in local/API fallback for that project.
- [ ] Workspace command panel shows Data Room / Pilot Evidence as a collapsed secondary block.
- [ ] Scenario and Custom Query remain near the top of the command panel.
- [ ] Adding current AOI/analysis to the data room does not duplicate AOI Library bloat.
- [ ] Local/API fallback caveat remains visible.
- [ ] Required official-validation caveat remains visible.
- [ ] No secure/enterprise/production data room claim appears.

## Scenario Analysis

- [ ] Scenario selector is visible.
- [ ] Each scenario can be selected.
- [ ] Scenario description updates.
- [ ] Custom Query requires a question before analysis.
- [ ] Express Analysis opens dashboard.
- [ ] Dashboard title and content change by scenario.
- [ ] OpenAI works only through the server route when configured.
- [ ] Mock fallback works when `OPENAI_API_KEY` is missing.
- [ ] No OpenAI key is exposed to the browser.

## Dashboard

- [ ] Dashboard renders immediately without a large blank area.
- [ ] User does not need to scroll to force layout correction.
- [ ] Score cards are visible.
- [ ] Map card is bounded and does not reserve full viewport height.
- [ ] Back to map works.
- [ ] Export report opens report preview.

## Comparison

- [ ] User can add a selected point to comparison.
- [ ] User can add a selected object to comparison.
- [ ] Duplicate selections are prevented.
- [ ] Comparison set is limited to 3 items.
- [ ] Compare button is disabled until at least 2 items exist.
- [ ] Comparison dashboard opens.
- [ ] Winner recommendation is visible.
- [ ] Score table and cards render correctly.
- [ ] Remove item works.
- [ ] Back to map works.

## Report Preview

- [ ] Express Analysis report preview opens.
- [ ] Comparison report preview opens.
- [ ] Report preview includes GeoAI branding.
- [ ] Report preview includes map window.
- [ ] Report preview includes demo/mock evidence notes.
- [ ] Back to dashboard works.
- [ ] Print / Save as PDF opens browser print dialog.
- [ ] Print layout hides navigation and command panel.

## Vercel Deployment

- [ ] Repository is connected to Vercel.
- [ ] Build succeeds on Vercel.
- [ ] Environment variables are configured in Vercel.
- [ ] `/` renders.
- [ ] `/workspace` renders.
- [ ] Map loads in deployed environment.
- [ ] Demo layers and analysis flows work after deployment.

## External Data v1.4

- [ ] `GET /api/external-data/manifest` returns v1.4 manifest JSON.
- [ ] `GET /api/external-data/sources` returns Source Registry records.
- [ ] `GET /api/external-data/status` returns readiness states.
- [ ] `POST /api/context/market` returns snapshot-backed context when DLD snapshot area matches, otherwise seed/demo fallback.
- [ ] `GET /api/context/climate?lat=25.08&lng=55.14` returns climate context or sample fallback.
- [ ] UI says snapshot/sample fallback, not live official integration.
- [ ] Evidence and reports retain official-validation-required caveats.

## Public Data Connectors v1.6

- [ ] `npm run ingest:dld:public` exits successfully.
- [ ] `npm run ingest:osm:public` exits successfully.
- [ ] `npm run ingest:overture:public` exits successfully.
- [ ] `npm run ingest:worldpop:public` exits successfully.
- [ ] `npm run ingest:admin-boundaries:public` exits successfully.
- [ ] `npm run ingest:public-data:all` exits successfully.
- [ ] `GET /api/context/spatial?lat=25.0822&lng=55.1431` returns source lineage and caveat.
- [ ] `GET /api/context/accessibility?lat=25.0822&lng=55.1431` returns accessibility proxy.
- [ ] `GET /api/context/demographics?lat=25.0822&lng=55.1431` returns WorldPop fallback/context.
- [ ] `GET /api/context/air-quality?lat=25.0822&lng=55.1431` returns connected or sample fallback state.
- [ ] `GET /api/context/solar-energy?lat=25.0822&lng=55.1431` returns connected or sample fallback state.
- [ ] `GET /api/context/satellite-availability?bbox=55.10,25.05,55.20,25.12&from=2026-01-01&to=2026-06-01` returns metadata sample/planned state.
- [ ] External Data Status remains compact in the workspace command panel.
- [ ] Project Dashboard Data Readiness groups DLD/Dubai Pulse, open spatial, climate/energy, environment, demographics, satellite and official validation without overflow.
- [ ] No live official DLD, Dubai Pulse, GeoDubai, parcel, zoning, cadastral, ownership or valuation claims appear.

## Investor Demo Narrative v1.5

- [ ] `/demo` renders with three narrative cards.
- [ ] `/demo` cards show buyer type, decision question, demo promise and pilot duration.
- [ ] Start demo opens the correct prepared workspace for fund/family office.
- [ ] Start demo opens the correct prepared workspace for developer land pipeline.
- [ ] Start demo opens the correct prepared workspace for bank/lender asset review.
- [ ] `/workspace?demoNarrativeId=fund-investment-screening&projectId=dubai-investment-screening-demo` loads the Dubai investment screening context.
- [ ] `/workspace?demoNarrativeId=developer-land-pipeline&projectId=developer-land-pipeline-demo` loads the developer land pipeline context.
- [ ] `/workspace?demoNarrativeId=bank-asset-review&projectId=bank-asset-review-demo` loads the bank asset review context.
- [ ] Workspace command panel shows a compact Demo Script block when a narrative is active.
- [ ] Scenario selector and custom query remain near the top of the command panel.
- [ ] Primary CTA footer remains visible.
- [ ] `/projects?projectKey=dubai-investment-screening-demo` shows the fund pilot package.
- [ ] `/projects?projectKey=developer-land-pipeline-demo` shows the developer pilot package.
- [ ] `/projects?projectKey=bank-asset-review-demo` shows the bank pilot package.
- [ ] Report preview and printable report show decision question and pilot next action when project context exists.
- [ ] Required caveat remains visible: screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.

## Responsive Checks

- [ ] Homepage renders on desktop.
- [ ] Workspace renders on desktop.
- [ ] Workspace remains usable on tablet width.
- [ ] Right command panel remains readable.
- [ ] Buttons do not overflow their containers.
- [ ] Report preview remains printable.
