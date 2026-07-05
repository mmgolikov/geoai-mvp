# GeoAI Pilot UX v3.2 - Criteria Search Flow and BI Dashboard

GeoAI Pilot UX v3.2 corrects the criteria-first product flow and rebuilds the analysis dashboard around a curated BI model.

## What Changed

- Criteria-first mode no longer shows candidate cards or map overlays before search.
- Criteria-first users now set filters first, then run a scenario-specific search such as `Find redevelopment zones`, `Find hotel zones`, `Find residential projects` or `Build route options`.
- Candidate results are stored as an explicit searched set. Changing role, scenario, mode, filters or custom query invalidates the set and returns the primary action to `Update search`.
- Searched candidates can be compared as a ranked shortlist or opened as individual candidate dashboards.
- The Express Analysis dashboard now uses a structured dashboard model with curated KPIs, drivers, risks, validation gaps, actions and scenario modules.
- The first dashboard screen is organized as map context plus a decision cockpit with suitability, KPI row, top drivers, top risks and recommended next action.
- Long report-style sections were replaced by compact drill-down modules, with evidence/source details collapsed last.
- The landing page now explains what GeoAI is, how to use it, supported product modes, scenario examples and expected outputs without demo/status language.

## Criteria-First Flow

1. Choose Criteria-first mode.
2. Set scenario filters and optional query.
3. Run candidate search.
4. Review search results on the map and in the panel.
5. Compare all searched candidates or select one candidate for individual analysis.

Map-first analysis remains unchanged: select a point, object or AOI, then run Express Analysis.

## Data Honesty

Outputs remain screening hypotheses. Official/client validation is required before treating any result as legal, cadastral, zoning, planning, ownership, valuation, title, lending, investment or development evidence.

## Known Limitations

- Candidate generation and scoring remain deterministic MVP logic over sample/open context.
- Official Dubai planning, cadastral, transaction, ownership and risk-layer connectors are not production-connected.
- OpenAI analysis remains optional; deterministic fallback keeps the workspace usable without `OPENAI_API_KEY`.
