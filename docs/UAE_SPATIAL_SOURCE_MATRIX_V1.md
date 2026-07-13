# UAE Spatial Source and Licensing Matrix v1

## Document control

| Field | Value |
| --- | --- |
| Workstream | Agent A — source, access and licensing |
| Change request | CR-DEV6-010 |
| Status | Research baseline / founder review required |
| Verified on | 2026-07-13 |
| Target market | UAE, with Phase B implementation focused on Dubai |
| Product status | Documentation only; no source is activated by this document |

## Executive decision

GeoAI should use a layered source strategy rather than searching for one universal dataset:

1. OpenStreetMap / Geofabrik for reproducible open road, rail, land-use, construction, coastline, POI and selected building context.
2. Overture Maps for complementary buildings, places, divisions and transportation, with release-level and source-level attribution preserved.
3. Copernicus Sentinel and DEM products for dated derived screening evidence.
4. ESA WorldCover for a dated 10 m land-cover baseline and supporting derived metrics.
5. Open-Meteo and NASA POWER for timestamped point/time-series observations, never geometry or engineering certification.
6. DLD public CSV exports and Dubai Pulse only as manually acquired market/property snapshots after usage and redistribution review.
7. Dubai Municipality / GeoDubai only as a future permissioned official-validation adapter.
8. Customer and licensed-provider data as separately governed adapters with explicit scope, validation and precedence.

No source in this matrix establishes official parcel, cadastral, ownership, zoning, planning, certified valuation or approved-site status by itself.

## Decision states

| State | Meaning |
| --- | --- |
| Approved for Phase B open context | Source can be used in a controlled demo snapshot after the listed attribution, license and QA controls are implemented. |
| Conditional | Technically useful, but commercial access, redistribution, theme-level attribution or data quality must be resolved before Product use. |
| Manual validation path | Public/manual acquisition appears available; no automated or live integration is approved. |
| Planned official adapter | Official or government source is known, but access, permitted use, lineage and implementation are not verified. |
| Rejected | Source or method must not be used. |

## Source matrix

