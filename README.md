# GeoAI MVP

GeoAI is a Next.js spatial decision intelligence MVP for evaluating Dubai real estate, infrastructure, construction, and climate-risk scenarios. The current version is an investor demo prototype, not a production-ready or pilot-ready product: it uses Mapbox for the workspace, synthetic/demo geospatial layers, OSM-style sample baseline fixtures, deterministic mock scoring, optional OpenAI-powered narrative analysis, comparison dashboards, and print-friendly report previews.

Pilot UX v3.1 keeps the app workspace-first and adds a more decision-intelligence-oriented flow: compact command panel controls, criteria-first candidate comparison, BI-style analysis dashboards, ranked shortlist actions, and a clearer landing narrative. Outputs remain screening hypotheses requiring official/client validation.

OpenAI is optional. If `OPENAI_API_KEY` is not configured, GeoAI automatically uses the deterministic mock fallback so the product remains fully usable for demos.

## Implemented Features

- Homepage and `/workspace` application shell
- GeoAI Explore v1.1 embedded scenario command panel at `/workspace` and `/explore` with B2C/B2B roles, scenario setup, deterministic demo candidates, map overlays, criteria-first shortlist comparison and direct Workspace analysis targeting
- Dubai-centered Mapbox workspace
- Point selection with marker and coordinates
- Polygon AOI drawing workflow with vertex handles, preview edge, validation and approximate area/perimeter measurements
- Project AOI Library with save, reopen, rename, delete, GeoJSON import and GeoJSON export for user-provided screening polygons
- Synthetic demo geospatial layers:
  - Development Zones
  - Premium Real Estate Areas
  - Infrastructure Nodes
  - Construction Sites
  - Coastal / Flood Risk Zones
  - Heat Risk Zones
  - Transport Corridors
- Collapsed spatial layer controls with toggles and legend
- Demo object selection from map layers
- Scenario selector:
  - Real Estate Development
  - Investment Site Selection
  - Construction Monitoring
  - Infrastructure / Urban Planning
  - Climate & Risk
  - Custom Query
- Express Analysis dashboard with deterministic scores and optional OpenAI narrative analysis
- Mock fallback mode when OpenAI is not configured or unavailable
- Dubai Market Context Adapter v0.1 with seed/demo-normalized area matching
- Data Ingestion v0.1 for seed_static market metrics and deterministic normalization
- Open Geospatial Baseline v0.1 for local OSM-style roads, POI anchors, landuse context and accessibility metrics
- Spatial Data Adapter v0.1 for seed_geojson demo layers and structured feature selection
- Data Credibility v0.5 local-first CSV / GeoJSON upload workflow with browser-local source lineage
- Comparison mode for 2-3 selected points, demo objects, or user-drawn AOIs
- Comparison dashboard with scores, recommendation, risks, and next actions
- Print-friendly report preview for single-site analysis and comparison
- Dedicated printable report route for saved reports: `/reports/[id]/print`
- Lightweight project/workspace selector with local demo fallback
- Project Dashboard v0.1 for active project summary, KPIs, recent analyses, data readiness and next actions
- Client Data Room Foundation v1.9 for project-scoped AOIs, uploaded metadata, analyses, reports, comparisons, validation checklist and pilot deliverable summary
- Pilot Workflow & Deliverables v2.0 for project-scoped client input checklist, deliverables workflow and caveated workflow-readiness scoring
- Auth & Project Access Foundation v2.2 with public demo access mode, Supabase Auth readiness and compact access status indicators
- Supabase/PostGIS Durable Persistence Foundation v2.3 with additive migration SQL, schema readiness checks, RLS draft and audit event foundation
- Pilot Infrastructure Activation v2.4 with guarded migration/seed/verify scripts, activation status APIs, soft access metadata, audit integration, storage readiness and known limitations tracker
- Validation Governance & Official Connector Readiness v2.5 for project validation evidence metadata, official connector readiness, report appendices and AI claim guardrails
- Secure File Storage & Evidence Uploads v2.6 foundation with evidence file metadata, storage readiness, server-side upload/download APIs, report appendix file metadata and Supabase Storage policy draft
- Evidence Review Workflow & Signed URL Verification v2.7 with conservative review decisions, signed URL verification, upload intent and review-aware AI/report guardrails
- Enterprise Report Pack v2.8 with structured package model, local/API fallback package repository, printable package route, safe JSON export, source lineage, validation governance, evidence review, Data Room and pilot workflow appendices
- Pilot Backend Activation & Hardening v2.9 with canonical backend status, soft/hard access modes, membership/storage/audit verification scripts, dynamic known limitations and compact pilot readiness panel
- Pilot Readiness & Client Delivery Package v1.1 with client-specific pilot packages, readiness scoring, setup checklist and deliverable framing
- Offline DLD / Dubai Pulse CSV ingestion prototype with normalized sample outputs
- API routes for health, demo objects, and analysis
- Vercel-ready Next.js deployment structure

