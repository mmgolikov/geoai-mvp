# Data Contract — GeoAI Spatial Dataset Envelope v1

## Purpose

Define one stable normalized contract for realistic open-context demo layers, derived screening layers, customer uploads, licensed datasets, and future official validation sources.

The Product must not require separate UI models for demo and real data. Source mode, evidence, version, and validation status change; the normalized spatial feature contract does not.

## SpatialDatasetVersion

```ts
export type SpatialDatasetVersion = {
  datasetId: string;
  datasetVersion: string;
  layerId: string;
  layerName: string;
  geography: string;
  snapshotDate: string | null;
  accessedAt: string;
  validFrom: string | null;
  validTo: string | null;
  sourceId: string;
  sourceReleaseId: string | null;
  sourceMode:
    | "open_snapshot"
    | "derived_open_context"
    | "user_provided"
    | "licensed"
    | "official_validated"
    | "synthetic_fallback";
  licenseId: string;
  attribution: string;
  buildMethod: string;
  buildVersion: string;
  checksum: string;
  caveat: string;
};
```

## SpatialFeatureEnvelope

```ts
export type SpatialFeatureEnvelope = {
  featureKey: string;
  datasetId: string;
  datasetVersion: string;
  sourceFeatureId: string | null;
  sourceAliases: Array<{ sourceId: string; sourceFeatureId: string }>;
  name: string;
  category: string;
  subtype: string;
  geometry: GeoJSON.Geometry;
  centroid: { longitude: number; latitude: number };
  areaSqm: number | null;
  geometryOrigin: "source" | "derived" | "user" | "synthetic";
  geometryRole:
    | "context_boundary"
    | "screening_zone"
    | "asset_footprint"
    | "aoi"
    | "corridor"
    | "anchor"
    | "observation_footprint";
  geometryAccuracy:
    | "source_exact"
    | "source_generalized"
    | "derived"
    | "approximate";
  observedAt: string | null;
  validFrom: string | null;
  validTo: string | null;
  freshnessStatus: "current" | "aging" | "stale" | "unknown";
  validationStatus:
    | "open_context"
    | "derived_screening"
    | "user_unvalidated"
    | "client_validated"
    | "official_validated";
  confidenceLevel: "demo" | "low" | "medium" | "high";
  scenarioRelevance: string[];
  limitations: string[];
  lineage: LineageStep[];
  quality: GeometryQuality;
  metadata: Record<string, string | number | boolean | null>;
};
```

## SpatialMetricObservation

```ts
export type SpatialMetricObservation = {
  metricObservationId: string;
  featureKey: string;
  metricId: string;
  value: number | string | null;
  unit: string | null;
  observedAt: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  sourceId: string;
  datasetVersion: string;
  method: "source_value" | "aggregation" | "model" | "manual";
  confidenceLevel: "demo" | "low" | "medium" | "high";
  validationStatus:
    | "open_context"
    | "derived_screening"
    | "user_unvalidated"
    | "client_validated"
    | "official_validated";
  caveat: string;
};
```

## LineageStep

```ts
export type LineageStep = {
  sequence: number;
  operation: string;
  tool: string;
  toolVersion: string | null;
  inputDatasetIds: string[];
  parameters: Record<string, string | number | boolean | null>;
  outputChecksum: string | null;
};
```

## GeometryQuality

```ts
export type GeometryQuality = {
  valid: boolean;
  ringClosed: boolean | null;
  selfIntersectionCount: number;
  emptyPartCount: number;
  centroidInside: boolean | null;
  coordinateRangeValid: boolean;
  areaPlausible: boolean | null;
  overlapPolicyPassed: boolean | null;
  sourceAlignmentReviewed: boolean;
  issues: Array<{
    severity: "info" | "warning" | "error";
    code: string;
    message: string;
  }>;
};
```

## Stable identity rules

1. `featureKey` is GeoAI-controlled and survives source refreshes when the represented entity is unchanged.
2. `sourceFeatureId` is provider-controlled and may change between releases.
3. `sourceAliases` preserve mappings to prior or alternative sources.
4. A geometry refresh does not create a new `featureKey` when it represents the same entity and lineage records the replacement.
5. A materially different boundary interpretation creates a new dataset/feature version rather than silently mutating history.

## Geometry and metrics separation

- Geometry answers where the feature is.
- Metric observations answer what was measured, when, with which method and source.
- Market price, rent, yield, accessibility, climate, and construction-change metrics must not be embedded as timeless geometry properties.
- A new market or climate snapshot can update metrics without replacing the geometry dataset.
- A validated official boundary can supersede open-context geometry while preserving business identity through `featureKey` and aliases.

## Source adapter output

Every adapter must emit:

1. `SpatialDatasetVersion`
2. `SpatialFeatureEnvelope[]`
3. optional `SpatialMetricObservation[]`
4. build manifest
5. license and attribution record
6. quality report

Target adapters:

- `osm_snapshot`
- `overture_snapshot`
- `copernicus_derived`
- `worldcover_derived`
- `open_meteo_context`
- `nasa_power_context`
- `customer_geojson`
- `licensed_provider`
- `official_gis`
- `synthetic_fallback`

## UI labels

| Validation status | Required Product label |
|---|---|
| `open_context` | Open-context geometry |
| `derived_screening` | Derived screening zone |
| `user_unvalidated` | User-provided; validation required |
| `client_validated` | Client-validated evidence |
| `official_validated` | Officially validated for the stated source and scope |

`official_validated` may only be used when provider, scope, date, lineage, and review evidence are attached.

## Replacement precedence

1. Officially validated source for the exact approved scope
2. Client-validated supplied data
3. Licensed provider data
4. Open-context source snapshot
5. Derived open-context screening layer
6. Synthetic fallback

Higher precedence does not erase lower-precedence lineage. Source comparison and rollback must remain possible.

## Quality gates

- Valid GeoJSON
- Stable ID uniqueness
- Required source, release, license, attribution, and snapshot fields
- Closed polygon rings
- No self-intersections
- Non-empty geometry
- Valid Dubai/AOI coordinate envelope
- Plausible area and length
- Centroid calculation and containment where applicable
- Transformation lineage completeness
- Dataset checksum
- Product/export attribution
- No official/live claim without validated status

## Migration compatibility

The existing `demoLayers` renderer remains a compatibility facade. A new adapter converts `SpatialFeatureEnvelope` into the current map feature shape during migration. UI components must not import raw provider schemas.

## Required caveat

**Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.**
