# Spatial Adapter Interface v1

## Document control

| Field | Value |
| --- | --- |
| Workstream | Agent C — spatial data architecture |
| Change request | CR-DEV6-010 |
| Status | Phase B engineering contract |
| Migration principle | Replace provider adapters, not Product components |

## Purpose

Define one adapter boundary between raw provider data and GeoAI Product surfaces. React components, reports and APIs must consume normalized GeoAI envelopes and must never depend directly on OSM tags, Overture nested structs, Copernicus STAC items, DLD CSV columns or customer-specific schemas.

## Architecture

```text
Provider source
    ↓
Source adapter
    ↓
SpatialSnapshotBundle
    ↓
Dataset registry and eligibility resolver
    ↓
Product compatibility adapter / APIs
    ↓
Map, dashboard, comparison, report and export
```

## Canonical bundle

```ts
export type SpatialSnapshotBundle = {
  manifest: SpatialSnapshotManifestV1;
  features: SpatialFeatureEnvelope[];
  metrics: SpatialMetricObservation[];
  featureRegistry: StableFeatureRegistryRecord[];
  attribution: SpatialAttributionBundle;
  qualityReport: SpatialQualityReport;
};
```

## Adapter interface

```ts
export type SpatialAdapterContext = {
  buildId: string;
  repositoryCommit: string;
  accessedAt: string;
  targetCrs: "EPSG:4326";
  metricCrs: "EPSG:32640";
  masterAoi: GeoJSON.Polygon;
  focusAois: Array<{ id: string; geometry: GeoJSON.Polygon }>;
  parameters: Record<string, string | number | boolean | null>;
};

export type SpatialAdapterInput = {
  sourceId: string;
  sourceReleaseId: string | null;
  localPaths: string[];
  requestManifests?: Array<{
    endpoint: string;
    method: "GET" | "POST";
    canonicalParameters: Record<string, unknown>;
    responseChecksum: string;
  }>;
};

export type SpatialAdapterResult = {
  bundle: SpatialSnapshotBundle;
  warnings: Array<{ code: string; message: string }>;
  rejectedFeatures: Array<{
    sourceFeatureId: string | null;
    reasonCode: string;
    message: string;
  }>;
};

export interface SpatialSourceAdapter {
  readonly adapterId: string;
  readonly adapterVersion: string;
  readonly supportedSourceModes: SpatialDatasetVersion["sourceMode"][];

  inspect(input: SpatialAdapterInput): Promise<{
    sourceIdentity: Record<string, string | number | boolean | null>;
    detectedCrs: string | null;
    sourceFeatureCount: number | null;
    licenceEvidence: SpatialAttributionBundle;
  }>;

  build(
    input: SpatialAdapterInput,
    context: SpatialAdapterContext
  ): Promise<SpatialAdapterResult>;

  validate(result: SpatialAdapterResult): Promise<SpatialValidationResult>;
}
```

## Adapter registry

```ts
export const spatialAdapterRegistry = {
  osm_snapshot: osmSnapshotAdapter,
  overture_snapshot: overtureSnapshotAdapter,
  copernicus_derived: copernicusDerivedAdapter,
  worldcover_derived: worldCoverDerivedAdapter,
  open_meteo_context: openMeteoMetricAdapter,
  nasa_power_context: nasaPowerMetricAdapter,
  customer_geojson: customerGeoJsonAdapter,
  licensed_provider: licensedProviderAdapter,
  official_gis: officialGisAdapter,
  synthetic_fallback: syntheticFallbackAdapter
} satisfies Record<string, SpatialSourceAdapter>;
```

Adding an adapter requires a Change Request, source/licence record, contract tests and Product label mapping.

## Source-specific responsibilities

### `osm_snapshot`

Input:

- pinned `.osm.pbf`, GeoPackage or normalized source extract;
- source file timestamp/checksum;
- OSM/Geofabrik attribution.

Responsibilities:

- retain OSM element type and numeric ID;
- map tags to controlled GeoAI categories;
- separate buildings, construction, land use, transport, water and anchors;
- preserve relevant source tags in lineage/metadata;
- reject unsupported or invalid geometry;
- never infer official planning or parcel status.

### `overture_snapshot`

Input:

- one pinned Overture release;
- theme/type extracts;
- release attribution/NOTICE evidence.

Responsibilities:

- retain Overture `id` and source references;
- normalize nested names/classes/sources;
- emit source-level attribution;
- map GERS/source aliases where available;
- avoid cross-release mixing;
- keep theme licence state in manifest.

