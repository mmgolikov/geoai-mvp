# Projects / Workspaces v0.1

GeoAI Projects / Workspaces v0.1 introduces lightweight project organization for the MVP. The goal is to make analyses, comparison sets, and reports feel connected to a business context instead of behaving like one-off map actions.

The app still works fully without Supabase. When the database is unavailable, GeoAI uses local demo projects and browser history fallback.

## Why Projects Exist

A project represents a client or business workflow context, such as:

- Dubai Investment Screening Demo
- Developer Land Pipeline Demo
- Bank Asset Review Demo
- Family Office Site Shortlist
- Climate Risk Review

Projects prepare the product for pilot workflows where multiple analyses, memos, and comparisons belong to the same client workspace.

## Implemented In v0.1

- Active project selector in the workspace command panel.
- Three local demo projects available without Supabase.
- Project selection persisted in localStorage.
- Project context included in analysis history, analysis persistence payloads, report payloads, report preview, and print memo output.
- Project-scoped analysis history display.
- `/api/projects` route with DB-backed projects when Supabase is configured and local demo fallback otherwise.
- Supabase migration for the `projects` table and nullable `project_id` links.

## Demo Projects

The bundled demo projects are:

- Dubai Investment Screening Demo
- Developer Land Pipeline Demo
- Bank Asset Review Demo

These are demo-normalized workspace contexts. They do not represent real client data rooms or private customer projects.

## Database Schema Changes

Migration:

```text
supabase/migrations/20260618_0004_projects_workspaces.sql
```

Adds:

- `projects`
- `analysis_runs.project_id`
- `reports.project_id`
- `comparison_sets.project_id`
- `project_key` and `project_name` convenience fields for backwards-compatible payloads

Indexes are added for project key, status, client type, and project-linked analysis/report/comparison records.

## Local Fallback Behavior

Without Supabase:

- `/api/projects` returns local demo projects.
- Active project is stored in browser localStorage.
- Analysis history remains local.
- Reports remain screen/print-first.
- No workspace behavior is blocked.

With Supabase configured:

- `/api/projects` can return DB projects.
- Analysis runs include project context and `project_id` when the active project exists in DB.
- Report persistence includes project context and `project_id`.
- History can show DB-backed runs scoped to the active project.

## How Project Context Flows

When Express Analysis runs:

- The active project is attached to the local analysis object.
- The local history item stores `projectKey`.
- `/api/analysis-runs` receives project key/name/id context.
- Report export uses the same project context.

When a memo/report is opened:

- The report preview shows project name and data mode.
- The print memo includes project, client type, and data mode.

## Limitations

- No authentication.
- No organizations.
- No roles or permissions.
- No real client data rooms.
- No billing.
- No project deletion or archive UI.
- Comparison set persistence is prepared at schema level but not yet a full saved-comparison workflow.
- Project rows are not tenant-isolated; RLS and workspace ownership are required before production.

## Next Steps

- Add auth.
- Add organizations.
- Add user roles and project-level permissions.
- Add RLS policies and workspace ownership.
- Add client data rooms and document management.
- Persist saved comparison sets.
- Add portfolio uploads and project-level data ingestion.
- Add project dashboard summary and saved memo library.