## Tech Stack

- Next.js App Router
- TypeScript
- React
- Tailwind CSS
- Mapbox GL JS
- Next.js API routes
- Synthetic GeoJSON-style demo data
- Deterministic local mock scoring logic
- Server-side OpenAI analysis route with mock fallback
- Seed market context adapter for Dubai area-level qualitative intelligence
- Local market ingestion layer with validation, normalization, aggregation, and data quality notes
- Spatial adapter layer with geometry validation, centroid/area utilities, and seed GeoJSON registry

## Local Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open the URL printed by Next.js, then go to `/workspace`.

Example:

```text
http://localhost:3000/workspace
```

If port `3000` is occupied, Next.js may start on another port. Use the exact URL printed in the terminal.

## Environment Variables

```bash
NEXT_PUBLIC_MAPBOX_TOKEN=
OPENAI_API_KEY=
OPENAI_MODEL=
OPENAI_MODEL_DECISION_SCORING=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_AUTH_MODE=
GEOAI_ACCESS_ENFORCEMENT_MODE=soft
GEOAI_REQUIRE_SUPABASE_READY=false
GEOAI_REQUIRE_STORAGE_READY=false
GEOAI_ALLOW_DEMO_PUBLIC=true
```

`NEXT_PUBLIC_MAPBOX_TOKEN` is required for the live Mapbox basemap.

`OPENAI_API_KEY` is optional and server-only. When it is set in local or Vercel server environment variables, `/api/analyze` can use OpenAI to generate dashboard-ready narrative analysis and `/api/ai/decision-score` can generate structured decision-support scoring. When it is missing or an API request fails, GeoAI returns deterministic fallback responses.

Supabase/PostGIS is optional in v0.1. When Supabase environment variables are not configured, GeoAI remains fully usable in local/demo mode and analysis history stays in browser storage.

`NEXT_PUBLIC_AUTH_MODE` is optional and defaults to `demo_public`. Valid values are `demo_public`, `supabase_auth`, and `disabled`. In `supabase_auth`, GeoAI only uses public Supabase URL/anon values in the browser and falls back to public demo access if those values are missing. `SUPABASE_SERVICE_ROLE_KEY` must remain server-only.

Pilot backend activation is controlled by server/runtime environment variables. `GEOAI_ACCESS_ENFORCEMENT_MODE=soft` preserves the public demo. `hard` enables the protected access path and should only be used after Supabase Auth, memberships, RLS, storage and audit checks are verified. `GEOAI_ALLOW_DEMO_PUBLIC=true` keeps seeded demo projects visible while hard mode is being tested.

Never expose the OpenAI key as a `NEXT_PUBLIC_*` variable. Only `NEXT_PUBLIC_MAPBOX_TOKEN` is intended for browser use.

Do not commit real tokens. `.env`, `.env.local`, and `.env*.local` are ignored.

## Repository Modes

GeoAI uses canonical repository modes for API responses and UI labels:

- `supabase` -> Supabase/PostGIS
- `local_fallback` -> Local/API fallback
- `browser_local` -> Browser-local demo
- `demo_seed` -> Demo seed
- `disabled` -> Not configured

Local/API fallback is not durable production storage. Browser-local storage is for demo continuity only. Demo seed records are sample context and require validation.

See [Repository Mode & Fallback Consistency v2.0.2](docs/REPOSITORY_MODE_FALLBACK_CONSISTENCY_V202.md).

## Latest Release Notes

- [GeoAI Pilot UX v3.1 - BI Dashboard and Candidate Comparison Flow](docs/RELEASE_GEOAI_PILOT_UX_V31_BI_DASHBOARD.md)
- [GeoAI Pilot UX Simplification v3.0](docs/RELEASE_GEOAI_PILOT_UX_SIMPLIFICATION_V30.md)
- [GeoAI Explore v1.1 - Embedded Scenario Command Panel](docs/RELEASE_GEOAI_EXPLORE_V11_EMBEDDED_COMMAND_PANEL.md)
- [GeoAI Explore v1 - Scenario-first MVP Shell](docs/RELEASE_GEOAI_EXPLORE_V1_SCENARIO_SHELL.md)
- [GeoAI Pilot Backend Activation & Hardening v2.9](docs/RELEASE_GEOAI_PILOT_BACKEND_ACTIVATION_HARDENING_V29.md)
- [GeoAI Enterprise Report Pack v2.8](docs/RELEASE_GEOAI_ENTERPRISE_REPORT_PACK_V28.md)
- [Enterprise Report Pack v2.8 architecture note](docs/ENTERPRISE_REPORT_PACK_V28.md)
- [Pilot Backend Activation & Hardening v2.9](docs/PILOT_BACKEND_ACTIVATION_HARDENING_V29.md)

