# COMPLETE25 public object registry — 2026-09-25

Source-only preparation for the fresh acceptance matrix. **12 distinct public IDs: 9 Dubai + 3 Singapore. Not a product run, frozen evidence pack, lease, deployment or acceptance result.** Root must acquire every final binding on the frozen protected Preview, preserving its actual query, source/geometry/evidence hashes and acquisition time. Q/S/D must reuse the identical accepted snapshot and non-depth inputs.

Coordinates below are **longitude, latitude**. Except D05, they are the Nominatim returned representative point, not a surveyed centroid or proof of containment. D05 is the approximate center of its returned four-corner source polygon. Names, heights and levels are OSM assertions, not official validation. Missing tags remain unknown.

## Proposed exact bindings

| Slot | Exact ID and observed name | Anchor lon, lat | Current source function and geometry | Search/navigation string and caution | Receipts |
| --- | --- | --- | --- | --- | --- |
| D01 tower | [way/125848292](https://www.openstreetmap.org/way/125848292), Shangri La | `55.2719792,25.2081439` | `tourism=hotel`, `building=yes`, `height=200`, `building:levels=43`; closed Polygon, 11 ring positions | `Shangri La Dubai`; confirm exact ID, not a same-name POI | N01,O02 |
| D02 identity conflict | [way/393391115](https://www.openstreetmap.org/way/393391115) | `55.2836335,25.2175468` | **Source conflict:** `name=Jumeirah Emirates Office Tower` but `name:en=Jumeirah Emirates Towers Hotel`, `building=hotel`, `tourism=hotel`; source `height=355`, levels54. Closed Polygon, 5 positions | `Jumeirah Emirates Towers Hotel Dubai`; EN lookup returns hotel. Preserve the conflicting default name; do not certify either real-world identity | N01,O02 |
| D03 missing height | [way/1134679171](https://www.openstreetmap.org/way/1134679171), Emirates Tower Seaside Metro Bus Stop | `55.2782643,25.2169870` | `building=yes`, `layer=1`; no `height` or `building:levels` in exact way. Closed Polygon, 5 positions. **Not residential** | `Emirates Tower Seaside Metro Bus Stop Dubai`; name indicates bus-stop building/shelter; do not invent residential use or height | N01,O02 |
| D04 relation/holes | [relation/14604314](https://www.openstreetmap.org/relation/14604314), 25hours Hotel Dubai One Central | `55.2839807,25.2194839` | `type=multipolygon`, `tourism=hotel`, `building=yes`, levels9, height absent. Nominatim **Polygon with 1 outer +3 inner rings**, not GeoJSON MultiPolygon | `25hours Hotel Dubai One Central`; root must preserve all holes/member joins | N01,O03 |
| D05 construction | [way/1264541006](https://www.openstreetmap.org/way/1264541006), **unnamed** | `55.3590052,25.2067876` | Exact source `landuse=construction`; closed 4-corner Polygon. No building/name/height/levels tags | Navigate to `25.2067876,55.3590052`, then identify the exact way on map/eligible Find result. **Nominatim lookup omitted this ID**, so text search is not an established entry path | O01; omitted from N01 |
| D06 low-rise source candidate | [relation/1715611](https://www.openstreetmap.org/relation/1715611), Souk Al Bahar | `55.2770144,25.1947704` | `shop=mall`, `building=yes`, source height15m, levels5; `type=multipolygon`; Polygon with 1 outer +2 inner rings | **Observed search:** `Souk Al Bahar Dubai` returns this relation and a different restaurant node. Select relation1715611. “Low-rise” here means the test's explicit source screen ≤5 levels, not a statutory classification or residential use | N04,O03 |
| D07 point-only POI | [node/12736386141](https://www.openstreetmap.org/node/12736386141), Emirates Post | `55.2870471,25.2231392` | `amenity=post_office`, `level=0`; Point. No source footprint or building height | `Emirates Post Dubai World Trade Centre`; exact ID required among many branches. `level=0` is not building storey count or height | N01,O04 |
| D08 building-part | [way/1054289435](https://www.openstreetmap.org/way/1054289435), Museum Of The Future | `55.2818746,25.2191545` | `tourism=museum`, `building=yes`, **`building:part=yes`**, source height77; closed Polygon, 37 positions | `Museum Of The Future Dubai`; preserve selected-part scope, do not promote it into an official complete complex/parcel | N01,O02 |
| D09 boundary candidate | [way/797700047](https://www.openstreetmap.org/way/797700047), Dubai Hills Mall | `55.2399292,25.1016705` | `shop=mall`, `building=yes`; no height/levels; closed Polygon, 57 positions. Bounds cross standard XYZ grid lines at z14–17 | **Observed search:** `Dubai Hills Mall`. Source identity is verified; actual rendered clipping/boundary behavior is **not yet observed**. Root must test pan/zoom/basemap/2D–3D and exact footprint restore | N03,O02; calculation below |
| S10 tower | [way/116801004](https://www.openstreetmap.org/way/116801004), Marina Bay Sands Tower 1 | `103.8601657,1.2826456` | `building=hotel`, source height193, levels55; closed Polygon, 7 positions | `Marina Bay Sands Tower 1 Singapore`; not the full three-tower complex | N01,O02 |
| S11 residential | [way/116905045](https://www.openstreetmap.org/way/116905045), Marina Bay Residences | `103.8552073,1.2796949` | `building=residential`, source height245, levels54; closed Polygon, 8 positions | `Marina Bay Residences Singapore`; source function supports residential slot, not demand/title/tenure claims | N01,O02 |
| S12 sparse point POI | [node/10806670133](https://www.openstreetmap.org/node/10806670133), Cloud Forest, Flower Dome, OCBC Skywalk | `103.8654312,1.2838359` | **`shop=ticket`**, Point; no source footprint/height/levels | `Cloud Forest Flower Dome OCBC Skywalk Singapore`; select ticket node, not conservatory buildings or skywalk geometry | N01,O04 |

Search strings not explicitly labeled “observed search” are proposed human-readable inputs, not proof that current product autocomplete returns that exact ID. Exact ID checks are mandatory. Point-only means this record has only a point; it does not prove that no enclosing building exists in the world/map.

### Additional Singapore candidates — 25 September, 19:49 UTC

The original twelve entries above are preserved. The registry now offers fourteen distinct IDs (nine Dubai, five Singapore), not fourteen executed cases. Additional candidates allow twelve distinct Analyse subjects while the separate nine-Dubai diversity requirement must still be verified across Find and Analyse.

| Slot | Observed query / exact ID | Anchor lon, lat | Verified source scope |
| --- | --- | --- | --- |
| S13 community | `Tiong Bahru Community Centre Singapore` → [way/172242430](https://www.openstreetmap.org/way/172242430) | `103.8319218,1.2834878` | `amenity=community_centre`, `building=yes`; Polygon, one ring/seven positions. Height and levels unknown; not evidence of low-rise. Main OSM version7, source timestamp2026-05-06T02:52:41Z. |
| S14 public museum POI | `National Gallery Singapore` → [node/4759240362](https://www.openstreetmap.org/node/4759240362) | `103.8514709,1.2902557` | `tourism=museum`, `museum=art`, `operator:type=public`; Point, not a building footprint. Main OSM version18, source timestamp2025-12-15T09:41:01Z. |

All four responses HTTP200, no Overpass or paid call. S13 Nominatim received19:48:04.715Z,769bytes, rawSHA256 `fc73e9aa1efb7d38689868bbe5a08702ecdc74fe83936677a64f4d78e686089e`; exact mainOSM received19:48:56.111Z,821bytes, rawSHA256 `88d729cf6547996508cebac1b2e1a6da75e745cc22606de750220c6c40bf39e1`. S14 Nominatim received19:48:34.285Z,617bytes, rawSHA256 `25f56e240c180214b1232a2ca588872544f92c274568912b71a9caee35659008`; exact mainOSM received19:49:13.784Z,1335bytes, rawSHA256 `a14457cf1a218f52119cf3536c0b2ee5b0edbcc7a2410ee5b6f66bb1721e8f8b`. These are preparation metadata, not a product response, frozen snapshot, lease or acceptance result.

### Coverage that must not be silently closed

1. D02 is a **confirmed internal OSM tag conflict**, not yet evidence of a GeoAI model error. Source height355/levels54 also must not resolve that identity dispute by inference.
2. D04 and D06 test multipolygon **relations with holes**, not multiple disconnected outer polygons. A strict disjoint-MultiPolygon acceptance obligation remains unbound; do not claim these cover it.
3. D09 is geometrically eligible for a tile-boundary test, but no rendered tile clipping was observed in this source-only task. Eligibility is not PASS. Its missing source height must remain missing.
4. D05 exists in the main OSM API but was absent from the Nominatim lookup. Root needs a real product Find/map acquisition path; a forged selection or nearest-object substitution does not close it.
5. Twelve distinct public objects satisfy the proposed **registry count**, not the executed cross-journey diversity gate. Baseline A/FA mapping stays under the acceptance owner; no catalogue rows were edited here.

## D09 reproducible boundary preparation

N03 reports bbox `[west55.2370053,south25.0992473,east55.2423577,north25.1039505]`. For standard XYZ Web Mercator, `x=(lon+180)/360*2^z`, `y=(1-asinh(tan(lat*pi/180))/pi)/2*2^z`:

| z | x tile indices spanned | y tile indices spanned | Interior grid line(s) |
| --- | --- | --- | --- |
| 14 | 10705–10706 | 7011 | longitude55.2392578125 |
| 15 | 21411–21412 | 14022 | longitude55.2392578125 |
| 16 | 42823–42824 | 28044–28045 | longitude55.2392578125; latitude25.10052305746522 |
| 17 | 85647–85649 | 56088–56090 | longitudes55.2392578125 /55.24200439453125; latitudes25.103010240530725 /25.10052305746522 |

This is an offline calculation from observed bbox, not a statement about the actual provider's tile zoom, clipping, feature ID encoding, overzoom or rendering. Start near z16 and inspect both sides of the boundaries with source ID797700047; acquire trusted complete geometry separately.

## Public receipt metadata

All timestamps UTC, 2026-09-25. SHA-256 is over original HTTP response bytes, not the product semantic hash. Source usernames, user IDs, contact tags and unrelated source text are deliberately omitted. No raw response files are persisted by this one-document task. Response hashes are audit metadata, not self-contained replay fixtures.

| Receipt | Request | HTTP / acquiredAt / elapsed / bytes | Raw response SHA-256 |
| --- | --- | --- | --- |
| N01 | Nominatim lookup10 IDs, below | 200 /17:43:20.833Z /559ms /13971 | `99e33dc169177f3548ac1294414b3560246c73d5de835e022f637892be1c25a4` |
| N02 rejected low-rise candidate | Nominatim search `Jumeirah Mosque Dubai`, limit3 | 200 /17:43:54.800Z /551ms /2344 | `a7f95a58a937e5c3ffc9ddf184453a8864fd78d0cfd780d9d0298926bdae0418` |
| N03 | Nominatim search `Dubai Hills Mall`, limit3 | 200 /17:44:47.331Z /996ms /2639 | `2807a8f4517ea1ccd1d7a9235332c3057a64f81e8c49678eef82cf2e2487d89b` |
| N04 | Nominatim search `Souk Al Bahar Dubai`, limit3 | 200 /17:45:55.058Z /640ms /2965 | `0b1e546b4128b9e231c0daf2adb34caea6fe08f957e5e890635a2f05878b96bc` |
| O01 | `https://api.openstreetmap.org/api/0.6/way/1264541006/full.json` | 200 /17:44:52.026Z /484ms /1183 | `fd4a629d4e21c546e72d1e35edda824f566ada80afe8820d817b1ed06b2c60b9` |
| O02 | `https://api.openstreetmap.org/api/0.6/ways.json?ways=125848292,393391115,1134679171,1054289435,116801004,116905045,797700047` | 200 /17:46:50.075Z /542ms /6618 | `f42486dc2ec5aeb94257474ea58cb997aaa6360ea2711db563e2fe83442ed765` |
| O03 | `https://api.openstreetmap.org/api/0.6/relations.json?relations=14604314,1715611` | 200 /17:47:34.468Z /385ms /1723 | `a7de0b8061a69ef60c5a326253f2a4dcec5aeecc0b6e5727e61d99ae00586403` |
| O04 | `https://api.openstreetmap.org/api/0.6/nodes.json?nodes=12736386141,10806670133` | 200 /17:47:41.692Z /361ms /882 | `13d52c2e73f3c82b91ed452212fc792f38d871c72890774e32dd1b17db682ffa` |
| O05 rejected low-rise scan | `https://api.openstreetmap.org/api/0.6/map.json?bbox=55.267,25.233,55.269,25.235` | 200 /17:45:27.058Z /549ms /120238 | `e982a37fa0ee21ea857279079f6dafc08b84180d4e036f21be9c9ed90e439a0c` |

Nominatim base: `https://nominatim.openstreetmap.org/lookup` or `/search`. N01 parameters: `osm_ids=W125848292,W393391115,W1134679171,R14604314,W1264541006,N12736386141,W1054289435,W116801004,W116905045,N10806670133`, `format=jsonv2`, `extratags=1`, `namedetails=1`, `polygon_geojson=1`, `addressdetails=1`, `accept-language=en`. Searches use `q` exactly as recorded, `format=jsonv2`, `limit=3`, `extratags=1`, `polygon_geojson=1`, `countrycodes=ae`, `accept-language=en`. Requests were sequential with more than one second between Nominatim dispatches and identifying User-Agent `GeoAI-Prototype-Source-Verification/0.1 (+https://github.com/mmgolikov/geoai-mvp)`.

N02 returned site way217936544 and mosque building way217936504 without explicit height/levels; neither was accepted as proven low-rise. O05 was one small 0.002°×0.002° bbox (~200×220m), 646 elements/101 tagged buildings, not a city scan; no low-rise qualification was asserted from their small footprints. No contact/private account data were used.

### Source versions / edit timestamps

These are OSM record edit timestamps, **not real-world observation dates**.

| Slot | Version | OSM timestamp |
| --- | --- | --- |
| D01 |17|2026-06-25T17:40:42Z|
| D02 |13|2025-02-13T10:17:01Z|
| D03 |1|2023-01-24T02:15:03Z|
| D04 |5|2025-02-13T15:30:10Z|
| D05 |1|2024-03-20T15:05:00Z|
| D06 |9|2026-03-30T05:57:37Z|
| D07 |1|2025-04-07T10:57:46Z|
| D08 |12|2025-10-26T11:51:23Z|
| D09 |11|2025-03-20T09:37:20Z|
| S10 |25|2026-09-12T17:23:17Z|
| S11 |16|2026-09-12T17:23:17Z|
| S12 |2|2023-06-12T08:24:41Z|

D04 source members: outer1096488882; inner1096488883,1096488884,1096488885. D06: outer65460387; inner126601136,126601137. Nominatim's corresponding GeoJSON has four/three rings respectively. Do not confuse OSM relation tag `type=multipolygon` with a GeoJSON `MultiPolygon` containing multiple outer components.

D05 source ring: `[[55.3588473,25.2069402],[55.3591932,25.2068875],[55.3591462,25.2066256],[55.3588342,25.2066970],[55.3588473,25.2069402]]`.

### Overpass stopped after two failed attempts

Both requests used exact10 IDs only, no area scan, query `[out:json][timeout:8][maxsize:2097152];(way(125848292);way(393391115);way(1134679171);relation(14604314);way(1264541006);node(12736386141);way(1054289435);way(116801004);way(116905045);node(10806670133););out body geom;` at `https://overpass-api.de/api/interpreter` with a10s client abort and `Accept: application/json`.

First response was HTML and failed JSON parsing; status was not captured, so it is not invented retrospectively. Second: **HTTP406**, acquired17:42:37.441Z,248ms,371bytes, responseSHA256 `396f0a34ea1dad2ac8ae630285dd93fd4cd1619c4ccb0f30160ae71ab118a04d`, HTML “Not Acceptable”. No further Overpass retries, alternate host, header-change workaround or product source-policy changes were attempted. Nominatim and read-only main OSM API checks above are independent public verification, not proof that product Overpass acquisition works.

## Policy and handoff

[Nominatim lookup documentation](https://nominatim.org/release-docs/latest/api/Lookup/) permits a bounded exact-ID lookup (up to50 IDs); [Nominatim policy](https://operations.osmfoundation.org/policies/nominatim/) governs rate, identification and prohibited systematic queries. Main OSM API was used only for the small read-only element/bbox checks shown, not as a bulk production data pipeline. [OSM API reference](https://wiki.openstreetmap.org/wiki/API_v0.6) describes those public GET endpoints. Data attribution: **© OpenStreetMap contributors, ODbL1.0**, [copyright/licence](https://www.openstreetmap.org/copyright).

Only this new document is changed. NASA feature commit and other code/acceptance files are untouched. No paid AI, API keys, hosted request, database write, deployment or authority mutation. Next: root freezes actual product snapshots for these candidates; explicitly resolves the D05 entry path and D09 rendered condition; retains D02 conflict and the disjoint-MultiPolygon coverage gap. Source-record existence is not snapshot/lease acceptance.
