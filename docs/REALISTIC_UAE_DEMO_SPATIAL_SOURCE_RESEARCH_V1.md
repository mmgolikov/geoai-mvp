# Source Audit and Research Plan — Realistic UAE Demo Spatial Baseline v1

## Current-state findings

1. `src/data/demo-objects.json` contains three mock point objects.
2. Product layers render through `src/data/demo-layers.ts`, a compatibility facade over Spatial Data Adapter v0.1.
3. `src/data/spatial-seed/dubai-spatial-seed.ts` contains hand-authored synthetic polygons, lines, and points.
4. Existing geometry QA checks only supported type, required attributes, coordinate envelope, and minimum polygon vertices.
5. The current normalized contract lacks dataset release/version, provider feature ID, license/attribution, snapshot date, temporal validity, detailed lineage, and topology quality.
6. Existing open-geodata fixtures contain only 5 roads, 9 POIs, 4 land-use features, and no buildings; they are local OSM-style fixtures rather than a real source extract.

## Source strategy

### OpenStreetMap / Geofabrik

Use for:

- road and rail centre-lines;
- building footprints where coverage is adequate;
- land-use and construction polygons;
- coastline and water context;
- airports, ports, stations, and selected POIs;
- open place/community context where mapped.

Controls:

- retain `© OpenStreetMap contributors` attribution;
- record extract date, source object ID, version/timestamp where available;
- review ODbL share-alike implications for any distributed adapted database;
- never describe OSM boundaries as official Dubai planning, community, zoning, or cadastral boundaries.

Primary references:

- https://www.openstreetmap.org/copyright
- https://download.geofabrik.de/

### Overture Maps

Use for:

- buildings;
- places and activity anchors;
- transportation;
- divisions only as open-context boundaries after local plausibility review;
- stable provider IDs and source attribution.

Controls:

- pin the Overture release ID in the manifest;
- use the STAC catalog to resolve the latest release;
- extract by Dubai bbox/AOI through the official Python client or DuckDB;
- preserve per-theme/source attribution, including OSM attribution where applicable;
- do not assume every Overture feature is licensed identically; retain dataset/theme attribution.

Current official documentation examples reference release `2026-06-17.0` and support bbox download to GeoJSON from cloud-hosted GeoParquet.

Primary references:

- https://docs.overturemaps.org/getting-data/
- https://docs.overturemaps.org/schema/
- https://docs.overturemaps.org/attribution/

### Copernicus Data Space / Sentinel

Use for:

- recent Sentinel-2 metadata and selected image-derived screening signals;
- Sentinel-1 metadata and change-monitoring research;
- DEM/low-elevation screening;
- vegetation and land-surface context;
- raster-to-vector zones with reproducible thresholds.

Controls:

- record collection/product ID, acquisition date, cloud/quality filters, algorithm version, thresholds, and output checksum;
- label outputs as derived screening evidence;
- do not imply certified flood, engineering, planning, or insurance evidence.

Primary reference:

- https://documentation.dataspace.copernicus.eu/APIs/STAC.html

### ESA WorldCover

Use for:

- 10 m land-cover baseline;
- built-up, vegetation, and water context;
- supporting heat and development-intensity derivations.

Controls:

- record product year and version;
- never describe WorldCover as current zoning, cadastral, parcel, or planning data.

Primary reference:

- https://esa-worldcover.org/

### Open-Meteo and NASA POWER

Use for:

- point and time-series climate context;
- temperature, wind, precipitation, radiation, and energy metrics;
- temporal observations joined to stable GeoAI feature keys.

Controls:

- record timestamp, API/product/model identifier, query coordinates, and request parameters;
- do not present outputs as engineering, certified flood, insurance, or energy-yield evidence.

Primary references:

- https://open-meteo.com/en/docs
- https://power.larc.nasa.gov/docs/services/api/

### DLD / Dubai Pulse public data

Use only after separate verification of:

- accessible public file or API;
- permitted Product and redistribution use;
- snapshot date and category definitions;
- geographic join key;
- attribution and caveats.

Until verified, market metrics remain sample/manual context. No live or official integration claim is allowed.

### Dubai Municipality / GeoDubai

Treat as a future official validation adapter until access, license, schema, geometry lineage, and permitted Product usage are confirmed.

## Layer methodology

| Layer | Geometry source or method | Product label | Future replacement |
|---|---|---|---|
| Community/district context | Overture divisions, OSM boundaries/places, road/land-use cross-check | Open-context boundary | Authorized Municipality/GeoDubai boundary |
| Market signal areas | Open-context polygon plus separately joined market metrics | Open-context market area | Official/client-approved geography and market snapshot |
| Growth/development pipeline | Construction/land-use/building-change clusters | Derived development signal | Official planning/project pipeline |
| Asset examples | Real building footprint or explicit AOI around a real block | Sample AOI on real-world geometry | Client asset or official parcel |
| Transport | OSM/Overture road and rail centre-lines | Open transport context | Official transport GIS |
| Anchors | OSM/Overture airports, ports, stations, landmarks | Open spatial anchor | Official/client anchor registry |
| Coastal exposure | Coastline plus DEM/low-elevation derivation | Derived coastal exposure | Engineering/hazard authority layer |
| Heat exposure | Sentinel/WorldCover/vegetation/built-up derivation | Derived heat screening zone | Engineering/client-approved assessment |
| Construction monitoring | Construction polygons plus EO metadata/change indicators | Open/derived monitoring target | Client project boundary and inspection record |

## Research workstreams

### A — Source and licensing

- Confirm UAE/Dubai endpoints and download methods.
- Record license, attribution, coverage, update cadence, stable IDs, and redistribution constraints.
- Reject sources without usable lineage or permitted use.

### B — GIS geometry engineering

- Define Dubai AOI and sub-AOIs.
- Produce reproducible OSM/Overture snapshot extracts.
- Validate topology, CRS, simplification, geometry plausibility, and alignment.
- Produce before/after map evidence.

### C — Spatial data architecture

- Implement the versioned dataset/feature/metric envelope.
- Define stable `featureKey` and source-alias rules.
- Specify snapshot manifests and replacement precedence.

### D — Derived analytics

- Document coastal, heat, vegetation, construction, and development-signal methods.
- Define thresholds, uncertainty, temporal validity, and refresh policy.

### E — Product and data-honesty QA

- Verify source labels, attribution, freshness, caveats, and report lineage.
- Ensure no open or derived geometry is presented as official parcel, zoning, community, or hazard evidence.
- Test map, dashboard, comparison, and report consistency.

## Initial Product implementation boundary

The first Product PR must cover only:

1. canonical contract and compatibility adapter;
2. versioned OSM/Overture open-context snapshot for Dubai;
3. real transport, anchors, buildings/land-use, and 2–4 selected AOIs;
4. source/attribution/freshness labels;
5. deterministic snapshot builder and geometry-quality checks.

Environmental derivations and market metrics follow in separate PRs after methodology approval.

## No-go rules

- No Google Maps geometry extraction.
- No copied commercial-map polygons.
- No hand-drawn geometry labelled as community, parcel, zoning, or hazard boundary.
- No `current` claim without date or release ID.
- No official-source claim without access and evidence verification.
- No raw provider schema imports in UI components.

## Required caveat

**Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.**
