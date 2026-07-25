# Spatial Snapshot Manifest v1

## Document control

| Field | Value |
| --- | --- |
| Workstream | Agent C — spatial data architecture |
| Change request | CR-DEV6-010 |
| Status | Required Phase B contract |
| Applies to | Open, derived, user, licensed, official and synthetic spatial datasets |

## Purpose

Every GeoAI spatial dataset version must be reproducible, attributable and immutable. The manifest is the control plane for source release, extraction parameters, licence, lineage, quality and Product eligibility.

A filename such as `latest.geojson` is not a dataset version. A dataset becomes eligible for Product use only when its manifest is complete and its output checksum is verified.

## Canonical manifest

```ts
export type SpatialSnapshotManifestV1 = {
  manifestVersion: "1.0";
  datasetId: string;
  datasetVersion: string;
  buildId: string;
  layerId: string;
  layerName: string;
  description: string;
  geography: {
    id: string;
    label: string;
    bbox: [number, number, number, number];
    boundaryRole: "processing_aoi" | "source_boundary" | "derived_aoi";
    officialBoundary: boolean;
  };
  source: {
    sourceId: string;
    provider: string;
    sourceUrl: string;
    sourceReleaseId: string | null;
    sourceSnapshotDate: string | null;
    accessedAt: string;
    sourceFileName: string | null;
    sourceByteSize: number | null;
    sourceChecksum: string | null;
    sourceMode:
      | "open_snapshot"
      | "derived_open_context"
      | "user_provided"
      | "licensed"
      | "official_validated"
      | "synthetic_fallback";
  };
  licence: {
    licenseId: string;
    licenseUrl: string | null;
    attribution: string;
    sourceAttributions: string[];
    redistributionStatus:
      | "approved"
      | "approved_with_conditions"
      | "review_required"
      | "prohibited";
    adaptedDatabaseReview: "not_applicable" | "pending" | "approved";
    notes: string[];
  };
  build: {
    method: string;
    buildVersion: string;
    repositoryCommit: string;
    executedAt: string;
    tools: Array<{ name: string; version: string }>;
    parameters: Record<string, string | number | boolean | null>;
    inputDatasetIds: string[];
    operations: LineageStep[];
  };
  output: {
    crs: "EPSG:4326";
    geometryTypes: string[];
    featureCount: number;
    rejectedFeatureCount: number;
    outputFiles: Array<{
      path: string;
      mediaType: string;
      byteSize: number;
      checksum: string;
    }>;
    combinedChecksum: string;
  };
  temporal: {
    observedAt: string | null;
    validFrom: string | null;
    validTo: string | null;
    maximumDisplayAgeDays: number | null;
    freshnessStatusAtBuild: "current" | "aging" | "stale" | "unknown";
  };
  quality: {
    qualityReportPath: string;
    status: "pass" | "pass_with_warnings" | "fail";
    errorCount: number;
    warningCount: number;
    sourceAlignmentReviewed: boolean;
    reviewedBy: string | null;
    reviewedAt: string | null;
  };
  product: {
    eligibleForDemo: boolean;
    eligibleForClientPilot: boolean;
    validationStatus:
      | "open_context"
      | "derived_screening"
      | "user_unvalidated"
      | "client_validated"
      | "official_validated";
    requiredLabel: string;
    prohibitedClaims: string[];
    caveat: string;
  };
};
```

## Dataset ID rules

`datasetId` is stable across versions and identifies a logical layer and source strategy.

Pattern:

```text
geoai.<geography>.<theme>.<source-adapter>
```

Examples:

```text
geoai.dubai.buildings.overture
geoai.dubai.transport.osm
geoai.dubai.selected-aoi.open-derived
geoai.dubai.coastal-exposure.copernicus-derived
geoai.dubai.market-observations.dld-manual
```

Do not put a date in `datasetId`.

## Dataset version rules

Recommended pattern:

```text
<source-release-or-snapshot>.<build-version>
```

Examples:

```text
2026-07-12T20-22Z.v1
2026-06-17.0.v1
worldcover-2021-v200.derived-v1
2026Q2.manual-v1
```

Rules:

1. A source refresh always creates a new `datasetVersion`.
2. A changed filter, repair, simplification or methodology creates a new build version even when the source release is unchanged.
3. A file may never be silently overwritten under an existing dataset version.
4. Rollback retains prior manifests and outputs.

## Build ID

`buildId` uniquely identifies one execution.

Recommended format:

```text
<datasetId>@<datasetVersion>#<UTC timestamp or short checksum>
```

The build ID is included in logs, QA artifacts and release evidence.

## Source controls

### Snapshot date versus access time

- `sourceSnapshotDate` describes the provider data state or file timestamp.
- `accessedAt` describes when GeoAI obtained it.
- `executedAt` describes when the normalized build ran.

These values are not interchangeable.

### Unversioned source endpoints

When a provider only exposes `latest`:

1. record response headers/file metadata;
2. calculate source checksum;
3. resolve a provider timestamp/release where possible;
4. store the resolved value in `sourceReleaseId` or `sourceSnapshotDate`;
5. reject the build if no reproducible identity can be established for a release candidate.

### API responses

For API-derived data, store:

- canonical request parameters;
- endpoint and API version;
- request hash;
- provider model/product/run;
- valid time/observation time;
- response checksum;
- rate-plan/commercial-use status where relevant.

