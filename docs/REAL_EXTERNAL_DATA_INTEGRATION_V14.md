# GeoAI Real External Data Integration v1.4

Date: 2026-06-22

GeoAI v1.4 introduces snapshot connectors and a stricter source registry foundation. This is a data-readiness sprint, not a live official integration release.

All outputs remain a screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.

## What Was Added

- Source Registry model with access mode, validation status, reliability tier, allowed use, forbidden claims and official-claim guardrails.
- External Data Manifest v1.4 with readiness states:
  - `connected`
  - `snapshot_available`
  - `sample_fallback`
  - `planned`
  - `missing`
- DLD / Dubai Pulse market snapshot ingestion from local CSV or JSON files.
- OSM / Geofabrik-style baseline ingestion from local GeoJSON files.
- Climate context route for screening-level Open-Meteo heat/rainfall proxy with fallback.
- API routes for manifest, source registry, status and climate context.
- Report/evidence lineage compatibility through existing evidence cards.

## Source Registry

Registry file:

- `src/lib/external-data/source-registry.ts`

Each external source includes:

- `id`
- `name`
- `provider`
- `geography`
- `sourceType`
- `accessMode`
- `status`
- `freshness`
- `licenseNote`
- `validationStatus`
- `reliabilityTier`
- `officialClaimAllowed`
- `limitations`
- `allowedUse`
- `forbiddenClaims`

Current registry sources:

- DLD / Dubai Pulse market snapshot
- OSM / Geofabrik open geospatial baseline
- Open-Meteo historical weather
- Copernicus / Sentinel imagery availability
- GeoDubai / Dubai Municipality official validation
- DLD API Gateway / official validation path

## Snapshot Ingestion

DLD / Dubai Pulse sample snapshot:

```bash
npm run ingest:dld:snapshot
```

Default sample input:

- `data/external/dld/dld_market_snapshot_sample.csv`

Normalized output:

- `data/normalized/dld_market_snapshot.json`
- `data/normalized/dld_market_snapshot_quality.json`

OSM / Geofabrik sample snapshot:

```bash
npm run ingest:osm:snapshot
```

Default sample input:

- `data/external/osm/dubai_osm_baseline_sample.geojson`

Normalized output:

- `data/normalized/open_geodata_snapshot.json`
- `data/normalized/open_geodata_snapshot_quality.json`

Both scripts exit gracefully when a requested raw file is missing. Missing files keep sample/demo fallback active and do not break the build.

## API Routes

- `GET /api/external-data/manifest`
- `GET /api/external-data/sources`
- `GET /api/external-data/status`
- `POST /api/context/market`
- `GET /api/context/climate?lat=25.08&lng=55.14`
- `POST /api/context/climate`

The market route continues to use the existing Dubai market adapter. When `data/normalized/dld_market_snapshot.json` is available and matches the selected area, it prefers the DLD / Dubai Pulse snapshot context. Otherwise it falls back to existing seed/demo-normalized context.

The climate route returns screening-level heat and rainfall proxy context. It does not provide certified flood risk, engineering-grade climate assessment or insurance-grade hazard modeling.

## UI Integration

No major UI redesign was introduced. Existing Workspace and Project Dashboard surfaces can show:

- snapshot availability
- sample fallback status
- planned validation paths
- structured evidence cards
- source-lineage caveats

The right command panel still keeps the primary analysis CTA pinned in the existing action footer.

## Data Honesty Rules

Allowed wording:

- snapshot
- sample fallback
- screening-level context
- open geospatial baseline
- external open climate API context
- validation required

Forbidden wording:

- live official DLD integration
- official zoning conclusion
- legal/cadastral/parcel conclusion
- certified flood risk
- engineering-grade climate assessment
- insurance-grade hazard model

## QA Checklist

Run:

```bash
npm run lint
npm run build
npm run ingest:dld:snapshot
npm run ingest:osm:snapshot
```

Manual checks:

- `/workspace` opens and the command panel CTA remains visible.
- External Data Status shows DLD and OSM snapshot/fallback readiness.
- Running Express Analysis still works with and without `OPENAI_API_KEY`.
- Evidence / Data Used still shows source cards.
- Report preview and print routes still render.
- `/api/external-data/manifest`, `/api/external-data/sources`, `/api/external-data/status`, `/api/context/market`, and `/api/context/climate` return JSON.

## Next Iteration

Recommended next work:

1. Add source snapshot date/version badges to evidence cards.
2. Add DLD/Dubai Pulse field-mapping profiles for known public dataset exports.
3. Add dated OSM attribution metadata and extract provenance.
4. Persist source manifest snapshots with saved analysis/report records.
5. Add official/customer validation workflow only after access and licensing are confirmed.
