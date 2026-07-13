# Open-Context and Derived Layer Methodology v1

## Document control

| Field | Value |
| --- | --- |
| Workstream | Agent D — derived analytics methodology |
| Change request | CR-DEV6-010 |
| Status | Methodology baseline; no Product layer is approved by this document |
| Target phase | Phase C after Phase B open-geometry foundation |

## Purpose

Define reproducible methods for realistic environmental, development and construction screening layers. Every output is a screening hypothesis. A derived layer is not an official flood map, heat-risk boundary, approved development zone, construction progress certificate or engineering assessment.

## Common methodology contract

Every derived dataset must publish:

- method ID and version;
- input dataset IDs and versions;
- source acquisition/product dates;
- AOI and CRS;
- preprocessing steps;
- thresholds and model parameters;
- geometry derivation operations;
- output feature keys;
- confidence and validation status;
- sensitivity/uncertainty statement;
- refresh cadence and temporal validity;
- quality report and checksums;
- required Product label and prohibited claims.

Derived geometry uses:

```text
geometryOrigin = derived
geometryRole = screening_zone | observation_footprint
geometryAccuracy = derived
validationStatus = derived_screening
```

## Method D1 — Derived coastal and low-elevation exposure

### Decision use

Prioritize sites for specialist coastal, drainage, insurance or engineering review.

### Required label

```text
Derived coastal / low-elevation exposure
```

### Prohibited labels

- flood zone;
- official coastal hazard boundary;
- storm-surge map;
- insurance-grade hazard;
- safe or unsafe site.

### Inputs

| Input | Role |
| --- | --- |
| Open coastline and water context from OSM/Overture | Real-world shoreline/water context |
| Copernicus DEM 30 m, with product/tile/version pinned | Elevation screening baseline |
| WorldCover water/built-up classes or equivalent | Supporting context and mask |
| Selected asset/AOI geometry | Aggregation target |

### Preprocessing

1. Clip source data to approved AOI plus processing buffer.
2. Reproject to EPSG:32640 for metric operations.
3. Validate/repair coastline and water geometry.
4. Record DEM vertical reference and limitations.
5. Exclude nodata and document fill/interpolation, if any.
6. Generate distance-to-coast/water raster.
7. Retain source-resolution information; do not imply sub-pixel accuracy.

### Baseline screening classes

Initial research thresholds, subject to sensitivity review:

| Class | Elevation proxy | Distance context | Meaning |
| --- | --- | --- | --- |
| Higher screening attention | `<= 5 m` | within `1 km` of mapped coast/water | Low-elevation coastal context requiring specialist review |
| Medium screening attention | `5–10 m` | within `2 km` of mapped coast/water | Relative exposure context |
| Lower screening attention | `> 10 m` or farther away | n/a | Lower relative signal within this simple method, not absence of risk |

These thresholds do not model drainage, groundwater, waves, tides, surge, defenses, subsidence or future sea level.

### Vector output

- classify raster cells;
- remove isolated regions below a documented minimum area, e.g. 10,000 m²;
- polygonize and topology-repair;
- dissolve only within the same class;
- simplify with documented metre tolerance;
- retain class, input resolution and uncertainty metadata.

### Feature-level metric

For each selected AOI:

```text
low_elevation_share_pct
minimum_dem_m
median_dem_m
distance_to_mapped_coast_m
method_version
```

No metric is a legal or engineering conclusion.

### Uncertainty

Mandatory limitations:

- DEM resolution and vertical error;
- reclaimed/coastal land representation;
- shoreline currency and generalization;
- absence of drainage and protective infrastructure;
- no event probability or return period;
- no official flood model.

### Refresh

- refresh coastline/open geometry with Phase B snapshot cadence;
- pin DEM product version;
- rerun when selected AOI or method version changes;
- display product dates explicitly.

## Method D2 — Derived heat and vegetation screening

### Decision use

Prioritize urban-design, landscaping, cooling-load and resilience review.

### Required label

```text
Derived heat / vegetation screening zone
```

### Prohibited labels

