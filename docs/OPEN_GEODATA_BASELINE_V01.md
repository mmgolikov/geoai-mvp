# Open Geospatial Baseline v0.1

Date: 2026-06-18

## Purpose

Open Geospatial Baseline v0.1 adds an offline, local-fixture path for road, POI, anchor, landuse and accessibility context in GeoAI. The goal is to make the workspace and report maps feel more like a real spatial intelligence product while keeping runtime behavior stable and fully local.

## Source Assumptions

The current baseline is OSM-style and Geofabrik / Overpass-compatible, but it is not a live OSM connection and not an official Dubai GIS source. Fixtures are intentionally small and committed as sample data only.

Allowed interpretation:

- Open geospatial baseline
- OSM-derived context path
- Open-data attribution required before production use
- Not official GIS, planning, zoning or parcel data
- Official validation required for decision-grade use

## Files

Sample inputs:

- `data/samples/dubai_osm_roads_sample.geojson`
- `data/samples/dubai_osm_poi_sample.geojson`
- `data/samples/dubai_osm_landuse_sample.geojson`
- `data/samples/dubai_osm_buildings_sample.geojson`

Normalized outputs:

- `data/normalized/open_geodata_roads.geojson`
- `data/normalized/open_geodata_poi.geojson`
- `data/normalized/open_geodata_landuse.geojson`
- `data/normalized/open_geodata_buildings.geojson`
- `data/normalized/open_geodata_accessibility_metrics.json`
- `data/normalized/open_geodata_ingestion_report.json`

Library modules:

- `src/lib/open-geodata/types.ts`
- `src/lib/open-geodata/osm-normalizer.ts`
- `src/lib/open-geodata/road-classifier.ts`
- `src/lib/open-geodata/poi-classifier.ts`
- `src/lib/open-geodata/accessibility-metrics.ts`
- `src/lib/open-geodata/baseline-loader.ts`

## How To Run

```bash
npm run ingest:open-geodata
```

The command reads local fixtures and writes normalized outputs. It does not call live APIs, scrape websites, require Supabase, or require external keys.

## Map Usage

The workspace and report maps now include open baseline roads, POI anchors, landuse context, existing GeoAI demo analytical overlays and selected point/object highlighting.

The layer panel separates live Mapbox basemap context, open geospatial baseline context, GeoAI demo overlays, and planned official/customer sources.

## Analysis Usage

Express Analysis receives lightweight open-baseline context:

- nearest accessibility area
- nearest road context
- nearby POI / demand anchors
- accessibility index
- evidence card linked to `open-geodata-baseline-sample`

The scoring model remains deterministic/mock. Open baseline context enriches narrative, evidence and next actions only.

## Licensing And Attribution Caution

This v0.1 baseline uses local OSM-style sample fixtures. Production use of real OSM/Geofabrik/Overpass extracts requires ODbL attribution, source date tracking, compliance review, and proper data provenance display.

## Limitations

- Not official GIS
- Not zoning, planning, title or parcel data
- Not live OSM
- No route engine
- No travel-time model
- No PostGIS import in this task
- Accessibility metrics are approximate and fixture-derived

## Next Steps

- Import a dated real OSM / Geofabrik extract for a Dubai AOI
- Clip data to project bounding boxes
- Add PostGIS import for roads, POI and landuse
- Add travel-time / network accessibility engine
- Add official Dubai GIS validation path
- Add customer portfolio overlays
- Add OSM attribution and extract metadata in report footers

