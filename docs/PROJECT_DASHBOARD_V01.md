# Project Dashboard v0.1

## Purpose

Project Dashboard v0.1 gives GeoAI a project-level control center for investor and client demos. It answers what the active project is, what has been analyzed, what data is available, what confidence level the current evidence supports, and what the user should do next.

This is not an enterprise project management module. It is a lightweight B2B SaaS dashboard for the current GeoAI MVP.

## What Is Implemented

- `/projects` route.
- Active project selector using the same demo project model as the workspace.
- Project summary with client type, primary scenario, geography, data mode and persistence mode.
- KPI cards for analyses, reports, compared sites, data sources, imported market areas and data confidence.
- Recent analysis activity from local history or optional DB analysis runs.
- Report/memo empty state with workspace CTA.
- Comparison shortlist empty state with workspace CTA.
- Data readiness panel showing DLD / Dubai Pulse ingestion status, imported market metrics, Supabase/PostGIS status and source maturity rows.
- Scenario-aware recommended next actions.
- Workspace navigation links back to the dashboard.

## Data Used

The dashboard uses existing GeoAI MVP data paths:

- `src/data/demo-projects.ts` for local demo projects.
- Browser localStorage analysis history for local fallback activity.
- `/api/projects` for optional project list loading.
- `/api/analysis-runs` for optional DB-backed recent analyses.
- `/api/market-metrics` for imported sample market area count and source mode.
- `/api/db/health` for optional Supabase/PostGIS readiness.
- Data Source Registry and source readiness metadata for data confidence messaging.

## Local Fallback Behavior

The dashboard does not require Supabase. If API calls fail or Supabase is not configured, it still renders with:

- Dubai Investment Screening Demo as the default project.
- Local analysis history when available.
- Demo-normalized source confidence.
- Clean empty states for reports and comparison sets.
- Official validation required messaging.

## Future DB-Backed Behavior

The current project dashboard is ready to use optional DB-backed analysis runs when available. Future iterations should add:

- Persistent report library.
- Saved comparison sets.
- Project data room for uploads, sources and files.
- Project-level audit trail and governance.
- Role-based access and client-specific workspaces.
- Dashboard metrics from validated DLD, Dubai Pulse, Dubai Municipality / GeoDubai and customer data.

## Limitations

- No auth or multi-tenancy.
- No saved comparison set library yet.
- Reports are still generated from workspace report preview/print flows.
- Dashboard metrics rely on local/demo state and optional prototype APIs.
- Imported market metrics are sample/demo-normalized and not decision-grade.
- Supabase/PostGIS is optional and not required for demo operation.

## Next Steps

1. Add saved comparison sets.
2. Add persistent report library.
3. Add project data room for documents, CSV and GeoJSON.
4. Add user roles and client-specific workspaces.
5. Connect dashboard metrics to validated real DLD / Dubai Pulse and official planning data.
