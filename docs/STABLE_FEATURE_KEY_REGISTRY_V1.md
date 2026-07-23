# Stable Feature Key Registry v1

## Document control

| Field | Value |
| --- | --- |
| Workstream | Agent C — spatial data architecture |
| Change request | CR-DEV6-010 |
| Status | Required Phase B identity contract |
| Scope | Stable GeoAI identity across synthetic, open, customer, licensed and official source versions |

## Purpose

A source feature ID is not a durable GeoAI business identity. OSM IDs, Overture IDs, customer IDs and official-provider IDs may change, split, merge or be unavailable. GeoAI therefore controls a stable `featureKey` and stores provider IDs as source aliases.

The key identifies the intended real-world or analytical entity. Dataset versions identify how that entity was represented at a point in time.

## Key format

```text
geoai:<entity-class>:<jurisdiction>:<canonical-slug>
```

### Entity classes

| Class | Use |
| --- | --- |
| `area` | Open-context community, district, market or development area |
| `asset` | Real-world asset/building/complex identity |
| `aoi` | GeoAI or user-defined screening AOI |
| `corridor` | Road, rail or derived access corridor |
| `anchor` | Airport, port, station, landmark or activity node |
| `construction` | Construction monitoring target |
| `exposure` | Derived environmental screening area |
| `observation` | EO or inspection observation footprint |

### Jurisdiction

For Dubai Phase B:

```text
ae-du
```

Use ISO-like lowercase codes controlled by GeoAI. Jurisdiction is a naming namespace, not proof that a feature is an official administrative object.

### Canonical slug

Rules:

- lowercase ASCII;
- hyphen-separated;
- stable business meaning;
- no source/provider name;
- no snapshot date;
- no validation claim such as `official`;
- no unstable metric such as `high-value` or `top-score`;
- avoid `parcel`, `zoning` or `cadastral` unless the entity is explicitly governed for that scope.

Examples:

```text
geoai:area:ae-du:dubai-marina-jbr-context
geoai:area:ae-du:business-bay-context
geoai:area:ae-du:dubai-south-development-context
geoai:anchor:ae-du:dxb-airport
geoai:anchor:ae-du:jebel-ali-port
geoai:aoi:ae-du:marina-waterfront-sample-01
geoai:construction:ae-du:creek-open-monitoring-target-01
geoai:exposure:ae-du:marina-derived-coastal-01
```

## Registry record

```ts
export type StableFeatureRegistryRecord = {
  featureKey: string;
  canonicalName: string;
  entityClass:
    | "area"
    | "asset"
    | "aoi"
    | "corridor"
    | "anchor"
    | "construction"
    | "exposure"
    | "observation";
  jurisdiction: string;
  identityStatus: "active" | "provisional" | "split" | "merged" | "retired";
  identityBasis:
    | "named_real_world_entity"
    | "source_entity_crosswalk"
    | "geoai_defined_aoi"
    | "derived_screening_entity"
    | "customer_entity";
  sourceAliases: Array<{
    sourceId: string;
    sourceFeatureId: string;
    datasetVersion: string;
    validFrom: string | null;
    validTo: string | null;
    matchMethod: "provider_crosswalk" | "exact_id" | "manual_review" | "deterministic_spatial_match";
    confidence: "low" | "medium" | "high";
  }>;
  predecessorFeatureKeys: string[];
  successorFeatureKeys: string[];
  limitations: string[];
  createdAt: string;
  updatedAt: string;
  reviewedBy: string | null;
  reviewStatus: "draft" | "reviewed" | "approved";
};
```

## Identity assignment rules

### Named real-world entities

Airports, ports, major landmarks and named complexes can receive stable keys when identity is unambiguous.

Example:

```text
geoai:anchor:ae-du:dxb-airport
```

Source aliases may include OSM, Overture, customer or official IDs.

### Context areas

An area key represents GeoAI's logical context entity, not an assertion that all sources share the same boundary.

Example:

```text
geoai:area:ae-du:dubai-marina-jbr-context
```

Different dataset versions may attach:

- Overture division geometry;
- OSM place/boundary geometry;
- a deterministic open-context union;
- a future authorized Municipality boundary.

The geometry version and validation status must make the difference visible.

### Derived screening entities

A derived entity receives a stable key only when the method defines a repeatable analytical object rather than one arbitrary output polygon.

Example:

```text
geoai:exposure:ae-du:marina-derived-coastal-01
```

If threshold changes materially alter interpretation, create a new feature key or clearly version the derived entity according to the methodology decision log.

### Selected AOIs

A GeoAI-defined sample AOI has its own identity and may reference source features in lineage.

```text
geoai:aoi:ae-du:marina-waterfront-sample-01
```

It must not inherit a building or parcel identity if it is a union, buffer or analyst-defined area.

### Customer entities

A customer asset receives a stable GeoAI feature key scoped by organization/project. The public/demo registry must not expose confidential customer identifiers.

Recommended private key namespace:

```text
geoai:asset:<organization-key>:<customer-entity-key>
```

## Matching and crosswalk policy

### Accepted match methods

