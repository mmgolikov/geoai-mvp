# Phase A Source Evidence Log v1

## Purpose

Record primary-source pages reviewed during Phase A. This log supports research traceability; it does not activate any connector or guarantee continued access.

| Evidence ID | Provider | Primary source | Research use | Verification date | Outcome |
| --- | --- | --- | --- | --- | --- |
| SRC-EV-001 | OpenStreetMap | `https://www.openstreetmap.org/copyright` | ODbL, attribution, adapted-data and protected-source controls | 2026-07-13 | Candidate open source; attribution/share-alike review required |
| SRC-EV-002 | OpenStreetMap Foundation | `https://osmfoundation.org/wiki/Licence/Attribution_Guidelines` | Attribution implementation guidance | 2026-07-13 | Include map and export attribution |
| SRC-EV-003 | Geofabrik | `https://download.geofabrik.de/asia.html` | GCC extract availability and formats | 2026-07-13 | Candidate deterministic source snapshot |
| SRC-EV-004 | Overture Maps | `https://docs.overturemaps.org/getting-data/` | Python/DuckDB bbox extraction and release resolution | 2026-07-13 | Candidate open source after release pinning |
| SRC-EV-005 | Overture Maps | `https://docs.overturemaps.org/attribution/` | Theme/source attribution and licensing | 2026-07-13 | Source-level attribution generation required |
| SRC-EV-006 | Overture Maps | `https://docs.overturemaps.org/schema/` | Buildings, divisions, places and transportation schema | 2026-07-13 | Raw schema remains inside adapter only |
| SRC-EV-007 | Copernicus Data Space | `https://documentation.dataspace.copernicus.eu/APIs/STAC.html` | Sentinel/DEM product discovery and filters | 2026-07-13 | Derived-research candidate |
| SRC-EV-008 | Copernicus Data Space | `https://dataspace.copernicus.eu/terms-and-conditions` | Sentinel legal-notice and portal-content distinction | 2026-07-13 | Product-specific attribution required |
| SRC-EV-009 | ESA WorldCover | `https://esa-worldcover.org/en/data-access` | 10 m 2020/2021 product, version and CC BY attribution | 2026-07-13 | Dated derived/context candidate |
| SRC-EV-010 | Open-Meteo | `https://open-meteo.com/en/terms` | Commercial/non-commercial use and attribution | 2026-07-13 | Commercial Product use conditional |
| SRC-EV-011 | Open-Meteo | `https://open-meteo.com/en/docs` | API/model/time context | 2026-07-13 | Metric context only |
| SRC-EV-012 | NASA POWER | `https://power.larc.nasa.gov/docs/services/api/` | REST API and ARD products | 2026-07-13 | Research candidate; exact citation/reuse review pending |
| SRC-EV-013 | Dubai Land Department | `https://dubailand.gov.ae/en/open-data/real-estate-data/` | Current CSV categories and manual download path | 2026-07-13 | Manual/public validation path only |
| SRC-EV-014 | Dubai Land Department | `https://dubailand.gov.ae/en/eservices/dubai-rest/` | Service/app context | 2026-07-13 | Not an approved bulk data connector |
| SRC-EV-015 | Dubai Pulse / Data Dubai | DLD-linked portal / redirect | Previous-year data path | 2026-07-13 | Dataset terms and automated access unresolved |
| SRC-EV-016 | Dubai Municipality / GeoDubai | Known future official validation path | Official GIS/planning adapter research | 2026-07-13 | Access, licence, schema and Product use unresolved |

## Evidence requirements for implementation

Before B1 source selection is finalized:

1. Pin exact OSM/Geofabrik source file and checksum.
2. Resolve exact Overture release and generate theme/source attribution.
3. Store downloaded source evidence or immutable metadata sufficient to reproduce the build.
4. Record legal/compliance disposition for public normalized outputs.
5. Do not include unresolved DLD, Dubai Pulse or Municipality datasets.

## Required caveat

**Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.**