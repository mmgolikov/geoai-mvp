# Geometry Quality and Topology QA v1

## Document control

| Field | Value |
| --- | --- |
| Workstream | Agent B — GIS geometry engineering |
| Change request | CR-DEV6-010 |
| Status | Required Phase B release gate |
| Working CRS | EPSG:32640 for metric/topology operations |
| Output CRS | EPSG:4326 |

## Purpose

Prevent visually plausible but geometrically invalid, misleading or unstable spatial objects from entering the GeoAI demo snapshot. This standard applies equally to open-source snapshots, derived screening zones, customer uploads and future official adapters.

## Gate hierarchy

| Gate | Outcome |
| --- | --- |
| G0 — source and license | Feature is not processed if source, snapshot or permitted use is unknown. |
| G1 — schema | Required identity, lineage and geometry fields exist. |
| G2 — geometric validity | Geometry is valid, non-empty and compatible with the declared type. |
| G3 — spatial plausibility | Coordinates, area/length and location are plausible for the declared AOI. |
| G4 — source alignment | Geometry visibly aligns with the source/basemap context within its stated accuracy. |
| G5 — Product honesty | Labels match geometry origin and validation status. |
| G6 — regression | Map interaction, dashboard, comparison and report/export remain consistent. |

Any error at G0–G3 blocks release. G4–G6 warnings require documented disposition and founder review.

## Required feature quality object

```ts
export type GeometryQuality = {
  valid: boolean;
  sourceGeometryChecksum: string;
  normalizedGeometryChecksum: string;
  geometryChangedByRepair: boolean;
  ringClosed: boolean | null;
  orientationNormalized: boolean | null;
  selfIntersectionCount: number;
  emptyPartCount: number;
  duplicateVertexCount: number;
  centroidInside: boolean | null;
  pointOnSurfaceAvailable: boolean | null;
  coordinateRangeValid: boolean;
  aoiIntersectionRatio: number;
  areaSqm: number | null;
  lengthM: number | null;
  areaPlausible: boolean | null;
  lengthPlausible: boolean | null;
  minimumWidthM: number | null;
  simplificationToleranceM: number | null;
  vertexCountBefore: number;
  vertexCountAfter: number;
  sourceAlignmentReviewed: boolean;
  overlapPolicyPassed: boolean | null;
  issues: Array<{
    severity: "info" | "warning" | "error";
    code: string;
    message: string;
  }>;
};
```

## Schema checks

Every feature must contain:

- `featureKey`;
- `datasetId` and `datasetVersion`;
- `sourceFeatureId` or an explicit derived/user-generated reason for null;
- `name`, `category`, `subtype`;
- `geometryOrigin`, `geometryRole`, `geometryAccuracy`;
- `validationStatus` and `confidenceLevel`;
- `scenarioRelevance`;
- source and transformation lineage;
- limitations;
- quality result.

Duplicate `featureKey` values within the registry are release-blocking.

## Coordinate and CRS checks

### Storage

- GeoJSON coordinates are longitude, latitude in EPSG:4326.
- Coordinate order must never be inferred from value magnitude alone after ingestion.
- Dataset manifest must explicitly declare source and output CRS.

### Dubai Phase B envelope

Master QA envelope:

```text
longitude: 54.90 to 55.60
latitude: 24.75 to 25.40
```

This is a QA envelope, not an official Dubai boundary.

A feature outside the envelope is rejected unless the dataset manifest explicitly declares an approved adjacent-area exception.

### Metric operations

- Areas, lengths, buffers and distances use EPSG:32640.
- Web Mercator must not be used for authoritative metric calculation.
- Degree-based area estimates are prohibited in the Phase B builder.

## Geometry validity

### Points

Required:

- exactly two finite coordinates;
- coordinate envelope valid;
- no `[0, 0]` placeholder;
- no duplicate point for the same source ID unless aliases/versions explain it.

### Lines

Required:

- at least two distinct coordinates;
- non-zero length;
- no empty part;
- no consecutive duplicate vertices after normalization;
- no unrealistic jump between non-adjacent network segments without a documented reason.

### Polygons

Required:

- exterior ring has at least four coordinates including closure;
- first and last coordinate are equal after normalization;
- non-zero area;
- valid topology after deterministic repair;
- no self-intersection;
- no empty rings;
- no duplicate consecutive vertices;
- centroid or point-on-surface can be calculated;
- polygon does not collapse under the approved simplification tolerance.

MultiPolygon support may be added in Phase B only if the canonical contract and renderer are updated deliberately. It must not be flattened incorrectly into one ring.

## Ring orientation

Normalize for deterministic output:

- exterior rings: counter-clockwise;
- interior rings: clockwise.

Orientation normalization changes the normalized checksum but must preserve the source checksum and lineage step.

## Repair policy

Allowed deterministic repairs:

- close a nearly closed ring when the endpoint difference is within a recorded tolerance;
- remove consecutive duplicate vertices;
- normalize orientation;
- run `make_valid` or equivalent;
- extract polygonal parts from a repaired collection when the method is documented;
- remove zero-area slivers below an approved threshold.

Blocked repairs:

- manually moving vertices to “look right”;
- silently deleting a major polygon part;
- converting a line or point into an area without an approved derived methodology;
- filling missing source geometry with a hand-drawn polygon and keeping `geometryOrigin=source`.