- certified heat-risk boundary;
- engineering heat assessment;
- guaranteed cooling demand;
- current measured surface temperature unless a dated thermal product supports it.

### Inputs

| Input | Role |
| --- | --- |
| ESA WorldCover 2021 v200 built-up, tree, grass, cropland, bare and water classes | Dated 10 m land-cover baseline |
| Sentinel-2 L2A selected acquisitions | Dated NDVI/vegetation and built-up supporting indices |
| OSM/Overture building footprints and parks | Urban-form context |
| Open-Meteo or NASA POWER | Area-level meteorological/climate context, kept as metrics rather than geometry |
| Optional approved thermal source | Actual LST component only if product/method is documented |

WorldCover 2020 and 2021 must not be differenced as pure change because algorithm versions differ.

### Non-thermal proxy method

When no approved thermal LST product is used, calculate an `urban_heat_exposure_proxy`, not temperature:

```text
proxy =
  w1 * built_up_fraction
+ w2 * bare_fraction
+ w3 * building_density_normalized
- w4 * vegetation_fraction
- w5 * ndvi_normalized
- w6 * water_proximity_context
```

Initial weights must be documented and normalized to sum to 1 across positive/negative components. Recommended research starting point:

```text
built_up_fraction       0.30
bare_fraction           0.15
building_density        0.20
vegetation_fraction    -0.15
ndvi                    -0.15
water proximity        -0.05
```

Weights are provisional and require sensitivity testing.

### Spatial units

Prefer a regular analysis grid or real block/land-use units rather than hand-drawn polygons.

Suggested grid:

- 100 m for city overview;
- 25–50 m only in focused AOIs when source resolution and performance permit.

Derived zones result from contiguous percentile classes, not arbitrary drawing.

### Classes

Use relative local percentiles within the declared AOI:

- top 20%: higher screening attention;
- 60–80th percentile: medium-high;
- 40–60th: medium;
- below 40th: lower relative signal.

Never compare percentile labels across different AOIs or method versions without normalization evidence.

### Optional thermal method

If Landsat or Sentinel-3 thermal data is approved:

- record product/acquisition time;
- cloud/quality filter;
- atmospheric and emissivity method;
- output uncertainty;
- use seasonal composites rather than one scene where possible;
- label `Dated thermal screening context`.

### Feature-level metrics

- built-up fraction;
- vegetation fraction;
- water fraction;
- median NDVI and acquisition period;
- building footprint density;
- heat proxy percentile;
- weather/climate context with model and time.

### Refresh

- WorldCover remains a dated 2021 baseline;
- Sentinel indices use an approved seasonal acquisition window;
- weather/model context is timestamped independently;
- no generic `current heat` label.

## Method D3 — Derived development activity signal

### Decision use

Identify areas that may deserve further development-pipeline, infrastructure-capacity or market-supply review.

### Required label

```text
Derived development activity signal
```

### Prohibited labels

- approved development zone;
- zoning growth area;
- government pipeline;
- guaranteed future development;
- official project boundary.

### Inputs

- OSM `landuse=construction` and `building=construction`;
- reviewed Overture building/context features;
- open activity anchors and roads;
- selected recent EO observation/change metrics when approved;
- DLD project snapshot metrics only after separate dataset approval.

### Baseline feature signals

| Signal | Example metric |
| --- | --- |
| Open construction footprint | construction area and count |
| Building density change | derived observation between dated snapshots |
| Proximity to airport/port/primary transport | distance metric |
| Undeveloped/open land-use context | area share, with conservative interpretation |
| Open project/activity anchor | count/proximity |
| Market/project snapshot | separate metric observation, not geometry property |

### Clustering

Initial transparent approach:

1. Convert construction/open-activity features to weighted points or retained polygons.
2. Cluster within a documented radius, e.g. 250–500 m depending on scale.
3. Dissolve member geometries plus an explicitly recorded contextual buffer.
4. Clip to processing AOI.
5. Store member source IDs and weights.

A clustered output is `derived_screening`; it is not the boundary of a master plan or project.

### Score

