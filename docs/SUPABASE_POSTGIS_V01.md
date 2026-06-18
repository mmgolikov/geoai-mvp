# Supabase / PostGIS Foundation v0.1

GeoAI currently runs as a stable demo-normalized prototype. Supabase/PostGIS v0.1 adds an optional persistence and spatial database foundation without changing the working Mapbox, analysis, comparison, or report flows.

This foundation is intentionally non-blocking: if Supabase is not configured, GeoAI continues to run in local/demo mode.

## Purpose

- Prepare a production-ready database shape for sources, spatial layers, market areas, analysis runs, reports, and comparison sets.
- Keep current deterministic demo behavior available.
- Add a safe path for future official, open, commercial, and customer data adapters.
- Avoid exposing server keys or making Supabase required for local demos.

## Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are browser-safe Supabase project values. `SUPABASE_SERVICE_ROLE_KEY` is server-only and must never be exposed as a `NEXT_PUBLIC_*` variable.

The app checks these values through `src/lib/supabase/config.ts`. If they are missing, server repositories return safe empty/no-op results.

## Setup

Install dependencies:

```bash
npm install
```

Apply migrations in a Supabase project:

```bash
supabase db push
```

Seed demo source metadata:

```bash
supabase db seed
```

The local app can run without these steps. Database-backed persistence only activates when Supabase is configured and reachable.

## Schema Overview

The first migration enables:

- `postgis`
- `pgcrypto`

Core tables:

- `sources`: data source registry for demo, official, open, commercial, and customer sources.
- `spatial_layers`: spatial layer metadata.
- `spatial_features`: future PostGIS feature storage.
- `market_areas`: future area-level market context.
- `market_metrics`: normalized market metrics and confidence notes.
- `analysis_runs`: optional persisted Express Analysis runs.
- `reports`: optional persisted report payloads.
- `comparison_sets`: optional persisted comparison payloads.

The schema includes indexes, geometry indexes, update triggers, and table comments with TODOs for RLS, auth, multitenancy, retention, and audit controls.

## Current Fallback Behavior

When Supabase is not configured:

- `/api/db/health` returns `local_only`.
- `/api/analysis-runs` returns local-only responses.
- Express Analysis still works.
- Local analysis history remains available through browser storage.
- No database write is required for the UI to work.

When Supabase is configured:

- Analysis runs are posted to `/api/analysis-runs` after local history is saved.
- The save is best-effort and will not block the dashboard.
- The Status section shows whether persistence is local-only or Supabase-backed.

## Security Notes

- Do not commit `.env`, `.env.local`, or real Supabase keys.
- Keep `SUPABASE_SERVICE_ROLE_KEY` server-only.
- Do not use service role keys in client components.
- Add RLS policies before any pilot or production deployment.
- Add user/workspace ownership before storing customer documents, reports, or project-specific geometry.
- Add audit logs and retention rules before handling customer data.

## Data Notes

The seeded sources are metadata placeholders. They do not connect live official data and must not be presented as live evidence.

Seeded source examples include:

- Synthetic Demo Layers
- Demo Market Context / seed_static
- Dubai Land Department Real Estate Data
- Dubai Pulse DLD APIs
- Dubai Municipality GIS / GeoDubai
- Dubai 2040 Urban Master Plan
- OpenStreetMap / Geofabrik
- Copernicus Sentinel / USGS Landsat
- Commercial Very High Resolution Imagery
- Customer-uploaded CSV / GeoJSON / Documents

## Next Steps

- Add Supabase CLI project configuration when a target project is selected.
- Add RLS and auth-scoped workspace ownership.
- Persist comparison sets and report previews through repository functions.
- Add source registry synchronization from existing TypeScript registry.
- Add PostGIS-backed spatial feature reads behind the existing map adapter.
- Add official/customer adapter validation workflows before pilot use.