1. Provider-supplied crosswalk/GERS reference.
2. Exact known provider ID retained across releases.
3. Manual reviewed crosswalk.
4. Deterministic spatial match using documented thresholds.

### Deterministic spatial match

May use:

- intersection-over-union;
- centroid distance;
- area ratio;
- geometry Hausdorff distance;
- normalized name/category as supporting evidence.

Name similarity alone is never sufficient.

Recommended building match baseline:

```text
IoU >= 0.80
centroid distance <= 10 m
area ratio between 0.70 and 1.30
```

Thresholds are layer-specific and must be tested on Dubai samples before approval.

## Change events

### Geometry refresh

Same entity, new source geometry:

- retain `featureKey`;
- create new dataset version;
- append source alias/version;
- record geometry replacement lineage;
- preserve old version for comparison/rollback.

### Split

One prior context entity becomes multiple materially distinct entities:

- mark predecessor `split`;
- create successor keys;
- populate predecessor/successor links;
- never silently reuse one key for all parts.

### Merge

Multiple prior entities become one:

- mark prior keys `merged`;
- create or select one successor key after review;
- preserve history.

### Retirement

Use when entity is no longer active or a mistaken identity was removed. Historical reports retain the version they referenced.

## Initial migration mapping

The following is a proposed compatibility mapping from current synthetic IDs. It does not approve current geometry.

| Current synthetic ID | Proposed stable feature key | Identity basis | Phase B action |
| --- | --- | --- | --- |
| `premium-marina` | `geoai:area:ae-du:dubai-marina-jbr-context` | GeoAI context entity | Replace polygon with reviewed open-context geometry |
| `premium-downtown-bay` | `geoai:area:ae-du:downtown-business-bay-context` | GeoAI context entity | Split if Downtown and Business Bay require distinct Product entities |
| `premium-palm-coastal` | `geoai:area:ae-du:palm-coastal-context` | GeoAI context entity | Replace with open place/land-use/coastal context |
| `dev-dubai-south` | `geoai:area:ae-du:dubai-south-development-context` | GeoAI context entity | Build from open land-use/construction/activity features |
| `dev-meydan-mbr` | `geoai:area:ae-du:meydan-mbr-development-context` | GeoAI context entity | Replace with open context and review naming |
| `dev-jvc-jvt` | `geoai:area:ae-du:jvc-jvt-development-context` | GeoAI context entity | Replace with open context and review whether split is needed |
| `asset-marina-waterfront` | `geoai:aoi:ae-du:marina-waterfront-sample-01` | GeoAI-defined AOI | Rebuild from real footprints/block; never call parcel |
| `asset-business-bay-block` | `geoai:aoi:ae-du:business-bay-sample-01` | GeoAI-defined AOI | Rebuild from real footprints/block |
| `infra-dxb` | `geoai:anchor:ae-du:dxb-airport` | Named real-world entity | Add OSM/Overture aliases |
| `infra-al-maktoum` | `geoai:anchor:ae-du:al-maktoum-airport` | Named real-world entity | Add OSM/Overture aliases |
| `infra-jebel-ali` | `geoai:anchor:ae-du:jebel-ali-port` | Named real-world entity | Add OSM/Overture aliases |
| `infra-marina-mobility` | `geoai:anchor:ae-du:dubai-marina-jbr-activity` | GeoAI context anchor | Select transparent open POI/transport basis |
| `construct-creek` | `geoai:construction:ae-du:creek-open-monitoring-target-01` | Provisional monitoring target | Replace with real open construction footprint or retire |
| `construct-south` | `geoai:construction:ae-du:dubai-south-open-monitoring-target-01` | Provisional monitoring target | Replace with real open construction footprint or retire |
| `risk-coastal-marina` | `geoai:exposure:ae-du:marina-derived-coastal-01` | Derived screening entity | Recreate only after methodology approval |
| `heat-inland-core` | `geoai:exposure:ae-du:inland-derived-heat-01` | Derived screening entity | Recreate only after methodology approval |

## Report and project references

Saved analyses, comparisons and reports must reference:

```ts
{
  featureKey: string;
  datasetId: string;
  datasetVersion: string;
  geometryChecksum: string;
}
```

This prevents a report from silently changing when the current map dataset refreshes.

## API behavior

Product APIs may resolve the latest eligible version for a new analysis, but saved records remain pinned to their original version unless an explicit revalidation/re-run occurs.

Recommended resolver:

```ts
resolveSpatialFeature({
  featureKey,
  requestedVersion,
  allowedSourceModes,
  requiredValidationStatus
})
```

## Registry QA

Automated checks must fail on:

- duplicate feature keys;
- invalid format;
- provider/source name embedded in canonical key;
- dates embedded in canonical key;
- `official` wording without approved validation scope;
- alias collision where one provider ID maps to multiple active keys without a split/merge record;
- active key with no current dataset representation and no documented fallback;
- report reference to unknown dataset version.

## Governance

Creating, splitting, merging or retiring a stable key is a controlled data-governance change. Phase B may add new provisional keys, but promotion to approved requires source and Product review.

## Required caveat

**Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.**