# Phase A Source Evidence Log v1

## Purpose

Record primary-source pages reviewed during Phase A. This log supports research traceability; it does not activate any connector or guarantee continued access.

## Evidence register

| Evidence ID | Provider | Primary source | Research use | Verification date | Outcome |
| --- | --- | --- | --- | --- | --- |
| SRC-EV-001 | OpenStreetMap | `https://www.openstreetmap.org/copyright` | ODbL, attribution, adapted-data and protected-source controls | 2026-07-13 | Candidate open source; attribution/share-alike review required |
| SRC-EV-002 | OpenStreetMap Foundation | `https://osmfoundation.org/wiki/Licence/Attribution_Guidelines` | Attribution implementation guidance | 2026-07-13 | Include map and export attribution |
| SRC-EV-003 | Geofabrik | `https://download.geofabrik.de/asia/gcc-states.html` | GCC extract availability, dated files and formats | 2026-07-13 | Phase B candidate file: `gcc-states-260712.osm.pbf`, 251,556,393 bytes; published 2026-07-12 23:55. Page reports the then-current extract contains OSM data through 2026-07-12T20:22:00Z. Download checksum remains a B1 gate. |
| SRC-EV-004 | Overture Maps STAC | `https://stac.overturemaps.org/catalog.json` | Resolve the current official release | 2026-07-13 | Current STAC `latest`: `2026-06-17.0`; pin this release in B1 unless a newer reviewed release is selected before build. |
| SRC-EV-005 | Overture Maps | `https://docs.overturemaps.org/getting-data/` | Python/DuckDB bbox extraction | 2026-07-13 | Official client/GeoParquet extraction path confirmed |
| SRC-EV-006 | Overture Maps | `https://docs.overturemaps.org/attribution/` | Theme/source attribution and licensing | 2026-07-13 | Source-level attribution generation required |
| SRC-EV-007 | Overture Maps | `https://docs.overturemaps.org/schema/` | Buildings, divisions, places and transportation schema | 2026-07-13 | Raw schema remains inside adapter only |
| SRC-EV-008 | Copernicus Data Space | `https://documentation.dataspace.copernicus.eu/APIs/STAC.html` | Sentinel/DEM product discovery and filters | 2026-07-13 | Derived-research candidate |
| SRC-EV-009 | Copernicus Data Space | `https://dataspace.copernicus.eu/terms-and-conditions` | Sentinel legal-notice and portal-content distinction | 2026-07-13 | Product-specific attribution required |
| SRC-EV-010 | ESA WorldCover | `https://esa-worldcover.org/en/data-access` | 10 m 2020/2021 product, version and CC BY attribution | 2026-07-13 | Dated derived/context candidate |
| SRC-EV-011 | Open-Meteo | `https://open-meteo.com/en/terms` | Commercial/non-commercial use and attribution | 2026-07-13 | Commercial Product use conditional |
| SRC-EV-012 | Open-Meteo | `https://open-meteo.com/en/docs` | API/model/time context | 2026-07-13 | Metric context only |
| SRC-EV-013 | NASA POWER | `https://power.larc.nasa.gov/docs/services/api/` | REST API and ARD products | 2026-07-13 | Research candidate; exact citation/reuse review pending |
| SRC-EV-014 | Dubai Land Department | `https://dubailand.gov.ae/en/open-data/real-estate-data/` | Current CSV categories and manual download path | 2026-07-13 | Manual/public validation path only |
| SRC-EV-015 | Dubai Land Department | `https://dubailand.gov.ae/en/eservices/dubai-rest/` | Service/app context | 2026-07-13 | Not an approved bulk data connector |
| SRC-EV-016 | Dubai Pulse / Data Dubai | DLD-linked portal / redirect | Previous-year data path | 2026-07-13 | Dataset terms and automated access unresolved |
| SRC-EV-017 | Dubai Municipality / GeoDubai | Known future official validation path | Official GIS/planning adapter research | 2026-07-13 | Access, licence, schema and Product use unresolved |

## Phase B candidate release lock

Working candidate sources for B1 planning:

```text
OSM / Geofabrik: gcc-states-260712.osm.pbf
OSM source data timestamp shown by Geofabrik: through 2026-07-12T20:22:00Z
Overture release: 2026-06-17.0
```

This is a research lock, not a completed source download. B1 must still:

- download from the official source;
- calculate SHA-256;
- record byte size and response/source metadata;
- generate Overture theme/source attribution;
- confirm public normalized-output treatment;
- reject the build if source identity or rights cannot be reproduced.

## Evidence requirements for implementation

Before B1 source selection is considered complete:

1. Verify the downloaded Geofabrik file checksum and preserve immutable source metadata.
2. Confirm whether the exact Overture release remains selected at B1 branch creation.
3. Generate theme/source attribution from the pinned Overture release.
4. Store source evidence or immutable metadata sufficient to reproduce the build.
5. Record legal/compliance disposition for public normalized outputs.
6. Do not include unresolved DLD, Dubai Pulse or Municipality datasets.

## Required caveat

**Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.**