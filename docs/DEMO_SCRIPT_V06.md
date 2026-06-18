# GeoAI Guided Demo Script v0.6

Date: June 18, 2026

GeoAI v0.6 is an investor/client demo prototype for Dubai/UAE spatial decision intelligence. It is not production-ready or pilot-ready. The guided demo uses local demo samples, demo-normalized layers, uploaded-style CSV/GeoJSON fixtures and planned source-lineage language.

## Recommended Opening Narrative

"GeoAI helps real estate, development, lending and public-sector teams turn map selections, uploaded site data and spatial context into decision-ready memos. This demo shows the workflow using local sample data only. Official DLD, Dubai Pulse, GeoDubai, parcel, zoning and risk validation sources are not live-connected in this prototype."

## 5-7 Minute Click Path

1. Open `/`.
2. Click **Launch guided demo**.
3. In `/workspace`, confirm the **Guided demo** card is visible.
4. Click **Load demo data** if the scenario did not auto-load from the URL.
5. Confirm **Demo CSV metrics** and **Demo GeoJSON screening sites** appear in Data Sources.
6. Confirm a demo polygon is selected on the Dubai map.
7. Click **Run Express Analysis**.
8. Show the decision dashboard: map context, decision posture, score overview, evidence, confidence and limitations.
9. Click **Back to map**.
10. Select another demo polygon or click **Add demo sites**.
11. Click **Compare Selected**.
12. Show the comparison dashboard: best option, scores, differentiated risks and next actions.
13. Click **Export comparison** or return to an analysis result and click **Export Report**.
14. Open `/projects` and show the project dashboard narrative.

## What To Say On Each Screen

Landing:
"The landing page summarizes who GeoAI serves: developers, funds, banks, insurers and public-sector teams. The key value is faster screening with clearer evidence and validation gaps."

Workspace map:
"The workspace is the decision cockpit. We can select a point, demo object or uploaded polygon. The current guided scenario loads a local CSV metric sample and a local GeoJSON site sample."

Command panel:
"The right panel keeps controls compact: project, selection, guided demo preset, scenario, query and data-source status. The primary analysis action stays pinned at the bottom."

Analysis dashboard:
"Scores are deterministic demo scores. The narrative may be AI-generated when a server-side OpenAI key is configured, otherwise it falls back to deterministic demo analysis. Evidence cards show what data was used and whether it is sample, planned, open or validation-required."

Comparison:
"Comparison is a decision-support view, not an underwriting model. It helps shortlist locations and identify which evidence gaps need validation first."

Report:
"The report preview is a print-friendly client memo structure. It includes the selected geometry, scores, summary, risks, actions, evidence and limitations."

Project dashboard:
"Projects organize the demo narrative by client type. This is still local/demo-first unless Supabase/PostGIS is configured."

## What Not To Claim

Do not claim:
- live DLD integration
- live Dubai Pulse data
- live GeoDubai GIS
- official parcel boundaries
- official zoning boundaries
- validated official risk zones
- production-ready platform
- pilot-ready product

Use these phrases instead:
- "local demo sample"
- "sample/offline metrics"
- "demo-normalized context"
- "uploaded-style CSV/GeoJSON"
- "official validation required"
- "planned validation source"
- "not official evidence"

## Demo Variants

Investor:
Use **Dubai Marina investment screening**. Emphasize site screening, evidence confidence, opportunity/risk posture and exportable memo.

Developer / Master Developer:
Use **Dubai South development pipeline**. Emphasize growth context, infrastructure readiness, planning validation needs and development potential.

Fund / Family Office:
Use **Dubai Marina investment screening** plus comparison. Emphasize shortlist discipline, downside risks, source confidence and due diligence actions.

Bank / Lender:
Use **Bank asset review / collateral screening**. Emphasize collateral context, data confidence, spatial risk exposure and lender-ready review language.

Government / Authority:
Use the workspace layers and project dashboard. Emphasize land/object monitoring workflows, uploaded local data, planned official validation and evidence lineage.

## Data Honesty Statement

"This prototype demonstrates the GeoAI workflow using local demo samples, demo-normalized spatial layers and uploaded-style CSV/GeoJSON. It does not use live official DLD, Dubai Pulse or GeoDubai integrations. Official validation sources must be agreed and connected before operational, investment, credit or planning decisions."

## Fallback Steps

If Mapbox does not load:
- Explain that a public Mapbox token is required in `NEXT_PUBLIC_MAPBOX_TOKEN`.
- Use the rest of the interface to show scenario, evidence and reports if available.

If guided demo data does not load:
- Open `/workspace`.
- Use the command panel **Load demo data** button.
- Confirm Data Sources shows demo CSV and GeoJSON rows.

If analysis fails:
- The app should use demo fallback.
- Say: "The fallback keeps the demo deterministic when AI is unavailable."

If comparison fails:
- Return to map.
- Click **Add demo sites**.
- Click **Compare Selected** again.

If report preview fails:
- Return to dashboard.
- Show the dashboard evidence and memo sections directly.

## Recommended Closing Narrative

"GeoAI is ready for a controlled pilot definition conversation, not production operation. The next step is a 2-4 week pilot using uploaded client data and agreed validation sources, with a source registry, evidence model and client memo workflow tailored to the target decision."

## Pilot Ask

GeoAI can run a 2-4 week pilot using uploaded client data and agreed validation sources.