| Source | Candidate themes | Access and release | License / attribution | Stable identity | Phase decision | Required Product label |
| --- | --- | --- | --- | --- | --- | --- |
| OpenStreetMap via Geofabrik | Roads, rail, coastline/water, land use, buildings, construction, POI, mapped boundaries/places | Geofabrik GCC `.osm.pbf` or `.gpkg.zip`; build pins download timestamp, file checksum and clipping AOI | ODbL 1.0. Display `© OpenStreetMap contributors`; make ODbL availability clear. Adapted-database obligations require legal/compliance review before redistribution. | OSM element type + numeric ID; snapshot timestamp; retain source tags needed for lineage | Approved for Phase B open context | Open-context geometry / Open transport context |
| Overture Maps | Buildings, divisions, places, transportation, base context | Official Python client or DuckDB bbox query over cloud GeoParquet; resolve release through Overture STAC rather than silently using latest | Preserve `Overture Maps Foundation` and theme/source attribution. Buildings, divisions and transportation are documented as ODbL themes; places include multiple source licenses. Store the release attribution manifest with every snapshot. | Overture feature ID and, where useful, GERS references; release ID | Conditional approval for Phase B after theme-level attribution manifest is generated | Overture open-context geometry |
| Copernicus Data Space — Sentinel-2 L2A | Dated optical imagery metadata, vegetation/built-up indices, change context | STAC collection and item search with AOI, date and cloud-cover filters; account/service quotas may apply | Sentinel data access is free, full and open under the Sentinel legal notice. Do not reuse unrelated portal content as if it were Sentinel data. Credit Copernicus/ESA according to the product notice. | STAC item ID, collection, sensing time, processing baseline, asset checksum | Approved for derived research; Product layer requires approved methodology | Derived screening evidence — Sentinel-2 |
| Copernicus Data Space — Sentinel-1 GRD | Radar observation and construction/change research | STAC search by AOI/date/orbit/product metadata | Same Sentinel legal-notice controls; acquisition and processing metadata mandatory | STAC item/product ID and acquisition time | Approved for derived research | Derived change-screening evidence — Sentinel-1 |
| Copernicus DEM | Low-elevation context at documented 30 m or 90 m product resolution | CDSE complementary collection / COG assets; pin product and tile IDs | Product-specific terms and Copernicus attribution retained | Product/tile ID and checksum | Conditional for coastal/low-elevation derivation | Derived low-elevation exposure |
| ESA WorldCover 2021 v200 | Built-up, vegetation, water and land-cover baseline | Public COGs/AWS/Zenodo; 10 m product; algorithm version and product year fixed | CC BY 4.0. Required acknowledgement includes ESA WorldCover year and modified Copernicus Sentinel data statement | Product year, version, tile ID and checksum | Approved for supporting derived context; not current land use | Dated open land-cover context — 2021 |
| Open-Meteo | Forecast, historical/reanalysis, marine, air-quality, elevation and climate context | JSON/CSV APIs; model and retrieval timestamp must be recorded | API data is CC BY 4.0. Free API is non-commercial only; GeoAI commercial/client use requires a paid plan or approved self-hosted/commercial arrangement | Request hash, model(s), run/valid time, coordinates and retrieval time | Conditional for commercial Product; approved for controlled research | Model/API context — not engineering evidence |
| NASA POWER | Solar and meteorological analysis-ready point/time-series data | RESTful APIs; parameter, temporal resolution, coordinate and retrieval timestamp recorded | NASA source/citation and dataset references required. Commercial/product usage review remains required before release because this matrix has not yet captured a definitive redistribution clause | Request hash, community, parameter set, period and coordinates | Research approved; Product conditional pending citation/terms review | NASA POWER open context |
| DLD Open Data — current CSV exports | Transactions, rents, projects, valuations, land, building, unit, broker and developer tables | Official web form with date/category filters and CSV download; acquisition is manual and may require captcha | Public availability does not by itself establish Product redistribution rights. Save page URL, extraction date, filters, original CSV and terms evidence. DLD site footer remains all-rights-reserved. | Dataset category + extraction date/filter + row identifier where present | Manual validation path only | DLD public snapshot context — official/client validation required |
| Dubai Pulse / Data Dubai | Previous-year DLD and wider Dubai government datasets | DLD directs users to Dubai Pulse for previous-year data; direct automated access and dataset terms were not verified in this research pass | License, redistribution and API terms unresolved. Do not ingest or redistribute until dataset-level terms are captured. | Dataset identifier and release/snapshot date, once verified | Planned/manual validation path | Dubai Pulse public snapshot path — not connected |
| Dubai REST | Owner/tenant/investor services, indexes and project information | Official DLD application/service; not a documented bulk data API for GeoAI | Service availability is not permission for automated extraction or redistribution | Not applicable until authorized API exists | Not approved as a data connector | Service reference only — no integration |
| Dubai Municipality / GeoDubai | Potential official community, planning, parcel and municipal GIS validation | Permissioned/future access; no reusable Product endpoint or terms verified | Explicit agreement, schema, scope, license, attribution and lineage required | Official provider IDs when available | Planned official adapter only | Planned official validation — not connected |
| Customer-provided GeoJSON / documents | Assets, portfolios, AOIs, project boundaries and evidence | Controlled upload and review | Customer contract and data-processing terms; no confidential upload until secure Storage/Auth scope is approved | Customer object ID plus GeoAI stable feature key | Planned controlled adapter | User-provided data; validation required |
| Licensed commercial provider | Market, valuation, title, imagery or hazard data | Contract/API/file delivery | Provider agreement controls storage, display, redistribution, derivatives and model use | Provider object ID + release | Planned licensed adapter | Licensed context — provider scope applies |
| Google Maps, copied commercial map geometry or screenshots used as data | Any geometry extraction | Not permitted | Copyright and terms risk | None | Rejected | Never use |

## Primary source evidence

### OpenStreetMap

The official copyright page states that OSM data is licensed under ODbL, may be copied and adapted with credit, and that distributed adapted data must follow the same licence. It also requires visible attribution and warns contributors not to copy protected sources such as Google Maps.

Primary references:

- https://www.openstreetmap.org/copyright
- https://osmfoundation.org/wiki/Licence/Attribution_Guidelines

### Geofabrik

The official Asia download page provides a GCC States sub-region in PBF and GeoPackage formats and publishes frequently refreshed extracts. A build must record the exact file timestamp and checksum rather than using an unversioned `latest` file without a manifest.

