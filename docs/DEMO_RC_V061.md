# GeoAI Demo Release Candidate v0.6.1

Date: 2026-06-18

GeoAI Demo RC v0.6.1 freezes the current investor/client demo prototype for controlled presentations. This release candidate is not production-ready and not pilot-ready. It demonstrates the product workflow using demo-normalized layers, sample/offline metrics, local CSV/GeoJSON upload context, OSM-style sample baseline data, optional server-side OpenAI narrative analysis, deterministic mock scoring, comparison dashboards and print-friendly report previews.

## Current Product Status

- Landing page is client-facing and links to the guided demo, workspace and project dashboard.
- Workspace map supports Mapbox, basemap switching, demo layers, open-geodata baseline context, uploaded GeoJSON layers, point/object selection and selected geometry highlights.
- Command Panel keeps Scenario and Custom Query near the top, Guided Demo compact and secondary, and a pinned bottom CTA.
- Express Analysis supports deterministic scoring and optional server-side OpenAI narrative analysis with mock fallback.
- Report preview shows decision summary, map context, selected point/polygon geometry, data/source lineage and limitations.
- Comparison supports 2-3 selected points or objects, with context-aware footer CTA.
- Project dashboard shows demo project purpose, data readiness, recent activity and next actions.

## Exact Demo Path

1. Open `/`.
2. Click **Launch guided demo** or open `/workspace`.
3. In `/workspace`, use **Load demo data** if the guided preset is not already loaded.
4. Confirm demo CSV metrics and demo GeoJSON screening sites appear under Data Sources.
5. Confirm a selected site/polygon or select a point/object manually.
6. Choose or confirm the Scenario.
7. Click **Run Express Analysis**.
8. Review map context, decision posture, score overview, evidence/source lineage and limitations.
9. Return to map, add 2-3 sites to comparison or click **Add demo sites**.
10. Click **Compare Selected** from the bottom CTA.
11. Open report preview or project dashboard.

## Data Honesty Statement

This demo uses local sample data, demo-normalized spatial layers, uploaded-style CSV/GeoJSON fixtures, OSM-style sample baseline context and planned validation-source metadata. It does not use live DLD, Dubai Pulse or GeoDubai integrations. It does not include official parcel, zoning, cadastral, planning or official risk-zone boundaries. Official/customer validation sources must be agreed and connected before real investment, credit, development, planning or operational decisions.

## Commands Run

| Command | Result | Notes |
| --- | --- | --- |
| `npm install` | Pass | Dependencies already up to date. |
| `npm run build` | Pass | Next.js production build, type and lint validation completed. |
| `npm run ingest:dld` | Pass | Local sample DLD / Dubai Pulse-style normalized outputs written; Supabase not configured. |
| `npm run ingest:open-geodata` | Pass | Local open-geodata baseline normalized. |
| `npm run dev -- --hostname 127.0.0.1 --port 3006` | Partial | Blocked by environment `listen EPERM`; browser QA must be run locally. |

## Routes Checked

The following route files exist and are covered by the production build:

- `/`
- `/workspace`
- `/projects`
- `/api/health`
- `/api/db/health`
- `/api/projects`
- `/api/analysis-runs`
- `/api/reports`
- `/api/open-geodata`
- `/api/market-metrics`

HTTP route QA is marked Partial in this environment because local server binding is blocked by `listen EPERM`.

## Known Limitations

- Browser/manual QA must be completed locally or in Vercel Preview.
- Mapbox rendering requires `NEXT_PUBLIC_MAPBOX_TOKEN`.
- OpenAI narrative analysis requires server-only `OPENAI_API_KEY`; otherwise mock fallback is expected.
- Supabase/PostGIS remains optional; local/demo fallback is expected when it is not configured.
- Uploads are stored in browser `localStorage` only.
- Report export is print-preview based, not a server-generated PDF.
- Scores are deterministic demo scores, not a validated underwriting or planning model.
- Source lineage is designed for transparency but current data is sample/demo/local unless explicitly validated by the user.

## What Is Not Pilot-Ready Yet

- Authentication, authorization and tenant separation.
- Source access agreements and production data licensing.
- Live official DLD, Dubai Pulse, GeoDubai or municipal GIS adapters.
- Validated official parcel, zoning, planning, cadastral or risk-zone data.
- Production-grade persistence, audit logs and governance.
- QA-tested PDF/report generation workflow.
- Formal model evaluation, prompt evaluation and analysis quality benchmark.
- Customer-specific validation workflow and sign-off.

## Remaining Risks

- P0: None identified from build/static checks.
- P1: Browser QA is incomplete in this environment because local server binding is blocked.
- P1: Mapbox visual QA depends on a valid token and network access.
- P1: Guided demo auto-load should be manually checked in `/workspace?guidedDemo=dubai-marina-investment`.
- P2: Long uploaded dataset names and edge-case invalid files need browser QA.
- P2: Report print layout should be checked in Chrome/Safari before client demo.

## QA Matrix

| Area | Status | Notes | Remaining risk | Priority |
| --- | --- | --- | --- | --- |
| Landing | Partial | Build passes; manual visual QA required locally. | Hero should be checked at 1728, 1440, 1280 and mobile-ish widths. | P1 |
| Hero dashboard | Partial | Recent mockup simplification is in code and build passes. | Browser visual confirmation required. | P1 |
| Workspace map | Partial | Route and build pass. | Requires Mapbox token and browser QA. | P1 |
| Spatial Layers panel | Partial | Existing code compiles. | Must manually verify containment and toggles. | P1 |
| Basemap switcher | Partial | Existing code compiles. | Must manually verify uploaded GeoJSON remains visible after switch. | P1 |
| Scenario selector | Pass | Command Panel order keeps Scenario above Guided Demo. | Browser first-screen confirmation still recommended. | P2 |
| Guided demo | Partial | Presets and local sample loaders compile. | Must manually verify URL auto-load and all three presets. | P1 |
| Data upload | Partial | Upload code compiles and sample fixtures exist. | Browser checks for valid/invalid file handling required. | P1 |
| Data sources | Partial | Source lineage components compile. | Need browser confirmation with demo CSV/GeoJSON loaded. | P1 |
| Express analysis | Partial | API route and dashboard compile. | Manual point/object/uploaded polygon analysis required. | P1 |
| Report preview | Partial | Report components compile. | Manual report open/print QA required. | P1 |
| Report map geometry | Partial | Map preview components compile. | Need manual selected point/polygon visibility check. | P1 |
| Data used/source lineage | Partial | Structured evidence components compile. | Need manual report review with uploaded and demo data. | P1 |
| Comparison | Partial | Context-aware CTA and dashboard compile. | Manual add/remove/2-3 item comparison QA required. | P1 |
| Projects dashboard | Partial | Route and dashboard compile. | Manual copy/readiness check required. | P2 |
| API health | Partial | Route exists and build passes. | HTTP response check requires local/Vercel server. | P2 |
| DB health | Partial | Route exists and build passes. | HTTP response check requires local/Vercel server. | P2 |
| Sample ingestion | Pass | `ingest:dld` and `ingest:open-geodata` passed. | Outputs should be committed only when intended. | P2 |
| Data honesty copy | Pass | Risky claims scanned; one older doc phrase was softened. | Continue avoiding live/official claims in demos. | P2 |
| Build | Pass | `npm run build` passed. | Re-run before client demo. | P0 |