Every repaired feature receives:

```text
geometryChangedByRepair = true
geometryAccuracy <= source_generalized
lineage operation = geometry_repair
```

## Area and length plausibility

Initial thresholds are review aids, not universal truth.

| Geometry role | Warning threshold | Error threshold |
| --- | --- | --- |
| Building footprint | `< 10 m²` or `> 500,000 m²` | `<= 0 m²` |
| Selected single-building AOI | `< 20 m²` or `> 1,000,000 m²` | `<= 0 m²` |
| Block/community context | `< 1,000 m²` or `> 500 km²` | `<= 0 m²` |
| Derived screening zone | `< 1,000 m²` or `> master AOI` | `<= 0 m²` |
| Primary road/rail segment | `< 10 m` or `> 150 km` | `<= 0 m` |

Threshold warnings require layer-specific review; they do not automatically assert that a source object is wrong.

## Centroid and selection-point policy

Store both where applicable:

- geometric centroid for analytics;
- point-on-surface for map selection and labels.

For concave/coastal polygons, map markers must use point-on-surface when the centroid falls outside the geometry.

## Simplification QA

For each simplified layer record:

- algorithm;
- topology-preserving flag;
- tolerance in metres;
- vertex count before/after;
- area change percentage;
- Hausdorff distance or another approved displacement metric for selected critical features.

Release thresholds:

- selected AOI area change: target `< 0.5%`, hard maximum `1%`;
- context polygon area change: target `< 1%`, hard maximum `3%`;
- no topology break;
- no selected feature disappears at the minimum supported zoom;
- no visible road/building/coastline misalignment at reviewed zooms.

## Overlap and duplication policies

### Source duplicates

Potential duplicates across OSM and Overture are not automatically merged.

A candidate match may use:

- source cross-reference supplied by provider;
- stable GERS/OSM alias;
- geometry overlap and centroid proximity;
- name/category similarity as supporting evidence only.

Final merge rules must be deterministic and store every source alias. Name-only fuzzy matching is not sufficient.

### Building overlap

Within one retained building dataset:

- exact duplicate geometry: reject duplicate;
- >95% overlap with same source identity: keep one canonical feature;
- substantial unexplained overlap: warning and manual review;
- valid nested structures: retain only if source semantics explain them.

### Selected AOIs

An AOI may overlap buildings/land-use because it has a different role. The UI and lineage must distinguish the roles.

## Source alignment review

For each focused AOI, visual QA overlays normalized geometry on the approved basemap/open-source context at:

- overview zoom;
- district zoom;
- object/building zoom.

Review examples:

- Marina/JBR coast and street alignment;
- Business Bay canal, road and building alignment;
- Dubai South airport/logistics context;
- Creek/DXB water, airport and road context.

`sourceAlignmentReviewed=true` requires:

- screenshot evidence;
- reviewer name or automation ID;
- tested dataset version;
- basemap/style and timestamp;
- issue disposition.

It does not mean official validation.

## Derived layer QA

Every derived layer additionally requires:

- method/version;
- input dataset versions;
- CRS and resolution;
- threshold parameters;
- uncertainty statement;
- temporal validity;
- reproducibility test;
- sensitivity or threshold review;
- no official/hazard wording.

## Quality report structure

```json
{
  "datasetId": "dubai-open-context-buildings",
  "datasetVersion": "2026-07-13.v1",
  "featureCountInput": 1000,
  "featureCountOutput": 980,
  "errorCount": 0,
  "warningCount": 23,
  "rejectedFeatureCount": 20,
  "geometryChangedByRepairCount": 7,
  "checks": {
    "schema": "pass",
    "coordinateRange": "pass",
    "topology": "pass",
    "sourceAlignment": "review"
  },
  "issuesByCode": {},
  "outputChecksum": "sha256:<value>"
}
```

## Automated test requirements

The Phase B repository must contain a command similar to:

```bash
npm run spatial:validate
```

It must fail on:

- invalid JSON/GeoJSON;
- missing manifest fields;
- duplicate stable keys;
- unsupported geometry;
- non-finite coordinates;
- invalid coordinate order/envelope;
- unclosed ring;
- self-intersection after repair;
- empty/collapsed geometry;
- missing attribution or licence;
- missing lineage;
- forbidden `official_*` status without evidence.

## Product regression checks

At minimum:

- every visible layer has a valid source;
- click/hover selection resolves to one stable feature;
- map does not select hidden or rejected geometry;
- dashboard coordinates and area match the selected normalized feature;
- comparison uses stable keys, not array position;
- report/export contains the same geometry/source version;
- map snapshot attribution remains visible or is included in the report lineage;
- no horizontal overflow or major map performance regression.

## Manual review checklist

- [ ] Geometry resembles the real feature visible in open basemap/source context.
- [ ] Boundary role is understandable and honestly named.
- [ ] No object is described as parcel/zoning/community/hazard official evidence.
- [ ] Source, date/release and attribution are visible.
- [ ] Selected AOI marker lies inside the geometry.
- [ ] Area and coordinates are plausible.
- [ ] Simplification did not create visible detachment from roads/coast/buildings.
- [ ] Report and dashboard use the same stable feature/version.

## Required caveat

**Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.**