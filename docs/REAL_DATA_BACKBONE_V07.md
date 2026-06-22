# Real Data Backbone v0.7

Date: 2026-06-21

GeoAI Real Data Backbone v0.7 starts the transition from demo-only context toward honest external data readiness. It adds source metadata, snapshot/manual ingestion paths, API-context routes and report lineage without claiming live official integrations.

## Supported Sources

| Source | Status | Type | Current Use |
| --- | --- | --- | --- |
| DLD / Dubai Pulse transactions | Manual import / connected snapshot when CSV is loaded | Official open data snapshot | Market basis and report lineage when `market_area_metrics.real.json` exists |
| OSM / Geofabrik open geospatial baseline | Manual import / connected snapshot when GeoJSON is loaded | Open data | Access/context source basis when `spatial_baseline.real.geojson` exists |
| Open-Meteo historical weather | API on demand | Reanalysis/model climate context | Climate API route only in v0.7 |
| Copernicus / Sentinel imagery availability | Not configured by default | Satellite catalog | Status route only; analytics pipeline planned |
| GeoDubai / Dubai Municipality validation | Planned access | Planned official validation | Lineage and roadmap only |
| DLD API Gateway validation path | Planned access | Planned official validation | Lineage and roadmap only |

## What Is Real Snapshot / Open Data / API Context

- DLD / Dubai Pulse support is a manual CSV snapshot workflow. It can normalize an open official dataset export into market-area aggregates.
- OSM / Geofabrik support is a prepared GeoJSON workflow. It can normalize open geospatial features into a source-labeled baseline.
- Open-Meteo is an external API-context route for historical weather/reanalysis metrics.

## What Is Not Live Official

This sprint does not connect live official DLD, Dubai Pulse, GeoDubai, parcel, zoning, cadastral, ownership, planning, transaction-feed or risk-zone systems. Outputs must not be presented as official validation or decision-grade evidence.

## File Locations

- Source registry: `src/lib/external-data/source-registry.ts`
- Manifest helper: `src/lib/external-data/data-manifest.ts`
- Manifest file: `data/external/normalized/external_data_manifest.json`
- DLD raw CSV input: `data/external/raw/dld/dld_transactions.csv`
- DLD normalized output: `data/external/normalized/market_area_metrics.real.json`
- DLD ingestion report: `data/external/normalized/dld_ingestion_report.real.json`
- OSM raw GeoJSON input: `data/external/raw/osm/dubai_osm_baseline.geojson`
- OSM normalized output: `data/external/normalized/spatial_baseline.real.geojson`
- OSM ingestion report: `data/external/normalized/osm_ingestion_report.real.json`

## How To Run Ingestion

Manual DLD / Dubai Pulse CSV snapshot:

```bash
npm run ingest:dld:real -- --mode=csv --file=data/external/raw/dld/dld_transactions.csv
```

Optional URL mode:

```bash
npm run ingest:dld:real -- --mode=url --url=<csv-or-dataset-url>
```

Prepared OSM / Geofabrik GeoJSON baseline:

```bash
npm run ingest:osm:real -- --file=data/external/raw/osm/dubai_osm_baseline.geojson
```

Both scripts fail gracefully when raw files are missing and keep the existing demo/sample fallback available.

## API Routes

- `GET /api/external-data/status`
- `GET /api/external-data/market-metrics`
- `GET /api/external-data/climate-context?lat=25.08&lng=55.14&startDate=2024-01-01&endDate=2024-12-31`
- `GET /api/external-data/satellite-availability`
- `GET /api/market-metrics` remains compatible and returns the same real snapshot or sample fallback basis.

## Source Lineage Model

Workspace and reports now expose a compact external data status/source-lineage view. Report lineage groups sources into:

- Used / source basis
- Available but not used
- Planned validation

This is evidence/source-basis context only. It is not a validated conclusion, official zoning result, title check, parcel boundary, cadastral map, ownership record, or underwriting model.

## Limitations

- Real source files are optional and may be absent.
- DLD CSV column formats vary; the parser is tolerant but conservative.
- OSM / Geofabrik data is open geospatial context, not official municipal GIS.
- Open-Meteo is reanalysis/model context, not site-specific engineering or insurance assessment.
- Copernicus/Sentinel route is a connector status placeholder unless credentials and a query pipeline are implemented later.
- Scoring is not rewritten in v0.7; source basis is surfaced as lineage rather than validated scoring logic.

## Next Steps Toward Pilot Readiness

1. Confirm permitted DLD / Dubai Pulse datasets and licensing.
2. Add dated OSM/Geofabrik extract metadata and attribution workflow.
3. Add canonical Dubai area matching and boundary validation.
4. Add customer-uploaded source approval workflow.
5. Add persistent source manifests and report evidence snapshots.
6. Implement official/customer validation adapters only after access, terms and credentials are confirmed.

## v0.8 Persistence Alignment

Persistence & Project Workspace v0.8 stores source-lineage snapshots with saved analyses, reports and comparison sets. Real Data Backbone sources should be captured into those snapshots when they are used or planned for validation, so saved memos do not depend only on mutable current source registry state.

## Release Stabilization Alignment

The stabilized demo release keeps real-data work in metadata, snapshot and source-lineage mode only. It does not start new DLD, Dubai Pulse, OSM, GeoDubai or commercial connector expansion. When Supabase/PostGIS is absent, persistence routes return graceful local fallback responses and preserve demo usability without claiming durable production storage. Every data-backed output remains a screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.
