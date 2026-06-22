# GeoAI Project-Scoped Persistence v13

Date: 2026-06-22

## Purpose

This note documents the project-scoped persistence baseline for the Projects dashboard. GeoAI now treats analyses, reports, comparisons and uploaded dataset metadata as belonging to a specific project whenever project metadata is available.

## Scope

Project-scoped records include:

- Analysis runs
- Recent activity rows
- Printable reports and memos
- Comparison sets
- Uploaded dataset metadata
- Project dashboard KPI counts

## Active Project Rule

The Projects dashboard derives every activity section from the active project key:

- If a record has `projectKey` or `project_key`, it is shown only for that matching project.
- If a record has project metadata nested under `project`, `analysis.project`, `payload.project` or `reportPayload.project`, that project key is used.
- Legacy local fallback records with no project metadata are treated as belonging only to `dubai-investment-screening-demo`.
- Unscoped legacy records must not appear in every project dashboard.

This keeps old local fallback data safe while preventing cross-project leakage.

## Demo Seed Mapping

The local demo fallback now uses project-specific seed records:

### Dubai Investment Screening Demo

- Recent analyses:
  - Dubai Marina / JBR Market Signal
  - Business Bay Infill Opportunity
- Primary scenario: Investment Site Selection
- Report: Investment Screening Memo
- Comparison: Dubai Marina vs Business Bay vs Dubai South

### Developer Land Pipeline Demo

- Recent analyses:
  - Dubai South Growth Node
  - JVC / JVT Residential Pipeline Signal
- Primary scenario: Real Estate Development
- Report: Development Screening Memo
- Comparison: Dubai South vs JVC/JVT vs MBR City

### Bank Asset Review Demo

- Recent analyses:
  - Meydan / MBR City Collateral Review
  - Business Bay Asset Evidence Gap
- Primary scenario: Asset Portfolio Intelligence
- Report: Collateral Context Memo
- Comparison: MBR City vs Business Bay collateral context

## Workspace Handoff

Project dashboard links pass the active project into the workspace using `projectId`. The workspace accepts both `projectId` and `projectKey` so demo projects and future DB-backed projects can restore the correct active context.

When a new analysis, comparison, report or uploaded dataset metadata record is saved, the workspace includes:

- `projectId`
- `projectKey`
- project name/context where available

## Current Limitations

- This is still an MVP local/Supabase fallback persistence layer.
- Demo project IDs can be `null`; the stable demo identifier remains `projectKey`.
- Historical records saved before project scoping may not include project metadata and are intentionally limited to the default investment screening demo.
- Official customer, cadastral, zoning and valuation validation remain outside this persistence baseline.

## QA Checklist

- Switch each project in `/projects` and confirm header, KPIs, recent analyses, reports and comparisons update immediately.
- Confirm the default project shows only investment-screening demo rows.
- Confirm the developer project shows only land-pipeline demo rows.
- Confirm the bank project shows only collateral-review demo rows.
- Use Run new analysis from each project and confirm `/workspace` opens with the same active project.
- Save a new analysis/report/comparison and confirm it appears only under the active project.
- Confirm old unscoped local fallback records do not leak into non-default projects.
