# GeoAI Public Data Connectors v1.6

Date: 2026-06-23

GeoAI v1.6 adds a public/open data connector layer for Dubai and global screening context. This release does not add live official integrations and does not make the product production-ready or pilot-ready.

Required caveat:

> screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.

## Scope

- DLD / Dubai Pulse public snapshot categories for transactions, rents, projects, land, building and unit records.
- OSM / Geofabrik open snapshot categories for roads, buildings, POIs, landuse and transport context.
- Overture Maps manual/download-first snapshots for buildings, places and transportation.
- Open-Meteo climate context.
- NASA POWER solar and wind screening context.
- OpenAQ air-quality screening context with fallback.
- WorldPop population/demographic context.
- Copernicus / Sentinel metadata availability path with sample/token-required fallback.
- Overture/GADM administrative context as non-official, license-sensitive context.

## Commands

```bash
npm run ingest:dld:public
npm run ingest:osm:public
npm run ingest:overture:public
npm run ingest:worldpop:public
npm run ingest:admin-boundaries:public
npm run ingest:public-data:all
```

Each command uses a real external folder when files are present and bundled samples when files are missing. Missing categories do not fail the build.

## API Routes

- `GET /api/context/spatial?lat=...&lng=...`
- `GET /api/context/accessibility?lat=...&lng=...`
- `GET /api/context/demographics?lat=...&lng=...`
- `GET /api/context/air-quality?lat=...&lng=...`
- `GET /api/context/solar-energy?lat=...&lng=...`
- `GET /api/context/satellite-availability?bbox=...&from=...&to=...`

All routes return fallback/sample/planned state instead of crashing when public data is absent.

## What This Enables

- Richer data readiness display.
- Category-level real estate source lineage.
- Open spatial/accessibility context.
- Screening-level environmental, demographic and satellite metadata context.
- A clearer path from demo data toward client-approved pilot data.

## What This Does Not Enable

- Live DLD integration.
- Live Dubai Pulse integration.
- Live GeoDubai GIS.
- Official parcel boundary, official zoning boundary, cadastral validation or ownership verification.
- Certified valuation.
- Certified flood, engineering-grade climate or insurance-grade hazard assessment.
