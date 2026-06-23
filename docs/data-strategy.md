# GeoAI Data Strategy

This document describes the current demo data strategy and the intended path toward production data readiness.

## Current Synthetic Demo Data

The MVP uses synthetic Dubai-focused demo data only.

Current demo data lives in:

- `src/data/demo-layers.ts`
- `src/data/demo-objects.json`

The demo layers are hand-authored, lightweight GeoJSON-style objects. They are used to demonstrate product workflows, not to provide authoritative planning, market, or risk intelligence.

Current synthetic categories:

- Development Zones
- Premium Real Estate Areas
- Infrastructure Nodes
- Construction Sites
- Coastal / Flood Risk Zones
- Heat Risk Zones
- Transport Corridors

## Future Data Source Registry

Production GeoAI should use a Data Source Registry as the system of record for all connected datasets.

The registry should track:

- Source name
- Provider
- Dataset category
- Geography
- License
- Refresh cadence
- Last updated date
- Access method
- Confidence level
- Usage restrictions
- Fields available
- Spatial resolution
- Temporal resolution
- Evidence citation format

## Dubai Real Estate Sources

Future real estate data adapters may include:

- Land and parcel datasets where licensed
- Transaction and valuation datasets
- Rental market datasets
- Developer project pipeline data
- Broker or market research datasets
- Supply, demand, absorption, and vacancy indicators
- Asset class benchmarks for residential, commercial, hospitality, logistics, and mixed-use

All commercial datasets require license review before integration.

## GIS And Planning Sources

Future GIS and planning integrations may include:

- Zoning and land-use layers
- Master plan boundaries
- Building footprints
- Permitted density and height controls
- Protected areas and environmental constraints
- Road networks and right-of-way data
- Utility and infrastructure capacity layers
- Administrative boundaries

Official government or municipality data should be preferred when available and licensed.

## OSM And Infrastructure Sources

OpenStreetMap and other open infrastructure sources can support:

- Road network context
- Transit stations and lines
- Points of interest
- Access and connectivity approximations
- Public infrastructure context

Open data should be marked clearly as open-source derived and should include attribution and license handling.

## Satellite And Remote Sensing Sources

Future remote sensing integrations may include:

- Satellite basemaps
- Construction progress monitoring
- Change detection
- Vegetation and surface condition indicators
- Heat and land-surface-temperature proxies
- Flood, coastal, and drainage exposure context
- Drone imagery where provided by users or partners

Remote sensing outputs should include date, resolution, provider, processing method, and confidence notes.

## Source Metadata Model

A production source record should include:

```ts
type DataSource = {
  id: string;
  name: string;
  provider: string;
  category: string;
  geography: string;
  license: string;
  refreshCadence: string;
  lastUpdated: string;
  accessMethod: "api" | "file" | "database" | "manual" | "partner";
  confidence: "low" | "medium" | "high";
  restrictions: string[];
};
```

## Evidence Model

GeoAI outputs should eventually reference evidence explicitly.

An evidence record should include:

- Claim or insight
- Source dataset
- Source feature or document
- Timestamp
- Geometry or location reference
- Confidence score
- Citation text
- Link to raw or derived source where allowed

This allows analysis cards, dashboards, reports, and exports to show where each claim came from.

## Data Licensing Notes

- Do not assume public web availability means commercial reuse is allowed.
- Track source licenses before using data in reports.
- Separate open, commercial, government, partner, and user-uploaded data.
- Include attribution where required.
- Keep raw licensed data access-controlled.
- Make demo/mock data clearly labeled as synthetic.

## Mock Fallback Strategy

The product should continue to support deterministic mock fallback data for demos, local development, and sales walkthroughs.

Mock fallback should:

- Be clearly labeled as demo data.
- Avoid implying official status.
- Be deterministic and stable.
- Mirror future production schemas where possible.
- Allow offline or token-limited demos.
- Never mix mock and real evidence without clear labeling.

## Snapshot Connector Strategy v1.4

GeoAI now supports optional local snapshot connectors for DLD / Dubai Pulse-style market context and OSM / Geofabrik-style open geospatial context. Snapshot files are local CSV/JSON/GeoJSON inputs, not live official integrations.

Current normalized outputs:

- `data/normalized/dld_market_snapshot.json`
- `data/normalized/open_geodata_snapshot.json`

Current API context:

- `/api/context/climate` for screening-level Open-Meteo heat/rainfall proxy with demo fallback.

Every snapshot-backed output must retain this caveat: screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.

## Public Data Connectors v1.6

GeoAI v1.6 expands the source strategy from v1.4 snapshots into a structured public source catalog.

Canonical files:

- `src/lib/external-data/public-source-types.ts`
- `src/lib/external-data/public-source-catalog.ts`
- `src/lib/external-data/source-registry.ts`

Supported public/open source groups:

- DLD / Dubai Pulse public snapshots for transactions, rents, projects, land, building and unit context.
- DLD API Gateway as a separate permission-required validation path.
- OSM / Geofabrik open snapshots for roads, buildings, POIs, landuse and transport context.
- Overture Maps manual snapshots for buildings, places, transportation and divisions.
- Open-Meteo climate context.
- NASA POWER solar and wind screening context.
- OpenAQ air-quality context.
- WorldPop demographic/catchment context.
- Copernicus / Sentinel metadata availability path.
- Non-official administrative context through Overture divisions or optional GADM caveated usage.

The v1.6 strategy keeps source text centralized in the catalog so UI, manifest, readiness and reports can refer to source metadata instead of scattered hardcoded claims.

Every v1.6 source remains screening-level unless separately validated by client-approved or authorized official sources.

## Real Data + OpenAI Decision Scoring Foundation v2.1

GeoAI v2.1 separates storage repository modes from source data modes.

Repository modes describe persistence behavior: `supabase`, `local_fallback`, `browser_local`, `demo_seed`, and `disabled`.

Source data modes describe evidence state: `real_snapshot`, `imported_snapshot`, `sample_fallback`, `manual_import_ready`, `permission_required`, `planned_validation`, and `demo_seed`.

DLD / Dubai Pulse-style public CSV snapshots are supported as manual imports only. The app recognizes dated filenames such as `dld_transactions_YYYYMMDD.csv`, `dld_rents_YYYYMMDD.csv`, `dld_projects_YYYYMMDD.csv`, `dld_valuations_YYYYMMDD.csv`, `dld_land_YYYYMMDD.csv`, `dld_building_YYYYMMDD.csv`, `dld_unit_YYYYMMDD.csv`, `dld_brokers_YYYYMMDD.csv`, and `dld_developers_YYYYMMDD.csv`.

No scraping, captcha bypass, protected endpoint automation, live DLD API Gateway access, live Dubai Pulse integration or GeoDubai connection is included.

OpenAI decision scoring is optional and server-side. It produces a structured decision-support memo with guardrails and deterministic fallback. It does not replace source validation, official planning checks, cadastral validation, ownership verification or valuation due diligence.