### `copernicus_derived`

Input:

- STAC item metadata;
- downloaded/processed assets;
- methodology version and parameters.

Responsibilities:

- retain collection/item/product IDs and acquisition time;
- record cloud/quality filters;
- emit derived, not source-exact, geometry;
- include raster/vector transformation lineage;
- label output `derived_screening`;
- never output official hazard/engineering claims.

### `worldcover_derived`

Input:

- WorldCover year/version tiles;
- selected classes and derivation method.

Responsibilities:

- preserve product year and algorithm version;
- include required ESA/Copernicus attribution;
- avoid `current land use` language;
- emit dated open/derived context.

### Metric-only adapters

`open_meteo_context` and `nasa_power_context` normally emit `SpatialMetricObservation[]` joined to existing `featureKey` values. They do not create district/parcel geometry.

### `customer_geojson`

Responsibilities:

- parse only supported geometry and CRS;
- keep organization/project scope;
- set `user_unvalidated` by default;
- never promote from file naming or customer claim alone;
- attach review evidence separately;
- keep confidential datasets out of public/demo bundles.

### `licensed_provider`

Responsibilities:

- enforce contract-defined fields, storage and display limits;
- preserve provider IDs and release;
- prevent export/redistribution when prohibited;
- expose the exact allowed claim scope.

### `official_gis`

Inactive until approved access exists.

Responsibilities when activated:

- require provider, schema, purpose, date, scope and licence evidence;
- map explicit provider IDs to stable GeoAI keys;
- never mark all fields `official_validated` globally;
- validation applies only to the specific source and scope.

### `synthetic_fallback`

Responsibilities:

- preserve current demo continuity when no eligible source bundle exists;
- always expose `synthetic_fallback` / demo status;
- never outrank an eligible open/client/licensed/official source;
- remain removable without changing Product contracts.

## Eligibility resolver

```ts
export type SpatialDatasetResolutionRequest = {
  layerId: string;
  geographyId: string;
  asOf?: string | null;
  requiredValidationStatus?:
    | "open_context"
    | "derived_screening"
    | "user_unvalidated"
    | "client_validated"
    | "official_validated";
  allowedSourceModes?: SpatialDatasetVersion["sourceMode"][];
  projectId?: string | null;
};

export type SpatialDatasetResolution = {
  selected: SpatialDatasetVersion | null;
  alternatives: SpatialDatasetVersion[];
  reason: string;
  fallbackUsed: boolean;
};
```

Precedence:

1. Officially validated source for the requested scope.
2. Client-validated project source.
3. Licensed provider source allowed for that Product use.
4. Eligible open snapshot.
5. Eligible derived screening layer.
6. Synthetic fallback.

The resolver must not select a higher-precedence source if it is stale, outside scope, licence-blocked or not eligible for the current environment.

## Dataset registry contract

```ts
export interface SpatialDatasetRepository {
  listVersions(query: {
    datasetId?: string;
    layerId?: string;
    geographyId?: string;
  }): Promise<SpatialDatasetVersion[]>;

  getBundle(datasetId: string, datasetVersion: string): Promise<SpatialSnapshotBundle | null>;

  resolve(request: SpatialDatasetResolutionRequest): Promise<SpatialDatasetResolution>;
}
```

Phase B may implement this as static/versioned repository assets. Future Supabase/PostGIS implementation must preserve the interface.

## Product API envelope

Recommended read-only response:

```ts
export type SpatialFeatureApiResponse = {
  feature: {
    featureKey: string;
    name: string;
    category: string;
    subtype: string;
    geometry: GeoJSON.Geometry;
    centroid: { longitude: number; latitude: number };
    areaSqm: number | null;
    datasetId: string;
    datasetVersion: string;
    validationStatus: string;
    confidenceLevel: string;
    sourceLabel: string;
    freshnessLabel: string;
    attributionShort: string;
    limitations: string[];
  };
  metricObservations: SpatialMetricObservation[];
  lineageSummary: {
    sourceId: string;
    sourceReleaseId: string | null;
    snapshotDate: string | null;
    accessedAt: string;
    geometryOrigin: string;
    geometryAccuracy: string;
    qualityStatus: string;
  };
  caveat: string;
};
```

Raw provider fields are not returned by default. Full lineage may be exposed through a dedicated evidence endpoint.

## Existing `demoLayers` compatibility facade

Phase B must preserve the existing Mapbox renderer while changing its source.

