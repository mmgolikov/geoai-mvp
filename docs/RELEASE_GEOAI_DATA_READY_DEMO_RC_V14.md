# GeoAI Data-Ready Demo RC v1.4

Release date: June 23, 2026

Production URL: https://geoai-mvp.vercel.app

Deployment verified from PR #6 merge into `main`.

## Scope

This release moves GeoAI from a demo-only data posture toward a data-ready demo release candidate. It adds external source readiness, snapshot ingestion paths, source lineage, and clearer data-state messaging while preserving the existing workspace, analysis, comparison, report, and project dashboard flows.

This release remains a screening demo. It is not production-ready and is not pilot-ready without client-approved data, official source validation, persistence governance, and agreed evidence controls.

Required caveat remains:

> screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.

## What Changed

- Added external source registry v1.4 for data-state and source-lineage tracking.
- Added DLD / Dubai Pulse snapshot ingestion for sample market-area context.
- Added OSM / Geofabrik snapshot ingestion for sample open-geospatial context.
- Added Open-Meteo screening-level climate context route with graceful fallback.
- Added source readiness and data confidence visibility in the Project Dashboard.
- Updated report and evidence flows to keep source limitations visible.
- Preserved demo-normalized scoring and existing mock/OpenAI fallback behavior.

No live official DLD, Dubai Pulse, GeoDubai, parcel, zoning, cadastral, ownership, or valuation integration is connected or claimed.

## Current Data States

| Source | Current state | Demo use | Limitation |
| --- | --- | --- | --- |
| DLD / Dubai Pulse | Snapshot available | 5 sample market-area records | Snapshot/manual import only; not a live official transactional feed. |
| OSM / Geofabrik | Snapshot available | 3 sample open-geospatial features | Open geospatial context only; not official municipal GIS, zoning, parcel, or cadastral data. |
| Open-Meteo | Screening-level climate API context with fallback | Heat/rainfall context framing | Not site-specific engineering, drainage, flood, or insurance-grade hazard modeling. |
| Copernicus / Sentinel | Planned metadata path only | Future remote-sensing evidence lineage | No imagery analytics pipeline is connected. |
| GeoDubai / Dubai Municipality | Planned validation only | Future official validation source | Not connected in this demo. |
| DLD API Gateway | Planned validation only | Future official validation path | Requires enterprise access, authorization, contract, and permission review. |

## What This Enables In Demos

- Show a Project Dashboard with `5 snapshot / 6 demo` market-area readiness.
- Explain DLD / Dubai Pulse and OSM / Geofabrik as snapshot context, not live official integrations.
- Demonstrate source lineage, evidence confidence, and validation-required messaging in investor/client workflows.
- Show climate context through an open screening-level route while preserving fallback behavior.
- Keep reports, comparison, and analysis dashboards aligned with the same data-honesty language.

## Limitations

- Not production-ready.
- Not pilot-ready without client-approved data and official validation.
- No durable enterprise persistence unless Supabase/PostGIS is configured and governed.
- No authentication, roles, multi-tenant controls, audit workflows, or enterprise data governance yet.
- No live official DLD / Dubai Pulse integration.
- No live GeoDubai or Dubai Municipality GIS integration.
- No official parcel boundary, official zoning boundary, cadastral validation, ownership verification, certified valuation, approval, or guaranteed best-use conclusion.
- Current outputs are screening hypotheses only and require official validation before decision use.

## Recommended Next Sprint

Investor Demo Narrative & Client Pilot Package v1.5.
