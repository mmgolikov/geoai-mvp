# GeoAI Demo Readiness Checklist v0.6

Date: June 18, 2026

Use statuses: Pass / Partial / Fail.

| Check | Status | Notes |
| --- | --- | --- |
| Landing works | Partial | Build passes; open `/` before presenting. |
| Landing guided demo CTA works | Partial | Click **Launch guided demo** and confirm `/workspace?guidedDemo=dubai-marina-investment` opens. |
| Workspace works | Partial | Build passes; manual browser check required before demo. |
| Guided demo loads | Partial | Use command panel **Load demo data** if URL auto-load is not visible. |
| Demo data loads | Partial | Confirm **Demo CSV metrics** and **Demo GeoJSON screening sites** in Data Sources. |
| GeoJSON layer visible | Partial | Confirm demo screening polygons appear on the map. |
| CSV metrics parsed | Partial | Confirm Demo CSV metrics row count appears in Data Sources. |
| Selected site / polygon is clear | Partial | Confirm selected polygon highlight or select one demo polygon manually. |
| Express Analysis runs | Partial | Run analysis and confirm dashboard appears. |
| Report map shows selected geometry | Partial | Open report preview and inspect Map Context. |
| Report includes data used | Partial | Confirm evidence/source cards include demo CSV, demo GeoJSON, open baseline and planned validation context where applicable. |
| Comparison works | Partial | Add 2-3 demo sites or click **Add demo sites**, then **Compare Selected**. |
| Project dashboard opens | Partial | Open `/projects` and confirm demo project brief is coherent. |
| No official/live false claims | Partial | Presenter must use the data honesty statement. |
| Build succeeds | Pass | Run `npm run build` before each demo. |

## Pre-Demo Checklist

- Confirm `NEXT_PUBLIC_MAPBOX_TOKEN` is present in the local or Vercel environment.
- Open `/` and confirm the landing hero renders cleanly.
- Open `/workspace?guidedDemo=dubai-marina-investment`.
- Confirm the right command panel CTA footer remains pinned.
- Confirm demo CSV/GeoJSON appear in Data Sources.
- Select or confirm a demo polygon.
- Run Express Analysis.
- Open report preview.
- Load comparison sites and run comparison.
- Open `/projects`.

## Data Honesty Guardrails

Allowed language:
- demo prototype
- local demo sample
- sample/offline metrics
- uploaded CSV/GeoJSON
- demo-normalized layers
- OSM-style sample baseline
- official validation required
- live official integration not connected in this demo

Forbidden language:
- live DLD integration
- official parcel boundaries
- official zoning boundaries
- live Dubai Pulse data
- live GeoDubai GIS
- validated official risk zones
- production-ready platform
- pilot-ready product, unless framed only as a roadmap or pilot definition target
