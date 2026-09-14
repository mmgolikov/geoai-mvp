# Phase B Product Layer Catalogue v1

## Purpose

Define the first realistic open-context layer set and honest Product naming before implementation.

| Layer ID | Product name | Geometry role | Primary source | Initial visibility | Synthetic fallback | Phase B status |
| --- | --- | --- | --- | --- | --- | --- |
| `openTransportContext` | Open Transport Context | corridor | OSM/Geofabrik, optional Overture complement | On | Existing transport corridors | B2 migration priority 1 |
| `openSpatialAnchors` | Open Spatial Anchors | anchor | OSM/Overture places/transport | On | Existing infrastructure nodes | B2 migration priority 2 |
| `realWorldSampleAois` | Sample AOIs on Real-World Geometry | aoi | OSM/Overture footprints/blocks plus transparent derivation | On | Existing selected AOI examples | B2 migration priority 3 |
| `openBuildingContext` | Open Building Context | asset_footprint | Overture/OSM, focus AOIs only | Zoom-gated | None or hidden synthetic fallback | B2 migration priority 4 |
| `openLanduseContext` | Open Land-Use Context | context_boundary | OSM land-use / reviewed Overture context | Off by default or focus-only | Existing broad context where needed | B2 migration priority 4 |
| `openConstructionTargets` | Open Construction Monitoring Targets | asset_footprint / observation target | OSM construction, reviewed open geometry | Off by default | Existing construction points | B2 migration priority 5 |
| `openAreaContext` | Open-Context Area Boundaries | context_boundary | Reviewed Overture divisions / OSM boundaries/places | Off until reviewed | Existing synthetic market/development areas | Conditional B2 migration priority 6 |
| `derivedCoastalExposure` | Derived Coastal / Low-Elevation Exposure | screening_zone | Coastline + DEM methodology | Off | Existing synthetic coastal risk remains fallback | Phase C only |
| `derivedHeatExposure` | Derived Heat / Vegetation Screening | screening_zone | WorldCover/Sentinel methodology | Off | Existing synthetic heat risk remains fallback | Phase C only |
| `derivedDevelopmentActivity` | Derived Development Activity Signal | screening_zone | Open construction/activity + approved method | Off | Existing synthetic development zones remain fallback | Phase C only |
| `futureOfficialGis` | Future Official GIS Validation | context_boundary | Municipality/GeoDubai | Off | Empty | Not connected |
| `futureCustomerAssets` | Future Customer Assets | aoi / asset_footprint | Controlled customer adapter | Off | Empty | Not connected |

## Layer naming rules

- Source geometry uses `Open` or `Open-context`.
- Algorithmic geometry uses `Derived`.
- User geometry uses `User-provided`.
- Client-reviewed geometry uses `Client-validated` for the defined scope.
- Official wording requires exact authorized provider/source/scope/date evidence.
- Building footprint does not mean parcel.
- Land-use context does not mean zoning.
- Community context does not mean official administrative boundary.
- Exposure does not mean certified hazard.

## Style guidance

Preserve the current light enterprise system.

- Source footprints/context: solid thin outline, low-opacity fill.
- Derived screening zones: dashed or patterned outline and lower-opacity fill.
- Selected AOI: stronger outline and clear selection state.
- Synthetic fallback: visibly labelled in layer/details; style may remain compatible during migration.
- Official/client validated sources, when eventually available, use status indicators rather than a misleading “official color”.

## Source disclosure

Selection disclosure includes:

- Product layer name;
- source/provider;
- source release/snapshot date;
- validation state;
- geometry role;
- freshness;
- attribution short text;
- required caveat.

## Phase B feature-density limits

- Transport: retain primary/secondary corridors; local roads only in focus AOIs.
- Anchors: prioritize airports, ports, metro/rail, business/tourism and key public-service anchors.
- Buildings: focus AOIs and zoom gating; do not ship all Dubai footprints as one unbounded client GeoJSON.
- Land use: selected context polygons only.
- Construction: 5–20 reviewed targets.
- Selected AOIs: 2–4.
- Area context: 10–30 reviewed features maximum for first release.

## Required caveat

**Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.**