## Useful Commands

```bash
npm run dev
npm run dev:turbo
npm run build
npm run supabase:migrate:check
npm run supabase:migrate:apply
npm run supabase:seed:pilot-foundation
npm run supabase:verify:persistence
npm run supabase:verify:memberships
npm run storage:check
npm run storage:verify:signed-url
npm run audit:verify
npm run test:api-contract
npm run ingest:dld:snapshot
npm run ingest:osm:snapshot
npm run data:status
npm run validate:external-data
npm run start
```

The default `npm run dev` command uses stable Webpack mode with polling enabled for local reliability.

`npm run supabase:migrate:apply` is guarded and will not apply SQL unless `SUPABASE_DB_URL` and `GEOAI_ALLOW_SUPABASE_MIGRATION_APPLY=true` are set in a trusted terminal. See [Pilot Infrastructure Activation v2.4](docs/PILOT_INFRASTRUCTURE_ACTIVATION_V24.md).

v2.9 adds a stricter guard: `GEOAI_ALLOW_SUPABASE_TARGET` must also identify the intended target (`pilot`, `preview`, or `production`) before migration apply can run.

## API Routes

- `GET /api/health` returns app status.
- `GET /api/db/health` returns optional Supabase/PostGIS readiness without exposing secrets.
- `GET /api/platform/activation-status` returns the v2.4 pilot infrastructure activation gate without exposing secrets.
- `GET /api/pilot-backend/status` returns the v2.9 canonical pilot backend activation summary, including demo/confidential pilot readiness, capabilities, blockers and caveats.
- `GET /api/storage/health` returns Supabase Storage readiness and bucket blockers.
- `GET /api/known-limitations` returns the machine-readable limitations tracker.
- `GET /api/demo-objects` returns mock spatial objects for demo use.
- `POST /api/analyze` returns structured analysis narrative. It uses OpenAI when `OPENAI_API_KEY` is available and otherwise returns mock fallback content.
- `GET|POST /api/ai/decision-score` returns structured decision-support scoring. It uses server-side OpenAI when available and otherwise returns deterministic fallback.
- `GET /api/analysis-runs` returns persisted analysis runs when Supabase is configured, or `local_fallback` mode otherwise.
- `POST /api/analysis-runs` saves analysis runs when Supabase is configured, or returns a non-blocking `local_fallback` response otherwise.
- `POST /api/context/market` returns seed/demo-normalized Dubai market context for selected coordinates.
- `GET /api/open-geodata` returns local open-geodata baseline availability and counts.
- `GET /api/aois?projectKey=...` returns saved project AOIs from local/API fallback storage.
- `POST /api/aois` saves a project AOI in local/API fallback storage.
- `PATCH /api/aois/[id]` updates saved AOI metadata.
- `DELETE /api/aois/[id]` removes a saved AOI from local/API fallback storage.
- `GET /api/data-room?projectKey=...` returns the project-scoped Client Data Room summary.
- `GET /api/report-packages?projectKey=...` returns project-scoped report packages and seeded package summaries.
- `POST /api/report-packages` creates a local/API fallback enterprise report package.
- `GET /api/report-packages/[id]/json` exports safe report package metadata and section summaries.
- `GET /api/report-packages/[id]/export` returns package export manifest metadata.
- `/report-packages/[id]/print` renders a print-friendly enterprise report package. Browser print/save as PDF remains the current PDF workflow.
- `POST /api/data-room/assets` registers local/demo data room asset metadata.
- `PATCH /api/data-room/assets/[id]` updates local/demo asset metadata.
- `DELETE /api/data-room/assets/[id]` removes a local/demo asset metadata record.
- `POST /api/data-room/checklist` creates a local/demo validation checklist item.
- `PATCH /api/data-room/checklist/[id]` updates validation checklist status.

## GeoAI Explore v1.1

