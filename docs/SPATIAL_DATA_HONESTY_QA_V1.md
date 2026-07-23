# Spatial Data Honesty, Attribution and Product QA v1

## Document control

| Field | Value |
| --- | --- |
| Workstream | Agent E — Product and data-honesty QA |
| Change request | CR-DEV6-010 |
| Status | Required release gate for Phase B and later adapters |
| Product scope | Map, selection, dashboard, comparison, reports, exports and Project Hub lineage |

## Objective

Ensure that realistic-looking geometry increases demo credibility without creating false official, legal, planning, ownership, valuation, hazard or freshness claims.

A layer passes only when the map looks realistic **and** the user can understand where the geometry came from, when it was observed, how it was transformed, what it can support and what still requires validation.

## Canonical Product states

| Validation status | Required visible label | Allowed statement | Prohibited implication |
| --- | --- | --- | --- |
| `open_context` | Open-context geometry | Open source context follows mapped real-world features | Official boundary or verified legal status |
| `derived_screening` | Derived screening zone | Reproducible screening method indicates relative context | Certified hazard, approved zone or guaranteed outcome |
| `user_unvalidated` | User-provided; validation required | Supplied by user/client and not yet reviewed | Client or official validation |
| `client_validated` | Client-validated evidence | Reviewed by the named client for the stated scope | Authority approval or legal conclusion |
| `official_validated` | Officially validated for the stated source/scope | Exact provider/source/date/scope attached | Universal official truth outside the recorded scope |
| synthetic fallback | Synthetic fallback | Demo continuity only | Real-world boundary |

## Required compact source label

Every selected feature must expose a compact label containing at least:

```text
<validation label> · <source name> · <snapshot/release date>
```

Examples:

```text
Open-context geometry · OSM/Geofabrik · 2026-07-12 snapshot
Open-context building footprint · Overture · release 2026-06-17.0
Derived screening zone · Copernicus DEM method v1 · product date displayed
Synthetic fallback · GeoAI demo seed · not source-backed
```

If the date/release is unknown, display `date unknown`; never display `current`.

## Attribution rules

### Map

The map must include compact attribution for every visible open layer. Where source combinations are used, attribution must include all required parties and a link or disclosure to the full licence list.

Minimum examples:

- `© OpenStreetMap contributors`;
- `Overture Maps Foundation` plus release-specific source attribution;
- ESA WorldCover attribution with product year;
- Copernicus/ESA attribution for derived Sentinel evidence.

### Reports and static map snapshots

Printable outputs must include attribution in one of:

- map caption;
- source lineage section;
- footer/appendix.

The attribution must survive physical PDF generation.

### Exports

GeoJSON/JSON exports include:

- dataset ID/version;
- source ID/release;
- attribution;
- licence ID/URL;
- caveat;
- geometry validation status.

## Freshness rules

A Product surface may display `current` only when:

- an explicit observation/snapshot date exists;
- the layer freshness policy considers it current;
- current applies to the stated data product, not the underlying real-world legal condition.

Required display patterns:

```text
Snapshot: 2026-07-12
Observed: 2026-06-15
Product: WorldCover 2021 v200
Forecast valid: 2026-07-13T12:00Z
Aging open-context geometry
Stale metric — refresh required
```

Never combine a recent metric date with an old geometry date into one misleading `Updated` timestamp.

## Geometry-role rules

| Geometry role | User-facing terminology |
| --- | --- |
| `context_boundary` | Open-context area boundary |
| `screening_zone` | Derived screening zone |
| `asset_footprint` | Open-context asset/building footprint |
| `aoi` | Screening AOI |
| `corridor` | Open transport/access context |
| `anchor` | Open spatial anchor |
| `observation_footprint` | Dated observation footprint |

Forbidden substitutions without official evidence:

- parcel;
- cadastral plot;
- zoning district;
- official community boundary;
- legal asset boundary;
- flood zone;
- approved project site.

## Surface traceability matrix

