# GeoAI Data Foundation v1.1 — Source Registry API and Readiness Layer

## Summary

GeoAI Data Foundation v1.1 adds a Supabase-backed source registry read path for data readiness, source lineage and external-data manifest metadata.

This release does not load large real datasets and does not claim live official integrations.

## Changes

- Added `/api/data-sources`.
- Added `/api/data-sources/readiness`.
- Updated `/api/external-data/manifest` to use the source registry readiness model.
- Updated `/api/external-data/status` to use the source registry readiness model.
- Added `/api/source-lineage`.
- Added `src/lib/external-data/supabase-source-registry.ts` with Supabase source-registry metadata reading and local manifest fallback.

## Source groups

- DLD / Dubai Pulse public real estate snapshots.
- OSM / Geofabrik open geospatial baseline.
- Overture Maps buildings / places / transportation.
- Open-Meteo + NASA POWER climate / energy context.
- Copernicus / Sentinel metadata availability.

## Data honesty

Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.

## Known limitations

- Source rows are metadata/readiness records.
- Real DLD, OSM, Overture and Sentinel datasets are not loaded by this release.
- Open-Meteo / NASA POWER remain screening context only.
- Copernicus / Sentinel is metadata availability only unless a later raster pipeline is approved.
- Supabase environment variables must be configured in the target runtime for live registry reads; otherwise local manifest fallback remains active.

## Validation checklist

- `npm run lint`
- `npm run build`
- Route smoke:
  - `/api/data-sources`
  - `/api/data-sources/readiness`
  - `/api/external-data/manifest`
  - `/api/external-data/status`
  - `/api/source-lineage`
  - `/api/db/health`
  - `/api/platform/activation-status`