GeoAI Explore is now embedded in the workspace command panel. `/workspace` keeps the standard map-first flow, while `/explore` opens the same workspace layout with Explore setup expanded by default. The panel supports B2C and B2B audience selection, role-based personalization state for future onboarding, 10 data-driven scenarios, deterministic Dubai sample candidates, candidate map overlays and direct candidate selection as the current analysis target.

Explore v1.1 remains an MVP screening layer. Candidate data is sample/demo/open-context only and does not connect live official Dubai sources. All outputs are screening hypotheses and require official/client validation before legal, cadastral, zoning, planning, ownership, valuation, title, entitlement, lending, purchase, rental or development decisions.

## GeoAI Pilot UX v3.1

GeoAI Pilot UX v3.1 upgrades the pilot surface for faster decision review. The right-side command panel is more compact, criteria-first searches can open a ranked candidate comparison before a specific target is selected, and each candidate can be opened as an individual BI-style dashboard with a path back to the shortlist. The dashboard now emphasizes gauges, score bars, matrices, scenario sections, validation gaps and next actions.

The landing page remains lightweight and workspace-oriented, but now explains the product narrative, screening layers and outputs more clearly. `/explore` renders the workspace-style alias with Explore/scenario defaults.

## Market Context Adapter

GeoAI includes Dubai Market Context Adapter v0.1. It matches selected coordinates or demo objects to a nearest seed Dubai market area, then enriches the dashboard, AI prompt context, evidence, and report preview with qualitative area-level context.

Current market context is seed/demo-normalized only. It uses qualitative levels, 0-100 indices, trends, confidence labels, and limitations. It does not claim official transaction values, rents, ownership, zoning, density, or approvals.

Future production adapters are intended to connect official or licensed sources such as Dubai Land Department, Dubai Pulse / Data.Dubai, Dubai Municipality / GeoDubai planning layers, Dubai 2040 Urban Master Plan context, OpenStreetMap infrastructure extracts, and customer-provided documents. No external API keys are required for v0.1.

## Data Ingestion v0.1

GeoAI includes a local market data ingestion layer for the Market Context Adapter. The current ingestion modes combine bundled `seed_static` context with imported DLD / Dubai Pulse-style sample CSV fixtures. The ingestion script validates fields, normalizes area names, aggregates records by Dubai market area, writes normalized JSON outputs, and returns data quality notes.

The current seed metrics are qualitative/index-style only:

- Market activity index
- Rental demand index
- Liquidity index
- Development pipeline index
- Risk index
- Trend and confidence

No external API keys are required for Data Ingestion v0.1. Tiny samples are scored conservatively: low transaction counts reduce confidence and cap liquidity/rental-demand proxy influence. Future modes are prepared for `csv_ready`, `api_ready`, and `manual_upload_planned` workflows so DLD, Dubai Pulse, Dubai Municipality, licensed datasets, or customer uploads can be added later without changing the workspace UX.

## Open Geospatial Baseline v0.1

GeoAI includes an offline open-geodata baseline prototype for OSM-style roads, POI anchors, landuse context and accessibility metrics. It uses small local fixtures only; the app does not call live OSM, Geofabrik, Overpass or external GIS APIs at runtime.

Run:

```bash
npm run ingest:open-geodata
```

Normalized outputs are written under `data/normalized/open_geodata_*`. The workspace and report maps use this baseline as subtle open-data context alongside Mapbox basemap labels and GeoAI demo analytical overlays. Evidence cards label this source as sample/open-geospatial context, not official GIS, planning, zoning or parcel data.

## Spatial Data Adapter v0.1

GeoAI includes a spatial data adapter for demo geospatial layers. The current ingestion mode is `seed_geojson`, which loads lightweight synthetic Dubai geometries for development zones, premium real estate clusters, infrastructure nodes, construction monitoring sites, coastal/flood exposure zones, heat exposure zones, transport corridors, and parcel-like demo assets.

The adapter validates geometry type, coordinate ranges, required properties, centroids, and simple polygon area estimates. Selected map features now carry structured spatial metadata into the command panel, Express Analysis, Evidence / Data Used, and report preview.

Current geometries are synthetic/demo only. They are not official parcel, planning, cadastral, utility, infrastructure, or risk-zone boundaries. Future ingestion modes are prepared for `uploaded_geojson_planned`, `api_ready`, and `database_ready` workflows for official GIS, customer uploads, or database-backed spatial layers.

## Polygon AOI Drawing v1.7

GeoAI supports an explicit polygon AOI drawing workflow in the workspace. Users can choose `Add polygon`, click vertices on the Mapbox canvas, preview the next edge while moving the cursor, close the polygon by clicking near the first vertex, then run Express Analysis or add the AOI to comparison.

