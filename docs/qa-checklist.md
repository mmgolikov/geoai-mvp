# GeoAI Manual QA Checklist

Use this checklist before demos, Vercel deployments, and milestone checkpoints.

## Environment

- [ ] `.env.local` exists locally when running Mapbox.
- [ ] `.env.local` is not committed.
- [ ] `.env.example` contains only safe placeholder keys.
- [ ] `NEXT_PUBLIC_MAPBOX_TOKEN` is configured locally.
- [ ] `NEXT_PUBLIC_MAPBOX_TOKEN` is configured in Vercel.
- [ ] `OPENAI_API_KEY` is not required for current MVP behavior.
- [ ] `NEXT_PUBLIC_AUTH_MODE` is optional and defaults to public demo access.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is not exposed in browser/client code.
- [ ] If Supabase is configured, `/api/db/health` does not print any secret values.
- [ ] `npm run build` passes.
- [ ] `npm run lint` passes.
- [ ] `GET /api/pilot-backend/status` returns 200 and shows legacy `canRunDemoPilot`, clearer `canRunDemoWorkflow` and `canRunConfidentialPilot`.
- [ ] `GET /api/known-limitations` dynamically reflects DB/storage/auth/audit readiness without overclaiming.
- [ ] `npm run supabase:verify:memberships` exits safely with blockers when Supabase is unavailable.
- [ ] `npm run audit:verify` exits safely with blockers when Supabase is unavailable.
- [ ] `npm run test:api-contract` passes against a running local or preview deployment.
- [ ] `npm run ingest:dld:snapshot` exits successfully.
- [ ] `npm run ingest:osm:snapshot` exits successfully.

## Enterprise Report Pack v2.8

- [ ] `GET /api/report-packages?projectKey=dubai-investment-screening-demo` returns 200.
- [ ] `POST /api/report-packages` creates a package with local/API fallback caveat.
- [ ] `GET /api/report-packages/[id]` returns package metadata and sections.
- [ ] `GET /api/report-packages/[id]/json` returns safe metadata without secrets, signed URLs or private file contents.
- [ ] `GET /api/report-packages/[id]/export` returns export manifest metadata.
- [ ] `/report-packages/[id]/print` renders a client-ready printable package.
- [ ] Printable package shows Back and Print / Save as PDF only.
- [ ] Project Dashboard shows compact Enterprise Report Packages section.
- [ ] Workspace report package actions remain inside collapsed Data Room / Pilot Evidence section.
- [ ] Primary Run Express Analysis CTA remains pinned and visible.
- [ ] Source lineage, validation governance, evidence review, Data Room and pilot workflow appendices render.
- [ ] Caveats remain visible: `screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.`

## Repository Modes v2.0.2

- [ ] `/api/db/health` separates connection `status` from `repositoryMode`.
- [ ] `/api/db/health` returns `repositoryMode: "local_fallback"` when Supabase/PostGIS is not configured or unavailable.
- [ ] `/api/db/health` returns `postgisReady`, `tablesReady`, `missingTables`, `requiredTables`, `migrationName`, and `schemaVersion`.
- [ ] If Supabase is configured but the v2.3 schema is missing, `/api/db/health` returns `status: "configured_incomplete"` or `configured_unavailable` without a 500.
- [ ] If Supabase/PostGIS is ready, `/api/db/health` returns `repositoryMode: "supabase"` only after schema readiness checks pass.
- [ ] Project-scoped fallback APIs include `storageCaveat` where practical.
- [ ] UI labels show `Local/API fallback`, `Browser-local demo`, `Demo seed`, `Supabase/PostGIS`, or `Not configured`.
- [ ] UI does not show raw legacy mode strings such as `local-fallback`, `local_only`, `local_demo`, or `local-only`.
- [ ] The caveat remains visible where relevant: `Local/API fallback is not durable production storage.`
- [ ] The caveat remains documented where relevant: `Supabase/PostGIS durable persistence is active only when configured and schema readiness checks pass.`
- [ ] The caveat remains documented where relevant: `RLS policies require configured Supabase Auth, project memberships and deployment governance.`

## Supabase/PostGIS Durable Persistence v2.3

- [ ] Migration file exists at `supabase/migrations/20260624_geoai_pilot_persistence_foundation.sql`.
- [ ] Migration is additive and does not contain destructive data operations.
- [ ] Migration includes organizations, profiles, memberships, projects, AOIs, analysis runs, reports, comparisons, Data Room, Pilot Workflow, source snapshot, AI score and audit event tables.
- [ ] AOI table uses PostGIS polygon and centroid columns.
- [ ] RLS is enabled for core tables.
- [ ] No broad anonymous write policy exists.
- [ ] Audit event helper is non-blocking and does not claim certified audit/compliance logging.
- [ ] Supabase migration has been applied only in an intended Supabase environment, not against production without review.

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