| Field | Map selection | Dashboard | Comparison | Report | Export |
| --- | --- | --- | --- | --- | --- |
| `featureKey` | Internal + evidence details | Internal | Internal | Pinned metadata | Required |
| Name/category | Visible | Visible | Visible | Visible | Required |
| Dataset ID/version | Evidence disclosure | Source/evidence area | Comparison source detail | Source lineage | Required |
| Source/release/date | Compact label | Source basis | Per-option/summary | Source lineage/map caption | Required |
| Geometry role/status | Visible | Visible summary | Visible where material | Source lineage | Required |
| Area/centroid | Visible when relevant | Same normalized values | Same normalized values | Same values | Required |
| Metric period/source | n/a or details | Visible near metrics | Visible in comparison source | Source lineage | Required |
| Attribution | Map control | Evidence disclosure | Evidence disclosure | Map/appendix | Required |
| Caveat | Compact persistent | Visible | Visible | Visible | Required |

A release fails if the same selected object resolves to different dataset versions or geometry values across these surfaces.

## Data-honesty text scan

Executable Product code, fixtures and generated evidence must fail on unsupported affirmative claims including:

- official parcel;
- official zoning;
- cadastral validation;
- ownership verification;
- certified valuation;
- approved site;
- guaranteed best use;
- live DLD integration;
- live GeoDubai integration;
- verified community boundary;
- certified flood zone;
- decision-grade geometry;
- pilot-ready;
- production-ready.

Historical/rejection documentation may mention the terms only in explicit before-state or prohibition context.

Required caveat:

```text
Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.
```

## Layer-specific QA

### Community / area context

- [ ] Boundary aligns recognizably with open source context.
- [ ] Label says open context, not official community.
- [ ] Source/release/date visible.
- [ ] Any cross-source union is marked derived.
- [ ] No area metric implies legal size/entitlement.

### Market signal areas

- [ ] Geometry and market metric periods are separate.
- [ ] Sample/manual market metrics remain labelled.
- [ ] Geometry realism does not promote metric confidence.
- [ ] Report states metric source and period.

### Selected AOIs

- [ ] AOI is based on a real footprint/block or transparent derived operation.
- [ ] AOI is not called parcel/plot.
- [ ] Point-on-surface and area are plausible.
- [ ] Map and report show the same AOI/version.

### Transport

- [ ] Lines follow real open transport geometry.
- [ ] No official alignment claim.
- [ ] Attribution visible.
- [ ] Network density does not overwhelm Product performance.

### Environmental derived layers

- [ ] Method/version visible.
- [ ] Source product/acquisition date visible.
- [ ] Relative/proxy language used.
- [ ] No engineering/certified hazard language.
- [ ] Sensitivity and limitations recorded.

### Construction

- [ ] Target uses a real open/customer footprint or explicit derived AOI.
- [ ] Observation date and source are visible.
- [ ] No certified progress/delay claim.
- [ ] No-data and no-change are distinguishable.

## Stable identity QA

Automated assertions:

- every feature has one valid stable `featureKey`;
- no duplicate active key;
- no provider ID used as Product key without mapping;
- source alias collision is resolved;
- saved report references a known dataset version and geometry checksum;
- source refresh does not mutate a prior version;
- synthetic current IDs have documented migration mappings.

## Attribution and licence QA

A dataset is blocked when:

- attribution is blank;
- licence is unknown;
- OSM/Overture adapted-database review is pending for a public redistribution candidate;
- Overture release/source attribution is not generated;
- WorldCover year attribution is missing;
- Open-Meteo commercial-use state is unresolved for a commercial runtime;
- DLD/Dubai Pulse usage/redistribution terms are not captured;
- a protected source was traced/copied.

## Browser evidence contract

### Required viewports

- 390×844;
- 430×932;
- 768×1024;
- 1366×768;
- 1440×900.

### Required focus locations

- Dubai Marina / JBR / Palm context;
- Downtown / Business Bay / Meydan;
- Dubai South / Jebel Ali;
- Creek / DXB.

