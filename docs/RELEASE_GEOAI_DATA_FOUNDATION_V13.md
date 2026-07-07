# GeoAI Data Foundation v1.3 - First Snapshot Ingestion Path

## Summary

GeoAI Data Foundation v1.3 adds the first controlled snapshot-ingestion path on top of the v1.2 readiness layer. The release keeps DLD / Dubai Pulse and OSM / Geofabrik in local normalized snapshot mode, exposes structured source-quality metadata through the existing APIs, and keeps the `/projects` Data Readiness / Source Lineage block intact.

No Figma redesign was implemented.

## What Changed

- Added a server-side source-quality manifest builder for normalized local files.
- Added structured DLD / Dubai Pulse and OSM / Geofabrik snapshot quality metadata fields: source group id, source name, file path, count, generated/extracted dates where known, license note, data mode, confidence, validation status, caveat and next validation step.
- Extended `npm run data:sync-source-readiness` dry-run output to show source registry rows, external snapshot rows and source-quality previews before any Supabase write.
- Added a safer sync write gate: Supabase writes require service-role environment and an explicit `--write` command. `--dry-run` never writes.
- Normalized `/api/data-sources`, `/api/data-sources/readiness`, `/api/external-data/manifest`, `/api/external-data/status` and `/api/source-lineage` so each exposes mode, source, source groups, readiness, manifest, source quality / lineage, blockers, next actions, caveat and generated timestamp.
- Preserved `/projects` layout and the existing Data Readiness / Source Lineage block.

## Source Groups

- DLD / Dubai Pulse public real estate snapshots.
- OSM / Geofabrik open geospatial baseline.
- Overture Maps buildings / places / transportation.
- Open-Meteo + NASA POWER climate / energy context.
- Copernicus / Sentinel metadata availability.

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
  - `/api/db/health`
  - `/api/platform/activation-status`

## Data Honesty

Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.

This release adds no live or official DLD / Dubai Pulse or GeoDubai connection, no parcel, zoning, cadastral, ownership or valuation validation, no site approval or best-use guarantee, and no production or pilot readiness claim.

## Known Limitations

- No Supabase migrations are applied by this release.
- No Supabase writes are required for local/demo operation.
- The first ingestion path is controlled local normalized snapshot metadata, not a live API integration.
- DLD / Dubai Pulse files require source access, license, extraction-date and official/client validation before decisions.
- OSM / Geofabrik remains open geospatial context and not official municipal GIS, zoning or parcel evidence.
- Copernicus / Sentinel remains metadata availability only; no imagery download, raster analytics or construction-monitoring proof is added.
