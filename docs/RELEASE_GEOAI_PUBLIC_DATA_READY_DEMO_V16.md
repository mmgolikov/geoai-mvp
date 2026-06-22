# GeoAI Public Data Ready Demo v1.6

Release date: June 23, 2026

Production URL: https://geoai-mvp.vercel.app

Deployment URL: https://geoai-3ksf54bzd-geoaidev.vercel.app

Production commit SHA: `7b6397ec9a565b26ab2c34ce5539079477ea0b91`

## Scope

GeoAI Public Data Ready Demo v1.6 adds a public/open data connector layer for screening-level Dubai/UAE spatial decision intelligence. It expands the Data Source Registry, normalized sample/snapshot ingestion, source-lineage visibility and context APIs while preserving the required data-honesty posture.

This release does not add live official integrations and does not make GeoAI production-ready or pilot-ready without client-approved data, official validation and implementation controls.

## Source Status Table

| Source | Status | Current role |
| --- | --- | --- |
| DLD / Dubai Pulse | `sample_fallback` / public snapshot import ready | Real estate market, rent, project, land, building and unit screening context. |
| DLD API Gateway | `permission_required` | Future permissioned official validation path only. |
| OSM / Geofabrik | `sample_fallback` / open snapshot import ready | Open roads, POIs, land-use and accessibility screening context. |
| Overture Maps | `manual_import_ready` | Manual open buildings, places, transport and divisions import path. |
| Open-Meteo | `connected` API context | Screening-level heat and rainfall climate context. |
| NASA POWER | `connected` API context | Screening-level solar, wind and energy context. |
| OpenAQ | `sample_fallback` | Air-quality screening context with fallback. |
| WorldPop | `sample_fallback` | Population-density / catchment screening context. |
| Copernicus / Sentinel | `token_required` metadata path | Satellite metadata availability path; no imagery analytics. |
| GeoDubai / Dubai Municipality | `planned` validation | Future official GIS/planning validation path only. |

## What Changed

- Added Public Source Catalog v1.6.
- Added DLD / Dubai Pulse public sample/snapshot ingestion.
- Added OSM / Geofabrik, Overture, WorldPop, OpenAQ, NASA POWER and Copernicus/Sentinel metadata/context paths.
- Added context APIs for spatial, accessibility, demographics, air quality, solar energy and satellite availability.
- Normalized source statuses across manifest, readiness, context APIs and UI.
- Preserved data honesty: no live official DLD, Dubai Pulse, GeoDubai, cadastral, zoning, ownership or valuation claims.

## What This Enables In Demos

- Show a credible path from demo data toward public/open and client-approved pilot data.
- Explain source readiness by dataset family instead of showing one generic fallback state.
- Demonstrate API-backed screening context for Open-Meteo and NASA POWER.
- Demonstrate fallback-safe spatial, accessibility, demographics, air-quality and satellite metadata routes.
- Keep source lineage visible in dashboards, reports and project readiness surfaces.

## Still Not Supported

- No live official DLD integration.
- No live Dubai Pulse integration.
- No live GeoDubai or Dubai Municipality GIS integration.
- No official parcel boundary, zoning boundary, cadastral validation, ownership verification or certified valuation.
- No certified flood risk, engineering-grade climate assessment or insurance-grade hazard model.
- No durable enterprise persistence unless Supabase/PostGIS is configured.
- No auth, tenant governance or production evidence workflow.

## Data Honesty Caveat

All outputs remain a screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.

## Recommended Next Sprint

GeoAI Pilot Data Room & UAE Client Demo Pack v1.7.