Primary reference:

- https://download.geofabrik.de/asia.html

### Overture Maps

The official quickstart supports bbox extraction via the Python client and DuckDB, and recommends resolving the latest release through the Overture STAC catalog. The documentation example on 2026-07-13 references release `2026-06-17.0`; GeoAI must still resolve and pin the actual release at build time.

Overture attribution documentation states that source-specific attribution must be preserved. It documents ODbL theme licensing for buildings, divisions and transportation and mixed source licences for places.

Primary references:

- https://docs.overturemaps.org/getting-data/
- https://docs.overturemaps.org/attribution/
- https://docs.overturemaps.org/schema/
- https://stac.overturemaps.org/catalog.json

### Copernicus Data Space

The official STAC documentation exposes Sentinel-1, Sentinel-2 L2A and DEM collections and supports spatial, temporal and cloud-cover filtering. CDSE terms state that Copernicus Sentinel data access and use is free, full and open under the Sentinel legal notice; other portal content has different restrictions.

Primary references:

- https://documentation.dataspace.copernicus.eu/APIs/STAC.html
- https://dataspace.copernicus.eu/terms-and-conditions

### ESA WorldCover

WorldCover 2021 v200 is a 10 m dated land-cover product based on Sentinel-1 and Sentinel-2. It is provided under CC BY 4.0 with specified map attribution. The 2020 and 2021 products use different algorithm versions, so change between them must not be interpreted as pure real-world change.

Primary reference:

- https://esa-worldcover.org/en/data-access

### Open-Meteo

Open-Meteo publishes API data under CC BY 4.0. Its free API is limited to non-commercial use; commercial products require an appropriate subscription or another approved deployment mode. Model, valid time and retrieval time must be recorded for every observation.

Primary references:

- https://open-meteo.com/en/terms
- https://open-meteo.com/en/docs

### NASA POWER

NASA POWER exposes REST APIs for analysis-ready temporal and application products. Phase B must capture the exact dataset/community/parameter citation and confirm Product redistribution terms before client-facing use.

Primary reference:

- https://power.larc.nasa.gov/docs/services/api/

### Dubai Land Department

DLD's official Real Estate Data page exposes current transactions, rents, projects, valuations, land, building, unit, broker and developer tables with CSV download controls, and directs previous-year users to Dubai Pulse. This supports a manual snapshot workflow, not a live integration claim.

Primary references:

- https://dubailand.gov.ae/en/open-data/real-estate-data/
- https://dubailand.gov.ae/en/eservices/dubai-rest/

## Attribution implementation requirements

Every generated dataset manifest must contain:

```json
{
  "sourceId": "osm-geofabrik-gcc",
  "sourceName": "OpenStreetMap via Geofabrik GCC extract",
  "sourceUrl": "https://download.geofabrik.de/asia/gcc-states.html",
  "releaseOrSnapshot": "<timestamp-or-file-name>",
  "accessedAt": "<ISO-8601>",
  "licenseId": "ODbL-1.0",
  "attribution": "© OpenStreetMap contributors",
  "redistributionReview": "required",
  "checksum": "sha256:<value>"
}
```

The Product map and report/export evidence must expose compact attribution, with the full source and licence list available through source lineage.

## Commercial and legal review gates

Before a Phase B merge candidate is approved:

1. Confirm whether the planned combined OSM/Overture snapshot is an adapted database and document share-alike handling.
2. Generate source-level Overture attribution from the pinned release rather than using a generic Overture-only label.
3. Confirm Open-Meteo commercial subscription or remove it from any commercial demo runtime.
4. Confirm NASA POWER citation and reuse conditions for the exact product.
5. Capture DLD/Dubai Pulse dataset-level terms before storing or redistributing CSV content.
6. Keep GeoDubai/Dubai Municipality empty until a permissioned source is documented.
7. Record legal/compliance reviewer, review date and approved use in the release evidence matrix.

## Prohibited claims

The following are prohibited unless a separately validated official/client source proves them for the stated scope:

- official parcel;
- official zoning;
- cadastral validation;
- ownership verification;
- certified valuation;
- approved site;
- guaranteed best use;
- live DLD integration;
- live GeoDubai integration;
- current official community boundary;
- certified flood or heat-risk zone.

## Required caveat

**Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.**