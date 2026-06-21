# Persistence & Project Workspace v0.8

Date: 2026-06-21

GeoAI v0.8 adds the first MVP persistence foundation. The goal is to stop treating the workspace as purely session-only while preserving the current controlled-demo flows and keeping Supabase/PostGIS optional.

## Persistence Model

v0.8 defines shared workspace entities in `src/lib/project-workspace-types.ts`:

- Project
- AnalysisRun
- Report
- ComparisonSet
- UploadedDatasetRecord
- SourceLineageSnapshot

Each saved analysis, report and comparison carries a source-lineage snapshot. The snapshot stores demo/sample evidence, uploaded dataset metadata, external source context, planned validation sources, timestamps and disclaimers. Saved objects therefore do not depend only on mutable current registry state.

## Local Fallback Behavior

When Supabase is not configured, API routes use a lightweight JSON-backed local fallback under `data/local-fallback/*.json`. These runtime files are ignored by Git. The app remains usable without Supabase:

- Analysis runs can be saved/listed through `/api/analysis-runs`.
- Reports can be saved/listed through `/api/reports`.
- Comparison sets can be saved/listed through `/api/comparison-sets`.
- Uploaded dataset metadata can be saved/listed through `/api/uploaded-datasets`.

Browser workspace history and uploaded parsed content still use localStorage where appropriate. Large file storage is not implemented in v0.8.

## Supabase Behavior

Existing Supabase repositories remain optional. If Supabase is configured, analysis runs and reports use the existing DB repository pattern. v0.8 adds a migration for:

- `comparison_sets`
- `uploaded_dataset_records`

If Supabase is not configured, `/api/db/health` should continue to state that Supabase/PostGIS is not configured and local fallback is active.

## API Routes

- `GET /api/projects`
- `GET /api/analysis-runs`
- `POST /api/analysis-runs`
- `GET /api/reports`
- `GET /api/reports?projectKey=<project>`
- `GET /api/reports?id=<report>`
- `POST /api/reports`
- `GET /api/comparison-sets`
- `POST /api/comparison-sets`
- `DELETE /api/comparison-sets?id=<id>`
- `GET /api/uploaded-datasets`
- `POST /api/uploaded-datasets`
- `DELETE /api/uploaded-datasets?id=<id>`

All routes return local fallback responses when Supabase is not available.

## Workspace Behavior

- Running Express Analysis continues to generate the dashboard and posts an AnalysisRun.
- Opening/exporting report preview posts a Report.
- Clicking Compare Selected posts a ComparisonSet.
- Uploading CSV/GeoJSON stores project-scoped uploaded dataset metadata.
- Persistence failures are non-blocking; analysis, reports, comparison and upload still work locally.

## Project Dashboard

The Project Dashboard now reads saved analyses, reports, comparison sets and uploaded dataset metadata from the API fallback. If no saved records exist, it shows honest empty states:

- "No saved reports yet"
- "No saved comparison sets yet"

It does not pretend real client history exists.

## Data Honesty

Saved objects remain demo/local unless externally validated. v0.8 does not add live official DLD, Dubai Pulse, GeoDubai, parcel, zoning, cadastral, ownership or real-time integrations. Official validation is required before operational, investment, credit, planning or insurance decisions.

## Limitations

- No authentication or multi-tenant security.
- No production file/blob storage.
- No server-generated PDF library.
- Local JSON fallback is for MVP/demo continuity, not production data governance.
- Comparison/report reopening is API-supported, but a full in-app report library is still future work.
- Supabase schema alignment is prepared, but production use requires deployment, RLS/security review and QA.

## Remaining Work Before Pilot Readiness

1. Add auth, tenant isolation and permissions.
2. Add durable report/comparison library UI.
3. Add production file storage for uploaded datasets.
4. Add audit logs and evidence versioning.
5. Validate official/customer data source access, licensing and refresh policies.
6. Add automated route and persistence tests.
