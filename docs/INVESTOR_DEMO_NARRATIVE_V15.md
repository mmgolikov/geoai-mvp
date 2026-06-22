# GeoAI Investor Demo Narrative v1.5

Date: 2026-06-23

GeoAI v1.5 adds a guided investor/client narrative layer on top of the existing data-ready demo. It does not introduce live official integrations or production claims. The purpose is to make the current product easier to present to funds, developers, banks and client stakeholders.

Required caveat:

> screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.

## What Changed

- Added `/demo` as a lightweight narrative launcher.
- Added reusable typed demo narratives in `src/data/demo-narratives.ts`.
- Added three guided buyer stories:
  - Fund / Family Office Investment Screening
  - Developer Land Pipeline
  - Bank / Lender Asset Review
- Added compact Demo Script context in the workspace command panel when a narrative is active.
- Linked narratives to existing demo projects, guided workspace presets and project dashboard contexts.
- Added decision question and pilot next action language to report previews and printable reports when project context is available.

## Narrative 1: Fund / Family Office Investment Screening

Project: Dubai Investment Screening Demo

Decision question: Which Dubai locations deserve deeper underwriting before capital is committed?

Story: GeoAI helps an investment team select a target location, run screening analysis, compare alternatives and produce an investment memo starter with source lineage and validation gaps.

## Narrative 2: Developer Land Pipeline

Project: Developer Land Pipeline Demo

Decision question: Which candidate land areas should move into deeper feasibility, planning and infrastructure validation?

Story: GeoAI helps a developer screen candidate land areas, understand infrastructure and maturity assumptions, and prepare a validation checklist before deeper feasibility.

## Narrative 3: Bank / Lender Asset Review

Project: Bank Asset Review Demo

Decision question: Which financed assets need priority validation, monitoring or collateral review attention?

Story: GeoAI helps a lender review location, market confidence, risk posture and evidence gaps without implying a credit decision, valuation or legal conclusion.

## Presenter Flow

1. Open `/demo`.
2. Choose the buyer narrative that matches the audience.
3. Start the demo to open the prepared workspace.
4. Explain the selected site or object and source confidence.
5. Run Express Analysis.
6. Show score cards, evidence cards, decision question and validation caveat.
7. Optionally compare 2-3 sites.
8. Open the printable memo and close with the pilot bridge.

## Current Data State

- DLD / Dubai Pulse: snapshot available, 5 sample market-area records.
- OSM / Geofabrik: open snapshot available, 3 sample features.
- Open-Meteo: screening-level climate context with fallback.
- Copernicus / Sentinel: planned metadata path only.
- GeoDubai / Dubai Municipality: planned validation only.
- DLD API Gateway: planned validation only.

## Limitations

- Not production-ready.
- Not pilot-ready without client data, official/customer validation and implementation controls.
- No live official DLD, Dubai Pulse, GeoDubai, parcel, zoning, cadastral, ownership or valuation integration.
- No durable enterprise persistence unless Supabase/PostGIS is configured.
- No auth, multi-tenant governance or enterprise audit controls yet.