Drawn AOIs include approximate area, perimeter, centroid, bounding box and vertex count. The app validates minimum vertex count, duplicate consecutive vertices, self-intersection, minimum area and maximum area before accepting the polygon.

User-drawn AOIs are treated as user-provided screening context only. They are not official parcel, zoning, cadastral, planning, ownership or entitlement boundaries. See [Polygon AOI Drawing v1.7](docs/POLYGON_AOI_DRAWING_V17.md) and [GeoAI AOI-Ready Demo v1.7 Release Note](docs/RELEASE_GEOAI_AOI_READY_DEMO_V17.md).

## AOI Library + GeoJSON Import/Export v1.8

GeoAI now lets users save drawn AOIs into the active project AOI Library, reopen saved AOIs, rename/delete them, import a GeoJSON Polygon, export the current or saved AOI as GeoJSON, and run Express Analysis on saved or imported AOIs.

Supported import formats are GeoJSON `Feature` with `Polygon` geometry and `FeatureCollection` with one Polygon. FeatureCollections with multiple Polygon features import the first Polygon with a warning. Points, LineStrings, MultiPolygons, Polygon holes, CRS transformations and shapefiles are not supported in v1.8.

AOIs remain user-provided or uploaded screening geometry. They are not official parcel, zoning, cadastral, ownership, planning or valuation evidence. See [AOI Library + GeoJSON Import/Export v1.8](docs/AOI_LIBRARY_GEOJSON_IMPORT_EXPORT_V18.md).

## Client Data Room Foundation v1.9

GeoAI includes a lightweight project-level Client Data Room foundation that links AOIs, uploaded client metadata, analyses, reports, comparisons, source readiness, validation checklist items and expected pilot deliverables.

This is local/API fallback only. It is not durable production storage, secure enterprise storage, official validation, legal/cadastral/zoning/planning evidence or a valuation conclusion. Client files are registered as metadata-only demo records unless future durable storage is configured.

See [Client Data Room Foundation v1.9](docs/CLIENT_DATA_ROOM_FOUNDATION_V19.md) and the [GeoAI Client Data Room Foundation v1.9 Release Note](docs/RELEASE_GEOAI_CLIENT_DATA_ROOM_FOUNDATION_V19.md).

## Validation Governance & Official Connector Readiness v2.5

GeoAI now includes a validation governance foundation for project-scoped evidence metadata, official connector readiness, conservative claim levels, report validation appendices and AI decision-scoring guardrails.

This is not a live official DLD, Dubai Pulse, GeoDubai or Dubai Municipality integration. It does not certify ownership, zoning, cadastral status, planning approval, suitability or valuation. Outputs remain a screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.

See [Validation Governance & Official Connector Readiness v2.5](docs/VALIDATION_GOVERNANCE_OFFICIAL_CONNECTOR_READINESS_V25.md) and the [v2.5 release note](docs/RELEASE_GEOAI_VALIDATION_GOVERNANCE_V25.md).

## Secure File Storage & Evidence Uploads v2.6

GeoAI now includes a storage-ready evidence file workflow for validation evidence and the Client Data Room. When Supabase Storage is not configured, uploads register metadata only and the UI/API clearly state that binary storage is unavailable.

This is not secure enterprise storage until buckets, policies, signed URL flows and access enforcement are configured and verified. Uploaded evidence requires review; it is not a legal, cadastral, zoning, planning, ownership or valuation conclusion.

See [Secure File Storage & Evidence Uploads v2.6](docs/SECURE_FILE_STORAGE_EVIDENCE_UPLOADS_V26.md).

## Evidence Review Workflow & Signed URL Verification v2.7

GeoAI now tracks evidence review decisions separately from file upload. Files enter `uploaded_unreviewed`, reviewers can move evidence through in-review, client-validated, official-validated, rejected, expired or superseded states, and AI/report guardrails stay conservative until review status supports stronger screening language.

Signed download verification remains server-side. Without configured Supabase Storage buckets and private policies, the app returns metadata-only fallback and a controlled `409` for binary download. See [Evidence Review Workflow & Signed URL Verification v2.7](docs/EVIDENCE_REVIEW_SIGNED_URL_VERIFICATION_V27.md) and the [v2.7 release note](docs/RELEASE_GEOAI_EVIDENCE_REVIEW_SIGNED_URL_V27.md).

## Data Credibility Sprint v0.5

GeoAI now supports local-first CSV and GeoJSON uploads from the Workspace command panel. Uploaded CSV files can provide user-supplied site/area metrics, while uploaded GeoJSON files render as toggleable local map layers under Spatial Layers / Uploaded datasets.