```ts
export function toDemoLayerFeature(
  feature: SpatialFeatureEnvelope,
  layer: NormalizedLayerDefinition
): DemoLayerFeature {
  return {
    type: "Feature",
    id: feature.featureKey,
    properties: {
      id: feature.featureKey,
      featureId: feature.featureKey,
      name: feature.name,
      objectType: feature.subtype,
      layerId: layer.id,
      layerName: layer.name,
      geometryType: toDemoGeometryType(feature.geometry),
      color: layer.style.fillColor,
      category: layer.category,
      subcategory: feature.subtype,
      sourceMode: mapSourceMode(feature),
      confidenceLevel: feature.confidenceLevel,
      relevance: buildScenarioRelevance(feature),
      hoverLabel: buildHoverLabel(feature),
      selectedLabel: `Selected: ${feature.name}`,
      fillColor: layer.style.fillColor,
      strokeColor: layer.style.strokeColor,
      strokeWidth: layer.style.strokeWidth,
      fillOpacity: layer.style.fillOpacity,
      strokeOpacity: layer.style.strokeOpacity,
      pointRadius: layer.style.pointRadius ?? 5,
      layerOrder: layer.layerOrder,
      clickPriority: layer.clickPriority
    },
    geometry: feature.geometry
  };
}
```

Compatibility constraints:

- `feature.id` becomes stable `featureKey`, not provider ID;
- source/date/validation labels are derived from the envelope;
- map styles remain controlled by GeoAI layer configuration;
- current selection, dashboard and report workflows continue to receive `SpatialSelectionContext` through an updated adapter;
- provider schemas are confined to build-time adapters.

## Selection context v2

```ts
export type SpatialSelectionContextV2 = {
  featureKey: string;
  featureName: string;
  datasetId: string;
  datasetVersion: string;
  category: string;
  subtype: string;
  geometryType: GeoJSON.Geometry["type"];
  centroid: { longitude: number; latitude: number };
  areaSqm: number | null;
  sourceId: string;
  sourceReleaseId: string | null;
  sourceMode: string;
  validationStatus: string;
  geometryOrigin: string;
  geometryRole: string;
  geometryAccuracy: string;
  confidenceLevel: string;
  freshnessStatus: string;
  observedAt: string | null;
  attributionShort: string;
  limitations: string[];
  scenarioRelevance: string[];
  geometryChecksum: string;
};
```

Saved analyses and reports pin `datasetVersion` and `geometryChecksum`.

## Metric join rules

- Join on `featureKey`, not source ID or display name.
- Observation period is mandatory for time-dependent metrics.
- Multiple observations may coexist.
- The analysis model must select the observation using an explicit period/source rule.
- Geometry refresh does not implicitly refresh metrics.
- Official geometry does not make open/sample metrics official.

## Error and fallback behavior

| Condition | Behavior |
| --- | --- |
| Source bundle missing | Use eligible lower-precedence bundle; expose fallback label |
| Manifest invalid | Reject bundle; do not render partial source as normal layer |
| Some features invalid | Reject features according to quality policy and expose counts |
| Attribution missing | Dataset not eligible for Product |
| Source stale | Render only with dated/stale label if policy allows |
| Official adapter unreachable | Do not silently claim official state; use lower-precedence source |
| Customer source unauthorized | Do not expose; return access-safe error |

## Contract tests

Each adapter must pass:

1. Deterministic build test from fixed fixture.
2. Manifest schema validation.
3. Feature envelope schema validation.
4. Stable-key uniqueness and alias collision test.
5. Geometry/topology QA.
6. Licence/attribution completeness.
7. Product label mapping.
8. No official claim for open/derived/user-unvalidated source.
9. Compatibility conversion to map feature.
10. Saved report version pinning.

## Migration sequence

1. Add v1 types and manifest schemas without changing visible layers.
2. Add static repository and adapter registry.
3. Convert current synthetic seed into `synthetic_fallback` bundle.
4. Generate OSM/Overture Phase B bundles.
5. Switch selected layers through the resolver behind a controlled configuration flag.
6. Validate map/dashboard/report parity.
7. Remove direct imports from the old seed only after rollback evidence exists.
8. Later replace static repository with PostGIS without changing the adapter/API interface.

## Security and release controls

- Adapters do not read secrets in browser code.
- Raw customer/licensed data is not committed to the public repository.
- Production source activation requires separate environment and release approval.
- Phase B is open-context static snapshot only unless explicitly approved otherwise.
- No migrations or Production Supabase writes are part of this interface document.

## Required caveat

**Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.**