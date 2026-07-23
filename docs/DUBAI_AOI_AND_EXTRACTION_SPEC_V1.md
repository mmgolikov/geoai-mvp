# Dubai AOI and Open Geometry Extraction Specification v1

## Document control

| Field | Value |
| --- | --- |
| Workstream | Agent B — GIS geometry engineering |
| Change request | CR-DEV6-010 |
| Status | Research specification; no Product dataset generated yet |
| Storage CRS | EPSG:4326 / WGS84 |
| Metric working CRS | EPSG:32640 / WGS 84 UTM zone 40N |
| Target implementation phase | Phase B — Open Geometry Foundation |

## Objective

Define a deterministic extraction process that replaces arbitrary hand-authored demo geometry with recognizable open-context geometry while preserving source IDs, release metadata, attribution and a future official/client replacement path.

The Phase B snapshot is not an official Dubai administrative, parcel, cadastral, zoning, planning or hazard dataset.

## AOI policy

### Master Phase B AOI

Use a rectangular processing envelope that covers the main Dubai urban area, Dubai South, Jebel Ali, the coastline, DXB and the Creek, while excluding Hatta and the full desert extent:

```json
{
  "id": "geoai-dubai-phase-b-master-aoi-v1",
  "bbox": [54.95, 24.80, 55.55, 25.36],
  "crs": "EPSG:4326",
  "label": "Dubai urban and development screening envelope",
  "boundaryRole": "processing_aoi",
  "validationStatus": "derived_screening",
  "officialBoundary": false
}
```

This rectangle is a processing envelope only. It must never be displayed or described as the Emirate of Dubai boundary.

### Focus AOIs

| AOI ID | BBOX | Purpose |
| --- | --- | --- |
| `dubai-marina-jbr-palm-v1` | `[55.08, 25.04, 55.19, 25.16]` | Waterfront market context, real building footprints, transport access and coastal context |
| `downtown-business-bay-meydan-v1` | `[55.22, 25.13, 55.37, 25.23]` | Dense mixed-use context, towers/blocks, canal, metro/road and selected AOIs |
| `dubai-south-jebel-ali-v1` | `[54.98, 24.82, 55.28, 25.06]` | Airport, logistics, port, industrial, construction and development-activity context |
| `creek-dxb-v1` | `[55.29, 25.16, 55.47, 25.30]` | Creek/water, DXB, transport, activity anchors and construction monitoring examples |

A fifth `jvc-jvt-barsha-v1` AOI may be added only if Phase B performance and evidence remain manageable.

## Source snapshot strategy

### OpenStreetMap / Geofabrik

Preferred reproducible source:

- Geofabrik GCC States `.osm.pbf` or `.gpkg.zip`;
- exact file date and checksum pinned in the snapshot manifest;
- clipped to the master AOI locally;
- no live Overpass dependency in the released build.

Illustrative commands:

```bash
# Download and pin the source file manually or in a controlled CI job.
# Record file name, Last-Modified, byte size and SHA-256 in the manifest.

osmium extract \
  --bbox 54.95,24.80,55.55,25.36 \
  --strategy complete_ways \
  gcc-states-latest.osm.pbf \
  -o dubai-phase-b.osm.pbf

# Retain source IDs and tags required by the normalizer.
osmium tags-filter dubai-phase-b.osm.pbf \
  w/highway \
  w/railway \
  nwr/building \
  nwr/landuse \
  nwr/construction \
  nwr/natural=coastline,water \
  nwr/waterway \
  nwr/aeroway \
  nwr/amenity \
  nwr/tourism \
  nwr/leisure \
  nwr/boundary \
  nwr/place \
  -o dubai-phase-b-filtered.osm.pbf
```

Implementation may use `ogr2ogr`, `pyosmium`, `osmium`, `osm2pgsql` or GDAL, but the selected tool and version must be recorded in lineage.

### Overture Maps

Resolve the release through the official STAC catalog, then pin it in the manifest.

Illustrative Python-client commands:

```bash
pip install overturemaps

# One file per theme/type and AOI. Exact supported type names must be resolved
# from the pinned release schema before execution.
overturemaps download \
  --bbox=54.95,24.80,55.55,25.36 \
  --type=building \
  -f geojson \
  -o overture-dubai-buildings.geojson
```

Illustrative DuckDB pattern:

```sql
INSTALL spatial;
LOAD spatial;
INSTALL httpfs;
LOAD httpfs;
SET s3_region = 'us-west-2';

-- `release_id`, theme and type are injected from the pinned build manifest.
COPY (
  SELECT id, geometry, sources, names, class, subtype, height, bbox
  FROM read_parquet(
    's3://overturemaps-us-west-2/release/${release_id}/theme=buildings/type=building/*',
    filename=true,
    hive_partitioning=1
  )
  WHERE bbox.xmin <= 55.55
    AND bbox.xmax >= 54.95
    AND bbox.ymin <= 25.36
    AND bbox.ymax >= 24.80
) TO 'overture-dubai-buildings.geojson'
  WITH (FORMAT GDAL, DRIVER 'GeoJSON');
```

Do not mix Overture releases inside one dataset version.

## Target source features

### Roads and rail

OSM candidate filters:

- `highway=motorway|trunk|primary|secondary|tertiary`;
- selected `residential|service` roads inside focused AOIs where required for local context;
- `railway=rail|subway|light_rail|tram`;
- stations/stops as anchors, not corridor lines.

Output classes:

- `regional_access_corridor`;
- `urban_primary_corridor`;
- `local_access_context`;
- `rail_transit_context`.

No line may be labelled as an official transport alignment.

### Buildings

Source preference by candidate:

1. Overture building with valid polygon and source attribution;
2. OSM building with stable OSM ID;
3. synthetic fallback only if neither source yields a usable object.

Filters and controls:

- exclude empty and invalid polygons;
- separate `building=construction` into construction targets;
- retain source height/levels only as source attributes, not verified values;
- simplify only for map performance and retain an unsimplified source geometry checksum;
- no building footprint is a parcel.

### Land use and activity blocks

OSM candidate tags:

- `landuse=residential|commercial|retail|industrial|construction|brownfield|greenfield`;
- `leisure=park|garden`;
- `natural=water|beach` where relevant;
- selected `aeroway=aerodrome|apron|terminal` context.

Use land-use geometry as open context. Do not label it zoning or official planning use.

### Construction targets

Candidate geometry:

- `landuse=construction` polygons;
- `building=construction` footprints;
- Overture building/footprint candidates with source evidence;
- later EO observation links.

Phase B must select a small number of visibly credible targets, not every mapped construction feature.

### Coastline and water

Use source coastline/water polygons or lines for visual alignment and later derived low-elevation methodology. Coastline is context, not a hazard boundary.

### Community/place context

Candidate sources:

- Overture divisions;
- OSM `boundary=administrative` or mapped place relations/polygons;
- Overture places for labels/anchors.

Each candidate must pass manual plausibility review. Display as `Open-context area boundary`, never `Official community boundary`.

### Selected demo AOIs

Phase B should produce 2–4 selected objects:

1. Marina/JBR: one real building footprint or a deterministic union of adjacent real footprints/blocks.
2. Business Bay: one real building footprint or block-level AOI.
3. Dubai South: one construction/industrial open-context footprint or transparent AOI around mapped features.
4. Optional Creek/DXB: one construction-monitoring or infrastructure-context AOI.

Rules:

- preserve the source geometry and IDs;
- any union/buffer/dissolve is `geometryOrigin=derived`;
- record parameters in lineage;
- label `Sample AOI on real-world geometry`;
- do not use `parcel`, `plot`, `title` or `cadastral` in the Product name.

## Normalization pipeline

```text
source download
→ checksum and manifest
→ master AOI clip
→ feature/tag filter
→ source-schema adapter
→ WGS84 validation
→ project to EPSG:32640 for metric operations
→ geometry repair
→ optional deterministic simplify/dissolve
→ quality report
→ stable feature-key assignment
→ normalized GeoJSON / spatial envelope
→ source attribution bundle
```

## Geometry operation rules

| Operation | Rule |
| --- | --- |
| Clip | Clip only to the processing AOI; retain source geometry checksum and source bbox |
| Reproject | Use EPSG:32640 for area, length, buffer and topology; output EPSG:4326 |
| Repair | Use deterministic `make_valid` / polygon repair and record whether geometry changed |
| Simplify | Topology-preserving only; suggested visual tolerance 0.5–2.0 m for selected AOIs and 2–8 m for broad context, subject to visual QA |
| Buffer | Only for derived screening methodology; buffer distance and CRS mandatory in lineage |
| Dissolve | Allowed for derived activity clusters; preserve member source IDs |
| Centroid | Prefer point-on-surface for polygons used as clickable objects; store geometric centroid separately if needed |
| Area | Compute in EPSG:32640; never estimate from degree coordinates in the released snapshot builder |

## Output structure

```text
data/spatial-snapshots/
  dubai-open-context-v1/
    manifest.json
    attribution.json
    quality-report.json
    feature-key-registry.json
    geometry/
      community-context.geojson
      buildings.geojson
      landuse.geojson
      transport.geojson
      anchors.geojson
      construction.geojson
      water-coastline.geojson
      selected-aoi.geojson
    metrics/
      accessibility-observations.json
```

Provider raw files should not be committed to the public repository unless licence, size and redistribution controls explicitly permit it. The repository may commit normalized clipped snapshots plus manifests only after review.

## Feature selection and density limits

Initial Product snapshot targets:

| Layer | Suggested retained features |
| --- | ---: |
| Broad community/place context | 10–30 |
| Primary transport lines | 30–100 |
| Activity/infrastructure anchors | 30–100 |
| Land-use/context polygons | 30–100 |
| Buildings in focused AOIs | 200–1,000, loaded by zoom or tiled if needed |
| Construction targets | 5–20 |
| Selected AOIs | 2–4 |

The map must not load all Dubai building footprints as one monolithic client-side GeoJSON if performance evidence fails. Phase B may use focus-AOI subsets, vector tiles or zoom-gated sources.

## Reproducibility manifest

Every extraction must record:

- source URL/path;
- source file or release ID;
- source access timestamp;
- source checksum or ETag where available;
- master and focused AOIs;
- tool names and versions;
- exact filter expressions;
- CRS transformations;
- repair/simplification parameters;
- output feature counts;
- output checksums;
- attribution text;
- known limitations.

## Acceptance evidence

Phase B evidence must include:

1. Before/after screenshots for Marina/JBR, Business Bay and Dubai South.
2. Source-basemap alignment showing roads/buildings/coastline/land-use context.
3. Geometry quality summary and rejected-feature count.
4. Feature ID and lineage panel for at least one object per layer.
5. Attribution visible on map and printable output.
6. Zero official parcel/zoning/cadastral/hazard claims.
7. Browser performance at approved mobile and desktop viewports.

## No-go rules

- No geometry traced or copied from Google Maps, Bing, commercial portal screenshots or protected PDF maps.
- No manually sketched polygon labelled as a real community, parcel, zoning or flood boundary.
- No unpinned `latest` source in a released snapshot.
- No source refresh that silently mutates an existing dataset version.
- No provider raw schema imported directly into React components.

## Required caveat

**Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.**