Uploads are stored in browser `localStorage` only and are limited to 5 MB per file. They are never treated as official evidence by default: the UI, analysis, Evidence / Data Used, and report preview label them as user-provided, validation-required context. Sample files are available under `data/upload-samples/`:

- `dubai_site_metrics_sample.csv`
- `dubai_pipeline_sites_sample.geojson`

See [Data Credibility v0.5](docs/DATA_CREDIBILITY_V05.md) for the upload schema, parsing rules, source-lineage behavior and QA checklist.

## Real Data Backbone v0.7

GeoAI now includes the first Real Data Backbone layer for external source metadata, graceful snapshot ingestion and source-lineage visibility. It supports manual DLD / Dubai Pulse CSV snapshot normalization, prepared OSM / Geofabrik GeoJSON baseline normalization, Open-Meteo climate context routing, Copernicus/Sentinel connector status, and planned official validation paths for GeoDubai / Dubai Municipality and DLD API Gateway.

## Real External Data Integration v1.4

GeoAI now includes snapshot connector commands and a stricter external Source Registry foundation for DLD / Dubai Pulse market snapshots, OSM / Geofabrik-style open geospatial snapshots, Open-Meteo climate context, Copernicus/Sentinel metadata availability, and planned official validation paths.

This is not a live official integration. Snapshot outputs remain screening context only: official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.

See [Real External Data Integration v1.4](docs/REAL_EXTERNAL_DATA_INTEGRATION_V14.md).

Run:

```bash
npm run ingest:dld:real
npm run ingest:osm:real
```

If raw external files are missing, the scripts exit gracefully and keep existing sample/demo fallback data available. This does not connect live official DLD, Dubai Pulse, GeoDubai, parcel, zoning, cadastral or ownership systems. See [Real Data Backbone v0.7](docs/REAL_DATA_BACKBONE_V07.md).

## Public Data Connectors v1.6

GeoAI now includes a public/open data connector layer for DLD / Dubai Pulse public snapshots, OSM / Geofabrik, Overture Maps, Open-Meteo, NASA POWER, OpenAQ, WorldPop, Copernicus/Sentinel metadata and non-official administrative context. These connectors use manual snapshots, public/open API context, sample fallbacks and source-lineage metadata.

Run:

```bash
npm run ingest:dld:public
npm run ingest:osm:public
npm run ingest:overture:public
npm run ingest:worldpop:public
npm run ingest:admin-boundaries:public
npm run ingest:public-data:all
npm run data:status
npm run validate:external-data
```

This is not a live official integration layer. Outputs remain a screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.

See [GeoAI Public Data Ready Demo v1.6 Release Note](docs/RELEASE_GEOAI_PUBLIC_DATA_READY_DEMO_V16.md), [Public Data Connectors v1.6](docs/PUBLIC_DATA_CONNECTORS_V16.md), [Public Data Source Register v1.6](docs/PUBLIC_DATA_SOURCE_REGISTER_V16.md), and [Data License and Caveats v1.6](docs/DATA_LICENSE_AND_CAVEATS_V16.md).

## Investor Demo Narrative & Client Pilot Package v1.5

GeoAI now includes a guided investor/client narrative launcher at `/demo`. It frames the existing workspace around three buyer stories: fund/family office investment screening, developer land pipeline, and bank/lender asset review. Each narrative links to the prepared workspace, active project dashboard and client pilot package framing.

This is a demo and pilot-framing layer, not a production or official-data claim. Outputs remain a screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.

See [Investor Demo Narrative v1.5](docs/INVESTOR_DEMO_NARRATIVE_V15.md) and [Client Pilot Package v1.5](docs/CLIENT_PILOT_PACKAGE_V15.md).

## Persistence & Project Workspace v0.8

GeoAI now has a local-first MVP persistence foundation. Analysis runs, report payloads, comparison sets and uploaded dataset metadata can be saved through API routes and associated with the active project. Supabase/PostGIS remains optional; when it is not configured, GeoAI returns non-blocking local fallback responses and relies on browser/local demo state for continuity. Vercel serverless fallback storage is non-durable and must not be treated as production persistence.

This is not production-ready persistence. There is no auth, multi-tenant security, production file storage or validated official source governance yet. See [Persistence & Project Workspace v0.8](docs/PERSISTENCE_PROJECT_WORKSPACE_V08.md).

Project dashboard records are scoped by active project. See [Project-Scoped Persistence v13](docs/PROJECT_SCOPED_PERSISTENCE_V13.md).

