# GeoAI Data Foundation v1.2 - Snapshot Ingestion and Data Readiness UI

## Summary

GeoAI Data Foundation v1.2 moves source readiness from metadata-only API wrappers toward a usable readiness workflow. It adds a server-only sync helper for normalized snapshot metadata, clearer readiness/source-lineage API payloads, and a visible Data Readiness / Source Lineage block in the Project Dashboard.

## Changes

- Added `npm run data:sync-source-readiness` to prepare five source-group readiness rows from normalized metadata files and upsert them into `source_registry_snapshots` and `external_data_snapshots` when Supabase service-role env is provided.
- Improved `/api/data-sources`, `/api/data-sources/readiness`, `/api/external-data/manifest`, `/api/external-data/status` and `/api/source-lineage` with grouped readiness, data mode, record count, confidence, caveat and next validation step fields.
- Added five source groups: DLD / Dubai Pulse public real estate snapshots, OSM / Geofabrik open geospatial baseline, Overture Maps buildings / places / transportation, Open-Meteo + NASA POWER climate / energy context, and Copernicus / Sentinel metadata availability.
- Updated `/projects` with a visible Data Readiness / Source Lineage block showing source group name, status, data mode, record count, confidence, caveat and next validation step.
- Preserved local/demo fallback when Supabase env is absent or unreachable.

## Data Honesty

Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.

This release does not claim live official integration, official parcel, official zoning, cadastral validation, ownership verification, certified valuation, production readiness or pilot readiness.

## Validation

- `npm run data:sync-source-readiness -- --dry-run`
- `npm run lint`
- `npm run build`
- Route smoke:
  - `/api/data-sources`
  - `/api/data-sources/readiness`
  - `/api/external-data/manifest`
  - `/api/external-data/status`
  - `/api/source-lineage`
  - `/projects`

## Known Limitations

- The sync helper writes only when `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are present in a trusted server environment.
- No Supabase migrations are applied by this release.
- Normalized files remain snapshot/sample/open context until source access, license, extraction dates and client/official validation are confirmed.
- Copernicus / Sentinel remains metadata availability only; no imagery download, raster analytics or construction-monitoring proof is added.