```text
development_activity_score =
  normalized construction area
+ normalized construction count
+ transport/anchor accessibility
+ optional dated change signal
```

All components and weights are versioned. Market attractiveness must remain a separate decision model, not silently embedded in this geometry layer.

### Refresh

- open construction snapshot: monthly or quarterly review;
- EO change component: acquisition-cycle specific;
- DLD project metrics: snapshot period specific;
- mark stale after the declared maximum display age.

## Method D4 — Open/derived construction monitoring targets

### Decision use

Provide realistic demo targets for progress-monitoring and lender/developer evidence workflows.

### Required labels

```text
Open construction footprint
Derived observation footprint
Screening change indicator
```

### Prohibited labels

- official project-control record;
- certified percentage complete;
- verified construction delay;
- lender-certified progress;
- live developer integration.

### Target selection

A target must be based on:

- a real open construction polygon/footprint;
- a customer-provided boundary in a controlled project;
- or an explicitly derived AOI linked to source features.

A point with no real footprint is insufficient for the final Phase C target unless clearly labelled as an anchor-only context.

### Observation model

```ts
export type ConstructionObservation = {
  observationId: string;
  featureKey: string;
  observedAt: string;
  observationWindowStart: string | null;
  observationWindowEnd: string | null;
  sourceId: string;
  sourceProductIds: string[];
  methodVersion: string;
  indicators: Array<{
    metricId: string;
    value: number | string | null;
    unit: string | null;
    confidence: "low" | "medium" | "high";
  }>;
  validationStatus: "derived_screening" | "user_unvalidated" | "client_validated";
  caveat: string;
};
```

### Candidate indicators

- footprint appearance/change;
- built-up area proxy;
- radar backscatter change;
- vegetation/soil clearing proxy;
- visible material/roofing-class change where methodology permits;
- time since last usable acquisition;
- cloud/quality availability.

No indicator becomes `% complete` without a client-approved mapping and inspection evidence.

### Change detection QA

- use at least two dated observations;
- normalize spatial resolution and registration;
- record cloud/quality masks;
- define minimum detectable area;
- distinguish no-data from no-change;
- retain before/after evidence;
- test false positives on stable control areas.

### Refresh

- target registry: monthly review;
- EO observations: 10–30 day target depending on data availability;
- mark observation stale independently from geometry.

## Method D5 — Market signal areas on real geometry

Market signal areas are not created by drawing arbitrary premium polygons.

### Geometry

Use one of:

- reviewed open-context community/place geometry;
- real land-use/block geometry;
- deterministic union of real blocks/footprints;
- user/customer-defined AOI.

### Metrics

Join separately by `featureKey` and period:

- transactions;
- rents;
- price per square metre;
- project/pipeline counts;
- liquidity proxies;
- market confidence.

### Required label

```text
Open-context market area with dated screening metrics
```

When DLD/public metrics are not approved, use sample metrics and label them explicitly. Geometry realism does not make market values official.

## Method sensitivity and approval

Each method must include at least:

- baseline parameters;
- one lower and one higher threshold scenario;
- area/feature-count comparison;
- selected AOI visual comparison;
- ranking impact where the layer feeds scoring;
- reviewer decision.

A method is not Product-approved merely because it produces attractive polygons.

## Product rendering requirements

- Source/open geometry and derived zones use different legend labels and visual treatment.
- Selection card shows method version, source date and validation status.
- Derived zones should have lower opacity and/or patterned/dashed outline distinct from source footprints.
- Attribution and caveat remain accessible without overwhelming the map.
- Reports pin the exact dataset/method version.

## Release gates

Before any derived layer is merged:

1. Source/licence manifests pass.
2. Method document and parameters are approved.
3. Reproducibility test passes.
4. Topology and quality QA pass.
5. Selected AOI visual evidence is reviewed.
6. Sensitivity analysis is recorded.
7. Product labels and prohibited-claim scan pass.
8. Dashboard/report values are traceable to feature and observation versions.
9. No Production or pilot-ready claim is introduced.

## Required caveat

**Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.**