### Evidence states

1. All Phase B layers off except basemap.
2. Community/context layer on.
3. Buildings/land-use and transport on.
4. Selected AOI highlighted.
5. Source lineage/details open.
6. Dashboard generated for selected AOI.
7. Comparison containing at least two open-context objects.
8. Printable report with map snapshot and source attribution.

### Hard visual assertions

- recognizable alignment with source/basemap roads, buildings, coastline or land-use;
- no arbitrary hexagon/rectangle presented as area boundary;
- no major geometry detached from the real mapped object;
- no horizontal overflow;
- map remains usable at all viewports;
- layer controls and attribution are readable;
- selected object remains visible behind popover/panel;
- labels do not overlap excessively;
- no source/date text clipping;
- existing Workspace Custom Query and CTA behavior is preserved.

### Evidence provenance

Artifact metadata must state:

- exact commit SHA;
- exact dataset versions/checksums;
- local exact-head build or exact Vercel deployment URL;
- map style and source attribution;
- screenshot viewport;
- browser/renderer version;
- capture time.

Do not call a local-browser artifact a Vercel Preview capture.

## Map performance gate

Measure at all approved viewports:

- initial map interactive time;
- source/layer load time;
- feature count by visible layer;
- main-thread long tasks;
- map pan/zoom responsiveness;
- memory and console errors;
- snapshot capture success.

Initial acceptance:

- no fatal/runtime console errors;
- no browser freeze;
- source loading bounded and logged;
- selected AOI response remains interactive;
- large building layers are zoom-gated, subsetted or tiled if raw GeoJSON fails performance.

## Dashboard and scoring QA

- Scores must not change merely because geometry source validation status changes unless the scoring model explicitly uses a changed metric.
- Area/coordinates use normalized source values.
- Source confidence and metric confidence remain distinct.
- `official_validated` geometry does not make demo/sample scores official.
- Ranking changes after metric refresh require a comparison evidence record.

## Report and PDF QA

Required assertions:

- exact `featureKey`, dataset version and geometry checksum pinned;
- map snapshot represents the selected object/version;
- map attribution and caveat visible;
- data source dates and metric periods visible;
- no stale current claim;
- no clipped source lineage;
- physical PDF page evidence passes blank/clipping/overlap/orphan checks;
- existing PR #61/#63 report contracts remain intact unless separately approved.

## Regression matrix

| Area | Must remain unchanged unless explicitly in scope |
| --- | --- |
| Workspace | Role/scenario flow, map-first/criteria-first, Custom Query, responsive CTA |
| Project Hub | Project filtering, analysis/report cards, Data Readiness order, runtime status contract |
| Dashboard | Score model, posture, rationale, source-backed labels |
| Reports | Current values, map snapshot flow, PDF pagination and connector wording |
| Runtime | Production remains demo_public / soft / local_fallback unless separately approved |
| Security | No Auth/RLS/Storage activation |

## Release evidence matrix

| Evidence | Required |
| --- | --- |
| Source/licence matrix | Yes |
| Snapshot manifests and checksums | Yes |
| Stable-key registry diff | Yes |
| Geometry quality report | Yes |
| Before/after map screenshots | Yes |
| Browser assertions | Yes |
| Dashboard/report parity JSON | Yes |
| Physical PDF evidence if report map/source changes | Yes |
| Data-honesty scan | Yes |
| Permanent Quality Gate | Yes |
| Vercel Preview and route smoke | Yes |
| Deployment-scoped logs | Yes |
| Founder visual approval | Yes |
| Separate merge approval | Yes |

## Stop conditions

Stop and do not open a merge review when:

- source rights are unclear;
- arbitrary hand-drawn geometry remains in a migrated approved layer;
- stable keys are not defined;
- topology errors remain;
- Product calls open geometry official;
- attribution is absent;
- map performance regresses materially;
- dashboard/report versions diverge;
- physical PDF evidence fails;
- current Production safety controls would need to change without approval.

## Required caveat

**Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.**