- [ ] Compact map `Add polygon` control is visible on the right side of the map.
- [ ] Compact map `Add polygon` control starts explicit drawing mode.
- [ ] Drawing mode shows compact Undo / Cancel controls without a large map plaque.
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

## Pilot Workflow & Deliverables v2.0

- [ ] `GET /api/pilot-workflow?projectKey=dubai-investment-screening-demo` returns 200.
- [ ] `GET /api/pilot-workflow?projectKey=developer-land-pipeline-demo` returns 200.
- [ ] `GET /api/pilot-workflow?projectKey=bank-asset-review-demo` returns 200.
- [ ] Missing/unknown project returns a controlled non-500 error.
- [ ] `/projects` shows a compact Pilot Workflow section.
- [ ] Project switching updates workflow title, decision question, client inputs and deliverables.
- [ ] Workflow readiness score is labeled as workflow completeness only.
- [ ] Top blockers and next actions show at most three items by default.
- [ ] Client input checklist renders with compact status controls.
- [ ] Updating a client input status persists in local/API fallback for that project.
- [ ] Deliverables workflow renders with compact status controls.
- [ ] Updating a deliverable status persists in local/API fallback for that project.
- [ ] Report Package Status reflects existing reports/comparisons and remains caveated.
- [ ] Workspace command panel shows Pilot Context as a collapsed secondary block.
- [ ] Workspace Scenario and Custom Query remain near the top.
- [ ] Workspace Run Express Analysis remains in the pinned action footer.
- [ ] No project leakage occurs between the three demo projects.
- [ ] No UI copy describes readiness as investment, legal, planning, valuation or commercial pilot readiness.
- [ ] Local/API fallback storage caveat remains visible.

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

## Auth & Project Access Foundation v2.2

- [ ] `/` loads without login when `NEXT_PUBLIC_AUTH_MODE` is unset.
- [ ] `/workspace` loads without login when `NEXT_PUBLIC_AUTH_MODE` is unset.
- [ ] `/projects` loads without login when `NEXT_PUBLIC_AUTH_MODE` is unset.
- [ ] `/login` shows current auth mode and access caveat.
- [ ] `/api/auth/session` returns safe JSON without secrets.
- [ ] `supabase_auth` mode falls back to public demo access if public Supabase env values are missing.
- [ ] Project/workspace access badges remain compact and do not push primary actions below the first viewport.

## Pilot Infrastructure Activation v2.4

- [ ] `GET /api/platform/activation-status` returns 200 and no secrets.
- [ ] `GET /api/db/health` returns `migrationApplied`, `seedReady`, `canRead`, `canWrite`, `blockers` and `nextActions`.
- [ ] `GET /api/storage/health` returns required bucket names and readiness blockers.
- [ ] `GET /api/known-limitations` returns the limitations tracker.
- [ ] `npm run supabase:migrate:check` exits safely and reports migration blockers.
- [ ] `npm run supabase:verify:persistence` exits safely in local fallback when Supabase env is missing.
- [ ] `npm run supabase:seed:pilot-foundation` writes nothing and reports blockers when schema is unavailable.
- [ ] Core project APIs include `access` metadata without blocking public demo flows.
- [ ] Audit calls do not break AOI, report, analysis, comparison, data room or pilot workflow operations.
- [ ] `/projects` Platform Readiness panel is visible, compact and honest.

## Validation Governance & Official Connector Readiness v2.5

- [ ] `GET /api/validation?projectKey=dubai-investment-screening-demo` returns evidence, summary, claim policy and connector readiness.
- [ ] `GET /api/validation/connectors` returns DLD, Dubai Pulse, GeoDubai, client document and licensed valuation readiness records.
- [ ] `POST /api/validation/evidence` creates metadata-only evidence in local/API fallback without claiming official validation.
- [ ] `PATCH /api/validation/evidence/[id]` updates validation status conservatively.
- [ ] `DELETE /api/validation/evidence/[id]` removes the test evidence metadata.
- [ ] `/projects` shows Validation Governance compactly and keeps Data Room / Project Activity usable.
- [ ] `/workspace` shows Validation Evidence collapsed or compact below the primary decision flow.
- [ ] Express Analysis AI Decision Memo remains caveated when validation evidence is screening-only.
- [ ] Analysis report preview and printable report include a Validation Governance Appendix.
- [ ] Comparison report preview and printable report include a Validation Governance Appendix.
- [ ] `/api/known-limitations` includes validation connector, DLD, GeoDubai, cadastral/zoning/ownership and valuation limitations.
- [ ] No UI or docs claim live official integration, certified valuation, legal conclusion, cadastral validation, ownership verification or zoning approval.

