# Data Credibility Sprint v0.5

Date: 2026-06-18

GeoAI v0.5 introduces a local-first data credibility workflow for CSV and GeoJSON uploads. The goal is to move the investor demo from purely bundled fixtures toward a pilot-ready data architecture without adding a database dependency or claiming live official data.

## What Works

- Workspace command panel accepts local CSV and GeoJSON uploads.
- Uploads are parsed in the browser and persisted to `localStorage`.
- GeoJSON uploads render as a toggleable Mapbox layer under Spatial Layers / Uploaded datasets.
- CSV metrics are matched to the selected point/object when possible.
- Express Analysis, Evidence / Data Used, report preview, and print report include uploaded data lineage when relevant.
- Uploaded data is clearly marked as user-provided and validation-required.

## Metadata Model

Uploaded datasets follow this shape:

```ts
type UploadedDataset = {
  id: string;
  name: string;
  type: "geojson" | "csv";
  status: "uploaded-local" | "parsed" | "invalid";
  sourceMode: "user-uploaded" | "sample-fixture" | "manual-offline";
  uploadedAt: string;
  featureCount?: number;
  rowCount?: number;
  columns?: string[];
  confidence: "user-provided" | "sample" | "unknown";
  officialStatus: "not-official" | "official-validation-required" | "user-labeled-official";
  notes?: string;
};
```

The current implementation extends this model internally with parsed rows, GeoJSON features, and layer visibility state so the browser can render and analyze local files.

## CSV Rules

Required:

- One of `name`, `area_name`, or `site_name`

Recommended:

- `latitude`
- `longitude`
- `area_name`
- `transaction_count`
- `median_price_per_sqm`
- `pipeline_status`
- `confidence`

Matching behavior:

- Selected object name/area matching is preferred.
- If latitude/longitude are provided, nearest coordinate matching is attempted within a small local radius.
- If no reliable match is found, the CSV is shown as available but not applied.

## GeoJSON Rules

Supported:

- `FeatureCollection`
- Point, line and polygon geometries
- Lightweight user-provided properties such as `name`, `site_name`, `area_name`, `confidence`, `note`

Current behavior:

- Uploaded GeoJSON is rendered as a local user-uploaded layer.
- The layer is toggleable from the map layer control.
- Tooltips identify uploaded features as local user-provided context.
- Uploaded geometries are not treated as official parcels, zoning, planning, utility, or risk boundaries.

## Sample Files

Sample uploads are available at:

- `data/upload-samples/dubai_site_metrics_sample.csv`
- `data/upload-samples/dubai_pipeline_sites_sample.geojson`

Both samples are synthetic demo fixtures.

## Source Lineage

Uploaded data appears in:

- Workspace Data Sources panel
- Map Spatial Layers / Uploaded datasets
- Express Analysis Evidence / Data Used
- Uploaded Data Context section
- Report Preview Source Lineage / Uploaded Data Used
- Print report source lineage

All uploaded evidence is labeled as local, user-provided, and validation-required.

## Intentional Limitations

- No Supabase upload persistence in this sprint.
- No authentication or user accounts.
- No backend file storage.
- No live DLD, Dubai Pulse, GeoDubai, or official GIS APIs.
- No server-side PDF generation.
- No scoring-model overhaul.
- No official-data claims for uploaded files.

## Manual QA

1. Open `/workspace`.
2. Expand Data Sources in the right command panel.
3. Upload `data/upload-samples/dubai_site_metrics_sample.csv`.
4. Upload `data/upload-samples/dubai_pipeline_sites_sample.geojson`.
5. Open Spatial Layers and confirm Uploaded datasets is visible.
6. Toggle the uploaded GeoJSON layer from the Data Sources panel.
7. Select a nearby point or demo object.
8. Run Express Analysis.
9. Confirm Evidence / Data Used and Uploaded Data Context mention uploaded local data.
10. Export report and confirm Source Lineage / Uploaded Data Used appears.

## Next Recommended Iteration

- Add explicit uploaded feature selection for GeoJSON objects.
- Add server-backed upload storage behind Supabase when auth and tenancy are introduced.
- Add schema templates for customer parcels, pipeline projects, sales comps, leases, and constraints.
- Add validation reports for CRS, geometry validity, duplicate IDs, and required metadata.