## Pilot Readiness & Client Delivery Package v1.1

GeoAI now includes pilot package framing for developer, fund/family office, bank/lender and government/free zone demo workflows. The Project Dashboard shows a recommended pilot package, readiness status, required client data, validation sources, success criteria and pilot deliverables for the active project. The Workspace command panel includes a compact Pilot Setup Checklist below the main configuration flow.

This is a client-delivery framing layer, not a production readiness claim. Pilot outputs still depend on uploaded/customer-approved data, open or sample snapshots, and agreed official validation before decisions. See [Pilot Readiness & Client Delivery Package v1.1](docs/PILOT_READINESS_CLIENT_PACKAGE_V11.md).

## Report Export & Client Deliverables v0.9

GeoAI now includes a dedicated printable report route for saved analysis and comparison reports. The Project Dashboard can link to saved printable reports, and the report preview includes an "Open printable report" action.

Current export remains browser print/save as PDF. GeoAI does not generate server-side PDFs yet. Printable reports use a stable schematic map fallback and include source lineage, validation checklist, next actions and explicit data honesty notes. See [Report Export & Client Deliverables v0.9](docs/REPORT_EXPORT_DELIVERABLES_V09.md).

## Deploy To Vercel

1. Push the repository to GitHub.
2. Create a Vercel project from the repository.
3. Keep the default Next.js build settings.
4. Add `NEXT_PUBLIC_MAPBOX_TOKEN` in Vercel environment variables.
5. Optionally add `OPENAI_API_KEY` as a server-side Vercel environment variable for OpenAI narrative analysis.
6. Deploy.

## Current Limitations

- Uses synthetic/demo geospatial data only.
- Uses deterministic mock scoring only.
- OpenAI narrative and decision scoring are optional, server-side and fallback-safe; deterministic scoring remains the baseline.
- Market context is seed/demo-normalized and not official market evidence.
- Data ingestion currently uses local seed/static context and imported sample CSV fixtures only.
- Spatial layers currently use local seed_geojson demo geometries only.
- Uploaded CSV / GeoJSON files are browser-local, user-provided, validation-required context.
- AOI Library v1.8 stores project AOIs through browser-local/API fallback continuity; durable multi-tenant spatial storage is not complete.
- Client Data Room v1.9 registers project evidence metadata through local/API fallback only; durable production file storage, auth, audit trail and secure workspace controls are not connected.
- AOI GeoJSON import supports Polygon only. MultiPolygon, holes, CRS transformations and shapefiles are deferred.
- Real Data Backbone v0.7 supports optional snapshots/API context, but live official validation sources are still not connected.
- Persistence v0.8 supports local/API fallback saved objects, but auth, tenant security, production file storage and report libraries are not complete.
- Supabase/PostGIS durable persistence is active only when configured and schema readiness checks pass.
- RLS policies require configured Supabase Auth, project memberships and deployment governance.
- Supabase/PostGIS and persistence are optional prototype foundations, not production-grade user storage yet.
- Pilot readiness scoring is a delivery checklist, not an approval, compliance or production-readiness certification.
- Auth foundation exists in public-demo mode, but production route enforcement, RLS and durable user/organization access control are not complete.
- No real parcel, zoning, transaction, satellite, or regulatory data adapters.
- Report export is browser print/save as PDF, not a generated server-side PDF.
- Comparison sets can be saved through the local/API fallback, but production report libraries still require auth, tenant security and validated persistence.

## Documentation