## Secure File Storage & Evidence Uploads v2.6

- [ ] `npm run storage:check` reports provider mode, buckets, 5 MB limit and storage caveat without secrets.
- [ ] `GET /api/storage/health` returns provider, repository mode, required buckets, missing buckets, signed URL readiness, blockers and next actions.
- [ ] `GET /api/storage/evidence-files?projectKey=dubai-investment-screening-demo` returns metadata list safely.
- [ ] `POST /api/storage/evidence-files` accepts a small allowed file and returns Supabase upload or metadata-only fallback.
- [ ] Unsupported file type upload returns 400 with a friendly message.
- [ ] Oversized file upload returns 400 with a friendly message.
- [ ] `GET /api/storage/evidence-files/[id]/download` returns signed URL only when storage is configured; metadata-only fallback returns controlled unavailable response.
- [ ] `DELETE /api/storage/evidence-files/[id]` marks/deletes metadata and does not crash if binary storage is absent.
- [ ] `/projects` shows Evidence Files / Storage compactly with provider, bucket status, count, metadata-only count and caveat.
- [ ] `/workspace` Validation Evidence block remains collapsed and includes Attach evidence file as secondary action.
- [ ] Data Room latest assets include evidence file metadata.
- [ ] Report Validation Appendix lists linked evidence file metadata and download availability.
- [ ] Uploading evidence never changes validation status to official validated automatically.
- [ ] No UI claims secure enterprise storage while storage is unconfigured or unverified.

## External Data v1.4

- [ ] `GET /api/external-data/manifest` returns v1.4 manifest JSON.
- [ ] `GET /api/external-data/sources` returns Source Registry records.
- [ ] `GET /api/external-data/status` returns readiness states.
- [ ] `POST /api/context/market` returns snapshot-backed context when DLD snapshot area matches, otherwise seed/demo fallback.
- [ ] `GET /api/context/climate?lat=25.08&lng=55.14` returns climate context or sample fallback.
- [ ] UI says snapshot/sample fallback, not live official integration.
- [ ] Evidence and reports retain official-validation-required caveats.

## Evidence Review Workflow & Signed URL Verification v2.7

- [ ] `/projects` shows compact evidence review counts and review actions.
- [ ] `/workspace` Validation Evidence block stays collapsed/secondary and includes review note actions.
- [ ] `POST /api/validation/evidence/[id]/reviews` records valid review decisions.
- [ ] Invalid review transitions return controlled errors, not 500s.
- [ ] Uploading a file sets validation evidence to uploaded/unreviewed and does not improve claim posture.
- [ ] `POST /api/storage/evidence-files/upload-intent` returns metadata-only when storage is unconfigured.
- [ ] `POST /api/storage/evidence-files/[id]/signed-url-test` returns controlled 409 for metadata-only files.
- [ ] Report appendix shows review status, linked files and metadata-only download posture.
- [ ] AI decision scoring treats unreviewed/rejected/expired evidence as unsupported.
- [ ] Required caveats remain visible: uploaded evidence requires review; local/API fallback is not durable production storage.

## Public Data Connectors v1.6

- [ ] `npm run ingest:dld:public` exits successfully.
- [ ] `npm run ingest:dld:snapshot` exits successfully.
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

## Real Data + OpenAI Decision Scoring v2.1

- [ ] `npm run data:status` prints source mode, count, last updated, warnings and caveat.
- [ ] `npm run validate:external-data` exits successfully.
- [ ] `/projects` market-area count agrees with `/api/market-metrics`.
- [ ] `/api/ai/decision-score` returns route status with no API key exposed.
- [ ] Decision score POST returns `deterministic_fallback` without `OPENAI_API_KEY`.
- [ ] With `OPENAI_API_KEY`, decision score attempts OpenAI and falls back safely on invalid output/failure.
- [ ] Express Analysis dashboard shows AI Decision Memo without replacing deterministic score cards.
- [ ] Report preview and printable report include AI Decision Memo when present.
- [ ] Russian query `что лучше построить на этой территории?` stays caveated and scenario-specific.
- [ ] Forbidden claims appear only in caveats/guardrail lists, not as positive product claims.

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
