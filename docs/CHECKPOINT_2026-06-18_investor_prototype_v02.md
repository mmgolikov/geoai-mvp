# GeoAI Investor Prototype Checkpoint v0.2

Date: 2026-06-18

## Project

GeoAI MVP is a Next.js spatial decision intelligence prototype for Dubai real estate, infrastructure, construction, and climate-risk decision workflows.

## Current Product Stage

This checkpoint captures an investor-demo-oriented prototype stage. The product is not production-ready or pilot-ready yet, but it is a strong intermediate demo baseline for showing the GeoAI concept, workspace flow, scenario-based analysis, comparison mode, source confidence model, and memo/report direction.

## What Works Now

- Public landing page with a SaaS-style GeoAI positioning story.
- Improved dashboard-like hero visual for the product preview.
- Dubai-centered Mapbox workspace.
- Point selection on the map with marker and coordinate capture.
- Demo object/spatial layer selection.
- Synthetic/demo geospatial layers and layer controls.
- Scenario selector for real estate, investment, construction, planning, climate risk, and custom queries.
- Express Analysis flow with deterministic scoring.
- Optional OpenAI narrative analysis with mock fallback.
- Structured Evidence / Data Used cards linked to the Data Source Registry.
- Dubai Market Context Adapter using seed/demo-normalized context.
- Spatial Data Adapter with synthetic feature metadata, source status, confidence, and limitations.
- Comparison mode for 2-3 points or objects.
- Local analysis history using browser localStorage.
- Investor/development memo structure in dashboards and report preview.
- Export Report / browser print workflow with a print-only report layout started.
- Command panel behavior improved around first-screen workflow controls and secondary collapsible sections.

## Current Architecture

- Next.js App Router application.
- TypeScript React components for landing, workspace, map, dashboards, panels, comparison, and report preview.
- Mapbox GL JS runs only in browser/client components.
- API routes provide health checks, demo objects, market context, and analysis.
- `/api/analyze` can use server-side `OPENAI_API_KEY` when available, but safely falls back to mock analysis.
- Demo geospatial data and market context are local seed data, not external APIs.
- Data Source Registry and EvidenceItem model describe demo, planned, official, open-data, commercial, and customer source contexts.
- Report preview remains client-side; print output uses a dedicated print-only report DOM.

## Demo Data Limitations

- Spatial geometries are synthetic/demo and are not official parcel, planning, cadastral, utility, infrastructure, or risk-zone boundaries.
- Market context is seed/demo-normalized and should not be presented as official market data.
- Scoring is deterministic mock logic and is not a validated investment, planning, or risk model.
- OpenAI, when enabled, interprets the context narratively but does not produce official findings or validated scores.
- No real DLD, Dubai Pulse, Dubai Municipality / GeoDubai, satellite, transaction, ownership, zoning, or regulatory integrations are connected yet.
- Supabase/PostGIS, projects, and persistence foundations exist as optional prototype paths, but there is no production-grade authentication, user account model, RLS hardening, audit trail, or saved-study governance yet.

## Known UX / Product Issues

- Landing hero and investor-facing visual language should continue to be tested on real laptop and desktop viewports.
- Print/PDF export now has a print-only memo direction, but should be manually checked in Chrome/Safari print dialogs.
- Browser print headers/footers still depend on user print settings.
- Comparison remains local/demo oriented; analysis history and reports can use optional persistence foundations but are not production-grade saved studies yet.
- Map layer styling and synthetic geometries are good enough for demo, but official data quality will determine pilot credibility.
- The command panel has improved first-screen behavior, but should be QA-tested across common viewport heights.
- Report content still needs a production-grade editorial structure before pilot delivery.

## Next Recommended Iteration

1. Manual QA pass on `/`, `/workspace`, Express Analysis, Comparison, Analysis History, and Report Print.
2. Tighten landing page responsiveness and investor-demo copy after visual review.
3. Harden print-only report layout with real PDF checks and smaller report variants.
4. Add saved studies architecture design before introducing a database.
5. Prepare real data adapter plan for DLD, Dubai Pulse, Dubai Municipality / GeoDubai, OSM, satellite, and customer uploads.
6. Add production guardrails for OpenAI prompts, response validation, confidence language, and source limitations.
7. Define pilot workflow requirements for developers, funds, banks, and government/client use cases.

## Checkpoint Note

This is a good investor-demo checkpoint for GeoAI v0.2. It demonstrates the intended product direction and decision workflow, but it should not be described as production-ready, pilot-ready, or supported by official real estate/GIS evidence until real data adapters, persistence, QA, security, and governance are implemented.
