# POINT_TO_OBJECT_001 Data / Geo decision

**Version:** 1.0.0
**Owner:** `data_geo_1`
**Status:** Candidate data lane; not Main-accepted route, Preview, Production or pilot authority
**Released baseline:** `7f323c4227f2409f3fe2d4d68be48a30176f4e2a`
**Supabase target:** `geoai-dev / pphdqkurxneyagvnnjdt / eu-west-1` (non-Production)
**Mandatory caveat:** Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.

## 1. Decision

`LIMITED / IMPLEMENTABLE AS A BOUNDED FILE-BACKED SLICE`.

The controlled UAE point-to-object identity path is data-feasible on one immutable, rights-reviewed OpenStreetMap snapshot, with a Singapore OpenStreetMap benchmark for contract portability. The exact identity geometry gate and ten deterministic safety fixtures pass. The slice may identify an open-community map building feature or return a bounded ambiguous/no-result/context-only state.

It may not identify an official parcel, cadastral unit, ownership record, zoning entitlement, planning approval, legal boundary or value. It may not claim complete 800 m context, real-world absence, live source integration, hosted source custody, pilot readiness or Production readiness.

## 2. What is frozen

- Request coordinates are named WGS84 longitude/latitude values; arrays and silent coordinate swapping are prohibited.
- Runtime identity source is one immutable, source-isolated OSM snapshot per enabled AOI. Mapbox is presentation only. Overture is offline evaluation only and has no active case pack in this package.
- Identity, evidence quality, context completeness, rights and execution are independent state dimensions.
- Exact building identity uses validated `Polygon`/`MultiPolygon` records classified `building` or `building_part`. A `land_use` polygon cannot become a building identity.
- Exact interior topology outranks boundary topology. Equal-priority overlaps return all sorted candidates and `ambiguous`; no hidden score or smallest-area tie-break is allowed.
- OSM `type=building` relations are quarantined until explicit outline-union semantics exist. A point or open way carrying `building=*` is context-only/ineligible for identity.
- A missing source record means only “not observed in this named snapshot/query”; it is not real-world absence.
- Every success envelope requires an exact source snapshot, file hashes, cleared per-operation rights, candidate-set hash and mandatory caveat.

The machine contract is [`POINT_TO_OBJECT_001_DATA_CONTRACT.json`](./POINT_TO_OBJECT_001_DATA_CONTRACT.json). The resolver and context rules are in [`POINT_TO_OBJECT_001_RESOLVER_CONTEXT_SPEC.md`](./POINT_TO_OBJECT_001_RESOLVER_CONTEXT_SPEC.md).

## 3. Frozen case packs

| Case | Role | Source | Retained raw state | Identity geometry | Expected anchor result | Context completeness |
|---|---|---|---|---|---|---|
| `P2O-UAE-DXB-MUSEUM-FUTURE-001` | UAE bounded runtime case | OSM base `2026-08-31T21:13:31Z` | Privacy-minimized source snapshot; exact acquired-byte hash retained; unminimized bytes deleted | 175/175 eligible polygons valid in rollback-only PostGIS | One source feature, with visible source-classification conflict | `UNKNOWN/PARTIAL`; 800 m fails |
| `P2O-SG-MARINA-BAY-001` | Singapore portability benchmark | OSM base `2026-08-31T21:13:31Z` | Privacy-minimized source snapshot; exact acquired-byte hash retained; unminimized bytes deleted | 258/258 eligible polygons valid after two unsupported building relations are quarantined | Two equal-priority features; deterministic `ambiguous` | `UNKNOWN/PARTIAL`; 800 m fails |

Both case packs are open-context evidence, not official government or client data. The Singapore case does not use or imply cadastral authority.

## 4. Source, rights and lineage status

| Source / layer | Current role | Rights state | Current evidence | Permitted claim | Blocked claim |
|---|---|---|---|---|---|
| OpenStreetMap / ODbL 1.0 | Frozen identity and context snapshots | `CLEARED` for the internal Preview experiment with attribution, share-alike/source-offer and source-isolation obligations | Exact query, headers, acquired-byte hash, privacy-minimized retained snapshot, normalization/index/manifests and frozen rights evidence | “Open community context observed in the named snapshot” | Official/live/complete/authoritative geometry or absence |
| Public Overpass instance | One-time bounded acquisition transport | Operator-recorded request; no runtime entitlement | HTTP response headers and exact response hash; request start/client version were not retained | Source transport provenance with explicit limitation | Runtime dependency, SLA or API entitlement |
| Overture Maps | Offline evaluation candidate only | Not evaluated for an active package | No snapshot acquired in this package | None in current result | Runtime evidence, conflation or redistribution |
| Mapbox | UI presentation only | Product/provider entitlement not established here | No evidentiary role | Basemap/presentation after Dev/provider gates | Identity, geometry authority or source replacement |
| Official parcel/cadastre/zoning/ownership/planning/valuation | Validation dependency | `NOT_EVALUATED/UNAVAILABLE` | No authorised source | “Official validation required” | Any conclusion or positive/negative assertion |