- [Current Prototype Checkpoint v0.2](docs/CHECKPOINT_2026-06-18_investor_prototype_v02.md)
- [Supabase / PostGIS Foundation v0.1](docs/SUPABASE_POSTGIS_V01.md)
- [Persistence v0.1](docs/PERSISTENCE_V01.md)
- [Projects / Workspaces v0.1](docs/PROJECTS_WORKSPACES_V01.md)
- [Project Dashboard v0.1](docs/PROJECT_DASHBOARD_V01.md)
- [DLD / Dubai Pulse Ingestion v0.1](docs/DLD_DUBAI_PULSE_INGESTION_V01.md)
- [Open Geospatial Baseline v0.1](docs/OPEN_GEODATA_BASELINE_V01.md)
- [Data Credibility v0.5](docs/DATA_CREDIBILITY_V05.md)
- [Real Data Backbone v0.7](docs/REAL_DATA_BACKBONE_V07.md)
- [GeoAI Data-Ready Demo RC v1.4 Release Note](docs/RELEASE_GEOAI_DATA_READY_DEMO_RC_V14.md)
- [GeoAI Public Data Ready Demo v1.6 Release Note](docs/RELEASE_GEOAI_PUBLIC_DATA_READY_DEMO_V16.md)
- [GeoAI AOI-Ready Demo v1.7 Release Note](docs/RELEASE_GEOAI_AOI_READY_DEMO_V17.md)
- [AOI Library + GeoJSON Import/Export v1.8](docs/AOI_LIBRARY_GEOJSON_IMPORT_EXPORT_V18.md)
- [Client Data Room Foundation v1.9](docs/CLIENT_DATA_ROOM_FOUNDATION_V19.md)
- [GeoAI Client Data Room Foundation v1.9 Release Note](docs/RELEASE_GEOAI_CLIENT_DATA_ROOM_FOUNDATION_V19.md)
- [Pilot Workflow & Deliverables v2.0](docs/PILOT_WORKFLOW_DELIVERABLES_V20.md)
- [GeoAI Pilot Workflow & Deliverables Foundation v2.0 Release Note](docs/RELEASE_GEOAI_PILOT_WORKFLOW_DELIVERABLES_V20.md)
- [GeoAI Repository Mode & Fallback Consistency v2.0.2 Release Note](docs/RELEASE_GEOAI_REPOSITORY_MODE_CONSISTENCY_V202.md)
- [Real Data + OpenAI Decision Scoring Foundation v2.1](docs/REAL_DATA_OPENAI_SCORING_FOUNDATION_V21.md)
- [GeoAI Real Data + OpenAI Decision Scoring Foundation v2.1 Release Note](docs/RELEASE_GEOAI_REAL_DATA_OPENAI_SCORING_V21.md)
- [Auth & Project Access Foundation v2.2](docs/AUTH_PROJECT_ACCESS_FOUNDATION_V22.md)
- [GeoAI Auth & Project Access Foundation v2.2 Release Note](docs/RELEASE_GEOAI_AUTH_PROJECT_ACCESS_FOUNDATION_V22.md)
- [Supabase/PostGIS Durable Persistence Foundation v2.3](docs/SUPABASE_POSTGIS_DURABLE_PERSISTENCE_V23.md)
- [GeoAI Supabase/PostGIS Durable Persistence Foundation v2.3 Release Note](docs/RELEASE_GEOAI_SUPABASE_POSTGIS_DURABLE_PERSISTENCE_V23.md)
- [Pilot Infrastructure Activation v2.4](docs/PILOT_INFRASTRUCTURE_ACTIVATION_V24.md)
- [GeoAI Pilot Infrastructure Activation v2.4 Release Note](docs/RELEASE_GEOAI_PILOT_INFRASTRUCTURE_ACTIVATION_V24.md)
- [GeoAI AOI Library Demo v1.8 Release Note](docs/RELEASE_GEOAI_AOI_LIBRARY_DEMO_V18.md)
- [Persistence & Project Workspace v0.8](docs/PERSISTENCE_PROJECT_WORKSPACE_V08.md)
- [Project-Scoped Persistence v13](docs/PROJECT_SCOPED_PERSISTENCE_V13.md)
- [Pilot Readiness & Client Delivery Package v1.1](docs/PILOT_READINESS_CLIENT_PACKAGE_V11.md)
- [Report Export & Client Deliverables v0.9](docs/REPORT_EXPORT_DELIVERABLES_V09.md)
- [UI Layout Guardrails](docs/UI_LAYOUT_GUARDRAILS.md)
- [UI Release Freeze v1.0](docs/UI_RELEASE_FREEZE_V10.md)
- [Custom Query Intelligence v1.2](docs/CUSTOM_QUERY_INTELLIGENCE_V12.md)
- [MVP UI System Hardening v1.0.1](docs/MVP_UI_HARDENING_V101.md)
- [Demo Release Candidate v0.6.1](docs/DEMO_RC_V061.md)
- [Audit QA — 2026-06-18](docs/AUDIT_QA_2026-06-18.md)
- [Architecture](docs/architecture.md)
- [Data Strategy](docs/data-strategy.md)
- [Roadmap](docs/roadmap.md)
- [QA Checklist](docs/qa-checklist.md)
- [Changelog](CHANGELOG.md)

## Next Roadmap

- v0.2: AI analysis engine hardening, prompt evaluation, and production guardrails
- v0.3: Data Source Registry and real data adapters
- v0.4: Pilot-ready workflows for saved studies, evidence, and client reports
- v0.5: Enterprise readiness with auth, governance, auditability, and deployment controls
