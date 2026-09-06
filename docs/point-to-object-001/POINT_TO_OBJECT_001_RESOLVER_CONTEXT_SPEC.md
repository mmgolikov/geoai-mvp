# POINT_TO_OBJECT_001 resolver and context specification

**Version:** 1.0.1
**Status:** Candidate; not Main-accepted and not route activation authority
**Runtime source:** one immutable, source-isolated OSM snapshot per enabled AOI
**Mandatory caveat:** Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.

## 1. Decision boundary

The resolver identifies an open-community map feature inside a frozen source snapshot. It does not identify an official parcel, cadastral unit, owner, permitted use, planning approval or value. The submitted point remains an immutable input distinct from the resolved feature.

The identity state, evidence quality, rights state, context completeness and execution state are separate dimensions. `insufficient_evidence` is not an identity result. A source, rights or system failure is a typed error and must never be relabelled `no_result`.

Mapbox is presentation only. The browser may submit a named WGS84 point and a server-issued candidate assertion, but it may not author source IDs, geometry, candidate sets, hashes, rights or evidence.

## 2. Point and coverage

- API input is `{ longitude, latitude }`, never an ambiguous coordinate array.
- Both values are finite and range-checked. Values are preserved exactly; any cache rounding is separately versioned.
- Source CRS is EPSG:4326.
- Each case manifest carries one exact rectangular coverage polygon and SHA-256. The bbox is an index prefilter and the exact polygon is tested with boundary-inclusive `covers` semantics.
- Complete feature geometry is retained even when it extends outside the query bbox. That does not extend the click-coverage claim.
- A query-selection bbox is not evidence of complete context at any radius. The current 300 m Dubai and 400 m Singapore values prove only that those circles fit geometrically inside their query bboxes; they do not prove that all intersecting source ways/relations or omitted predicates were returned. Context remains `partial/coverage_unknown` and cannot support an absence claim.

## 3. Deterministic identity resolver

Policy version: `resolver-policy-p2o-v1.0.1`.

1. Load and hash-check the manifest, privacy-minimized source snapshot, normalized features and bbox-grid index.
2. Require the per-operation rights decision to be `cleared`. All other rights states return a typed error with `identity_status=null`.
3. Test the raw point against the hashed coverage polygon. Outside returns `outside_coverage` without source fallback.
4. Use the grid index only as a bbox candidate prefilter. Run exact polygon/line topology against every prefetched feature and compare the result with the brute-force fixture oracle.
5. If a server-issued candidate assertion exists, reload it from the same snapshot, prove that it was in the prior candidate set and re-run the spatial relationship. A mismatch returns `ANCHOR_MISMATCH`.
6. For `building` intent, consider validated polygonal `building` candidates first, then polygonal `building_part`. `land_use` remains context and cannot resolve as a building. A validated parent may outrank its part. Without validated hierarchy, a credible parent/part overlap remains ambiguous.
7. Interior outranks boundary. One eligible boundary candidate may resolve with `BOUNDARY_CONTACT`; multiple eligible boundary candidates return `ambiguous`.
8. Two or more eligible candidates at the same priority return all exact sorted candidates and `ambiguous`. Never choose the smallest polygon, first Mapbox feature or highest undocumented score.
9. More than 20 eligible candidates returns `blocked/CANDIDATE_SET_OVERFLOW`. Truncating to 20 and resolving is prohibited.
10. No eligible object inside coverage returns `no_result` at the resolve stage. Successful clicked-point context may later produce the distinct final state `coordinate_context_only`.
11. Nearest geometry is disabled for building/land-use identity. It may be enabled for explicit `road` or `poi` intent only after a class-specific metric tolerance and gold fixtures are accepted.

The current UAE Museum of the Future interior fixture resolves only to OSM `way/1054289435`; the source carries conflicting `building=yes` and `building:part=yes`, so the card must show `SOURCE_CONFLICT`. The Singapore Marina Bay interior fixture is deliberately ambiguous because OSM `way/116800998` (SkyPark) and `way/116801004` (Tower 1) both cover the point.

## 4. Candidate-set hash

For each resolution, sort canonical candidate IDs by Unicode code unit, serialize the array with the profile canonical JSON subset, and hash the exact UTF-8 bytes with SHA-256. The selection receipt carries the candidate-set hash even for zero candidates. An ambiguity chooser can only assert an ID from this exact set and snapshot.

## 5. Context taxonomy

Mapping version: `geoai-p2o-osm-context-category-map/1.0.0`.

| Category | OSM predicate subset |
|---|---|
| `school` | `amenity=school` |
| `childcare` | `amenity=childcare|kindergarten` |
| `clinic` | `amenity=clinic|doctors` |
| `hospital` | `amenity=hospital` |
| `pharmacy` | `amenity=pharmacy` |
| `grocery` | `shop=convenience|greengrocer|grocery` |
| `supermarket` | `shop=supermarket` |
| `retail_anchor` | `shop=department_store|mall` or `amenity=marketplace` |
| `public_transport_stop` | `highway=bus_stop` or `public_transport=platform|stop_position` |
| `public_transport_station` | `railway=station|halt|tram_stop|subway_entrance` or `public_transport=station` |
| `major_road` | `highway=motorway|trunk|primary|secondary` |
| `park_green_space` | declared park/garden/nature-reserve, forest/recreation/grass or wood/grassland tags |

