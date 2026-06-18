# GeoAI MVP

GeoAI is a Next.js spatial decision intelligence MVP for evaluating Dubai real estate, infrastructure, construction, and climate-risk scenarios. The current version is an investor demo prototype, not a production-ready or pilot-ready product: it uses Mapbox for the workspace, synthetic/demo geospatial layers, OSM-style sample baseline fixtures, deterministic mock scoring, optional OpenAI-powered narrative analysis, comparison dashboards, and print-friendly report previews.

OpenAI is optional. If `OPENAI_API_KEY` is not configured, GeoAI automatically uses the deterministic mock fallback so the product remains fully usable for demos.

## Implemented Features

- Homepage and `/workspace` application shell
- Dubai-centered Mapbox workspace
- Point selection with marker and coordinates
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
- Comparison mode for 2-3 selected points or demo objects
- Comparison dashboard with scores, recommendation, risks, and next actions
- Print-friendly report preview for single-site analysis and comparison
- Lightweight project/workspace selector with local demo fallback
- Project Dashboard v0.1 for active project summary, KPIs, recent analyses, data readiness and next actions
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
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

`NEXT_PUBLIC_MAPBOX_TOKEN` is required for the live Mapbox basemap.

`OPENAI_API_KEY` is optional and server-only. When it is set in local or Vercel server environment variables, `/api/analyze` can use OpenAI to generate dashboard-ready narrative analysis. When it is missing or the API request fails, GeoAI returns a mock fallback response.

Supabase/PostGIS is optional in v0.1. When Supabase environment variables are not configured, GeoAI remains fully usable in local/demo mode and analysis history stays in browser storage.

Never expose the OpenAI key as a `NEXT_PUBLIC_*` variable. Only `NEXT_PUBLIC_MAPBOX_TOKEN` is intended for browser use.

Do not commit real tokens. `.env`, `.env.local`, and `.env*.local` are ignored.

## Useful Commands

```bash
npm run dev
npm run dev:turbo
npm run build
npm run start
```

The default `npm run dev` command uses stable Webpack mode with polling enabled for local reliability.

## API Routes

- `GET /api/health` returns app status.
- `GET /api/db/health` returns optional Supabase/PostGIS readiness without exposing secrets.
- `GET /api/demo-objects` returns mock spatial objects for demo use.
- `POST /api/analyze` returns structured analysis narrative. It uses OpenAI when `OPENAI_API_KEY` is available and otherwise returns mock fallback content.
- `GET /api/analysis-runs` returns persisted analysis runs when Supabase is configured, or local-only mode otherwise.
- `POST /api/analysis-runs` saves analysis runs when Supabase is configured, or returns a non-blocking local-only response otherwise.
- `POST /api/context/market` returns seed/demo-normalized Dubai market context for selected coordinates.
- `GET /api/open-geodata` returns local open-geodata baseline availability and counts.

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

## Data Credibility Sprint v0.5

GeoAI now supports local-first CSV and GeoJSON uploads from the Workspace command panel. Uploaded CSV files can provide user-supplied site/area metrics, while uploaded GeoJSON files render as toggleable local map layers under Spatial Layers / Uploaded datasets.

Uploads are stored in browser `localStorage` only and are limited to 5 MB per file. They are never treated as official evidence by default: the UI, analysis, Evidence / Data Used, and report preview label them as user-provided, validation-required context. Sample files are available under `data/upload-samples/`:

- `dubai_site_metrics_sample.csv`
- `dubai_pipeline_sites_sample.geojson`

See [Data Credibility v0.5](docs/DATA_CREDIBILITY_V05.md) for the upload schema, parsing rules, source-lineage behavior and QA checklist.

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
- OpenAI generates narrative interpretation only; scores remain deterministic mock values.
- Market context is seed/demo-normalized and not official market evidence.
- Data ingestion currently uses local seed/static context and imported sample CSV fixtures only.
- Spatial layers currently use local seed_geojson demo geometries only.
- Uploaded CSV / GeoJSON files are browser-local, user-provided, validation-required context.
- Supabase/PostGIS and persistence are optional prototype foundations, not production-grade user storage yet.
- No authentication or user accounts.
- No real parcel, zoning, transaction, satellite, or regulatory data adapters.
- Report export is print-preview based, not a generated server-side PDF.
- Comparison mode is local state only and is not saved.

## Documentation

- [Current Prototype Checkpoint v0.2](docs/CHECKPOINT_2026-06-18_investor_prototype_v02.md)
- [Supabase / PostGIS Foundation v0.1](docs/SUPABASE_POSTGIS_V01.md)
- [Persistence v0.1](docs/PERSISTENCE_V01.md)
- [Projects / Workspaces v0.1](docs/PROJECTS_WORKSPACES_V01.md)
- [Project Dashboard v0.1](docs/PROJECT_DASHBOARD_V01.md)
- [DLD / Dubai Pulse Ingestion v0.1](docs/DLD_DUBAI_PULSE_INGESTION_V01.md)
- [Open Geospatial Baseline v0.1](docs/OPEN_GEODATA_BASELINE_V01.md)
- [Data Credibility v0.5](docs/DATA_CREDIBILITY_V05.md)
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