The OSM notice and source offer are physically hash-bound in each case manifest and the root data-pack manifest. Public visibility is not treated as reuse permission; the rights decision remains evidence-led and phase-specific, not legal advice.

## 5. Coverage and context limits

The query bboxes are selection windows, not completeness guarantees. Although a 300 m circle in Dubai and a 400 m circle in Singapore fit geometrically inside the respective bboxes, the `nwr` query does not prove that every intersecting way/relation was returned, and it does not separately request tourism-only objects. Therefore:

- every current context result is `partial/coverage_unknown`;
- an 800 m context request is incomplete in both packs;
- zero counts never support a real-world absence conclusion;
- routing, travel time, capacity, opening status and service quality are excluded;
- metric geometry operations use EPSG:32640 in Dubai and EPSG:32648 in Singapore, with method/version recorded.

## 6. Evaluation results

- Deterministic fixtures: `10/10 PASS`, zero false-confident identity and zero grid-index false negatives.
- Normalizer controls: one-outline and overlapping `type=building` relations reject; valid multipolygon remains accepted; non-polygon building records remain identity-ineligible; building intent cannot promote land use.
- Geometry: `433/433 PASS` for all identity-eligible polygons/multipolygons under PostGIS 3.3.7; exact UAE and Singapore candidate counts pass.
- Index: forced TEMP-table `EXPLAIN ANALYZE` uses each case's GiST index. This proves operator compatibility only, not production performance.
- Persistence: all PostGIS validation tables were temporary and rolled back; persistent P2O table count after tests is `0`.
- Statistical top-1 precision ≥98% and resolvable share ≥80% remain `NOT_EVALUATED`; no independently adjudicated cohort exists.

## 7. Hosted truth and storage decision

`geoai-dev` remains unsuitable for protected persistence: `DB-01`, `AUTH-01`, `STORAGE-01` and `SOURCE-01` are all `FAIL`; RLS authorization is a failing DB/security sub-gate. The hosted ledger contains 12 entries, including two untracked DLD migrations, while the released repository contains 18 migration files. Auth has zero users/sessions, Storage has no application object policies, and all ten legacy source metadata rows have zero records.

Accordingly, the smallest reversible implementation is an immutable file-backed data pack. No persistent schema, migration, grant, RLS policy, Auth object, Storage object or source-registry row was created. A future hosted model requires a separate accepted remediation package, recoverable migration, private non-exposed schema, explicit minimum grants, project/organisation-bound RLS with negative personas, GiST/B-tree evidence, custody controls, rollback and advisor read-back.

## 8. Route and model boundary

The data lane is ready for Dev contract consumption, not route activation. Dev must preserve exact hashes, state separation, source/rights labels, ambiguity, bounded missingness and visible attribution. A model may summarize an already validated bundle, but it cannot choose the object, score candidates, repair source conflicts, infer missing facts or author official/legal/planning/valuation claims.

Current gates:

- file-backed data pack: `CANDIDATE`;
- identity geometry: `PASS` for the 433 eligible polygon features;
- deterministic safety fixtures: `PASS 10/10`;
- context completeness: `FAIL/UNKNOWN`;
- route integration: `BLOCKED pending Dev parity and Main approval`;
- external Preview: `BLOCKED pending visible attribution/source offer, UI evidence parity and Main approval`;
- hosted persistence: `NOT REQUIRED / NOT CREATED`;
- Production: `PROHIBITED by current authority`.

## 9. Residual risks

1. OSM feature semantics and hierarchy are community-source observations, not official object identity.
2. The executed minimizer did not atomically bind the final rename/deletion; the receipts explicitly downgrade endpoint/User-Agent chronology to operator-recorded evidence and preserve the exact retained and deleted-byte hashes.
3. The deleted unminimized responses contained arbitrary public OSM tags and contributor metadata before minimization. No values were intentionally inspected, retained or committed; the event must remain disclosed.
4. Context category coverage and tourism-only coverage are incomplete.
5. Rights clearance is limited to the stated source-isolated internal Preview experiment and obligations; REST/MCP pass-through and third-party conflation are not evaluated.
6. No statistical accuracy cohort, customer case, official validation, WTP, proposal or paid pilot exists.

## 10. Recommended next action

Dev should implement the exact file-backed loader/resolver contract behind a disabled non-Production feature flag, preserve the immutable manifests and errors, render attribution/caveat/source-state visibly, and return independent contract-parity evidence to Main before any Preview gate is considered.