Secrets and API keys must never be stored in the manifest.

## Licence controls

The `licence` section is release-blocking.

### OSM / Geofabrik

Expected baseline:

```json
{
  "licenseId": "ODbL-1.0",
  "attribution": "© OpenStreetMap contributors",
  "redistributionStatus": "approved_with_conditions",
  "adaptedDatabaseReview": "pending"
}
```

The adapted-database review must become `approved` before public distribution of a normalized combined database.

### Overture

The manifest must include:

- Overture release ID;
- Overture citation;
- theme-level licence;
- every source attribution required by the pinned release/theme;
- OSM attribution where applicable;
- a stored attribution file generated from release metadata.

### DLD / Dubai Pulse / official sources

Until dataset-level usage and redistribution rights are captured:

```text
redistributionStatus = review_required
eligibleForDemo = false for embedded dataset distribution
```

Metadata-only readiness may still be displayed conservatively.

## Output controls

### Files

Every committed or stored output must have:

- relative storage path;
- media type;
- byte size;
- SHA-256 checksum.

### Determinism

Two builds using the same:

- source bytes;
- code commit;
- tool versions;
- parameters;
- AOI;
- input order normalization

must produce the same combined checksum, excluding deliberately non-deterministic timestamps stored outside the hashed payload.

### Canonical serialization

Before checksumming normalized JSON/GeoJSON:

- sort features by `featureKey`;
- sort object keys through a canonical serializer;
- round coordinates only according to the documented precision policy;
- exclude volatile build timestamps from feature payloads;
- use UTF-8 and LF line endings.

## Temporal and freshness policy

Each dataset declares `maximumDisplayAgeDays` or null with a reason.

Initial policy guidance:

| Theme | Suggested rule |
| --- | --- |
| OSM/Overture transport/buildings | review on every release candidate; warn after 180 days; stale after 365 days |
| Open community context | warn after 365 days; stale after 730 days unless known change occurs |
| Construction targets | warn after 30 days; stale after 90 days |
| Sentinel-derived change | acquisition-specific; no generic `current` label |
| WorldCover | always display product year; `freshnessStatus` may be aging/stale but still usable as dated baseline |
| Market snapshots | display exact period; never convert to timeless current metric |
| Weather/forecast | display model run and valid time; expire according to forecast horizon |

A dataset may remain historically useful when stale, but the UI must not label it current.

## Product eligibility

### `eligibleForDemo`

May be true only when:

- licence/attribution control passes;
- quality status is not fail;
- source and snapshot are reproducible;
- required label and caveat are set;
- no prohibited claim is generated.

### `eligibleForClientPilot`

Defaults to false for open-context and derived datasets. It may become true only for the defined pilot scope after:

- client acceptance of source limitations;
- security/storage approval where applicable;
- source licence review;
- validation workflow evidence;
- release approval.

It does not mean decision-grade or official validation.

## Example — Overture buildings

```json
{
  "manifestVersion": "1.0",
  "datasetId": "geoai.dubai.buildings.overture",
  "datasetVersion": "2026-06-17.0.v1",
  "buildId": "geoai.dubai.buildings.overture@2026-06-17.0.v1#<checksum>",
  "layerId": "openBuildings",
  "layerName": "Open Building Context",
  "description": "Selected Overture building footprints clipped to approved Dubai focus AOIs.",
  "geography": {
    "id": "geoai-dubai-phase-b-master-aoi-v1",
    "label": "Dubai urban and development screening envelope",
    "bbox": [54.95, 24.8, 55.55, 25.36],
    "boundaryRole": "processing_aoi",
    "officialBoundary": false
  },
  "source": {
    "sourceId": "overture-buildings",
    "provider": "Overture Maps Foundation",
    "sourceUrl": "https://docs.overturemaps.org/getting-data/",
    "sourceReleaseId": "2026-06-17.0",
    "sourceSnapshotDate": null,
    "accessedAt": "<ISO-8601>",
    "sourceFileName": null,
    "sourceByteSize": null,
    "sourceChecksum": null,
    "sourceMode": "open_snapshot"
  },
  "licence": {
    "licenseId": "ODbL-1.0",
    "licenseUrl": "https://docs.overturemaps.org/attribution/",
    "attribution": "© OpenStreetMap contributors, Overture Maps Foundation",
    "sourceAttributions": [],
    "redistributionStatus": "review_required",
    "adaptedDatabaseReview": "pending",
    "notes": ["Populate sourceAttributions from the pinned release before approval."]
  },
  "product": {
    "eligibleForDemo": false,
    "eligibleForClientPilot": false,
    "validationStatus": "open_context",
    "requiredLabel": "Open-context building footprint",
    "prohibitedClaims": ["official parcel", "ownership verification", "official building register"],
    "caveat": "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion."
  }
}
```

## Manifest validation command

Phase B must add a command similar to:

```bash
npm run spatial:manifest:validate
```

It must fail when:

- required fields are absent;
- timestamps are invalid;
- bbox is invalid;
- output checksum is absent;
- source release/snapshot is unresolved;
- attribution or licence is absent;
- `official_validated` lacks evidence fields;
- `eligibleForDemo=true` while redistribution is prohibited/review-required;
- Product label conflicts with validation status;
- caveat is absent.

## Required caveat

**Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.**