The acquisition query did not independently request `tourism`-only records. A tourism-only POI count is therefore not complete and no tourism absence claim is permitted.

Every category is `observed`, `not_observed_in_source_snapshot`, `coverage_unknown` or `source_unavailable`. `observed_count=0` means only that the named source snapshot returned no mapped record inside the declared source window.

## 6. Distance calculation

All distance receipts include origin/destination IDs and geometry hashes, method, CRS/ellipsoid, library and version, unit, snapshot IDs, calculation timestamp and `graph_version=null`.

- Dubai projected point/line/polygon operations: transform validated geometries from EPSG:4326 to EPSG:32640, then use 2D `ST_Distance` in metres.
- Singapore projected point/line/polygon operations: transform to EPSG:32648, then use 2D `ST_Distance` in metres.
- Point-to-point geodesic output: use a named WGS84 ellipsoidal method and record the implementation/version. A spherical shortcut must carry a distinct method name and cannot silently substitute.
- A centroid fallback is `CENTROID_FALLBACK`, visibly labelled, and never called entrance, walking, driving, transit or service distance.
- Routing, travel time, isochrones, barriers, opening status, capacity and service quality are excluded.

The previous generic tolerance `max(5 m, 1%)` is rejected. Each operation/range needs an independently frozen absolute and relative tolerance. Acceptance additionally requires zero nearest-order inversions between the primary and independent implementations.

## 7. Absence receipt

Every zero category produces a receipt containing query/hash, category, radius, source snapshot/hash, query time, returned count, coverage state, evidence IDs and the exact fields:

```json
{
  "absenceSemantics": "no_records_returned_only",
  "supportsAbsenceConclusion": false
}
```

All current case-pack category completeness is `coverage_unknown`, including within the geometrically contained 300 m/400 m circles. The category is never promoted to `not_observed_in_source_snapshot` as a real-world absence claim.

## 8. Geometry and hierarchy quality

The local normalizer checks coordinate range, ring closure, consecutive duplicates, zero area, ring self-intersection and basic hole containment after seven-decimal normalization. It records source relation memberships with explicit retained/rejected parent state and exposes tag/classification conflicts. OSM `type=building` relations are quarantined because outline members require explicit union semantics; non-polygon `building=*` records are context-only. The local screen is not a substitute for full GEOS/PostGIS validity across every identity-eligible feature or semantic building parent/part adjudication.

All 433 identity-eligible polygon/multipolygon records pass a rollback-only PostGIS/GEOS gate on exact normalized hashes; two unsupported Singapore `type=building` relations are quarantined and one point `building=*` record is context-only. This closes the bounded identity-geometry gate, not the context-completeness, semantic hierarchy, production-scale or route-integration gates.

## 9. Index and query evidence

The file-backed index is a deterministic 0.001-degree bbox grid. It must have zero false negatives against brute force on all frozen fixtures; exact topology always follows. For a future PostGIS implementation, the hot path is:

```sql
SELECT source_feature_id
FROM geoai_p2o_private.features
WHERE snapshot_id = $1
  AND feature_class = ANY ($2)
  AND geom && ST_SetSRID(ST_Point($3, $4), 4326)
  AND ST_Covers(geom, ST_SetSRID(ST_Point($3, $4), 4326))
ORDER BY source_feature_id;
```

The geometry column needs GiST; snapshot/class/version needs a composite B-tree. A forced-index TEMP-table `EXPLAIN` proves operator/index compatibility only, not production latency or selectivity.

## 10. Storage decision

Use immutable file-backed case packs for this slice. No POINT_TO_OBJECT table or migration is justified yet. Current `geoai-dev` has migration-ledger drift, broad grants/permissive-policy findings and no accepted dynamic ingestion, tenant/customer-data or shared persistence need for this feature.

If those requirements appear later, use a private non-exposed schema, additive reversible migration, explicit minimum grants, RLS with negative personas, indexed policy columns, source-custody controls, rollback, advisors and exact post-change read-back. `service_role` is never end-user authorization.

## 11. Activation gates

- Internal deterministic tooling: allowed on exact hashes after validators pass.
- Runtime route integration: blocked pending Dev contract parity, implementation review and Main approval; the bounded identity-geometry and deterministic fixture gates pass.
- 800 m complete context/absence claims: blocked for current bboxes.
- External Preview: blocked pending visible OSM attribution/source offer, UI evidence parity and Main approval.
- OpenAI: optional later layer; no identity, GIS or canonical fact authority.
- Production, public REST/MCP and Supabase persistence: not authorized.
