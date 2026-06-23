# Persistence v0.1

GeoAI Persistence v0.1 uses the optional Supabase/PostGIS foundation to save analysis runs and report metadata when Supabase is configured. The app remains fully usable without Supabase.

## What Is Persisted

When Supabase is configured and reachable:

- Express Analysis runs are upserted into `analysis_runs`.
- Report/export preview payloads are upserted into `reports`.
- Recent analysis history can be loaded from `/api/analysis-runs`.

Analysis run payloads include:

- `runKey`
- scenario id
- selected site/object name
- selection type
- selected coordinates or centroid
- selected spatial feature id/key when available
- structured input context
- structured result JSON
- decision posture
- confidence and data confidence
- analysis mode
- created timestamp

Report payloads include:

- report key
- related run key when available
- title
- selected site/object
- scenario
- memo/report JSON
- decision posture
- score overview
- key value drivers
- critical constraints
- data gaps
- due diligence checklist
- evidence/source readiness
- limitations
- generated timestamp

Binary PDF storage is not implemented in v0.1. Reports remain screen/print-first.

## What Remains Local / Demo

- Map interactions and active workspace state remain client-side.
- Comparison mode remains local state.
- Browser localStorage history remains as the fallback.
- Demo layers, demo-normalized market context, and deterministic scoring remain the default product behavior.
- No external data APIs are connected.
- No authentication, workspaces, or multi-tenancy are implemented yet.

## Fallback Behavior

If Supabase environment variables are missing, invalid, or unavailable:

- `/api/db/health` returns local/demo status.
- `/api/analysis-runs` returns `mode: "local_fallback"`.
- `/api/reports` returns `mode: "local_fallback"`.
- Analysis and report UI continue to work.
- Local browser history remains available.

Persistence requests are best-effort. A failed save should never block the dashboard, comparison, memo, print, or export flow.

## API Routes

- `GET /api/db/health`
  - Returns Supabase readiness without exposing secrets.

- `GET /api/analysis-runs?limit=10`
  - Returns recent DB-backed analysis runs when configured.
  - Returns `{ mode: "local_fallback", items: [] }` when not configured.

- `POST /api/analysis-runs`
  - Saves or upserts an analysis run when configured.
  - Returns Local/API fallback success when not configured.

- `POST /api/reports`
  - Saves or upserts report metadata and structured report JSON when configured.
  - Returns Local/API fallback success when not configured.

## Test Without Supabase

1. Do not set Supabase environment variables.
2. Run the app locally.
3. Open `/workspace`.
4. Select a point or demo object.
5. Run Express Analysis.
6. Confirm local Analysis History appears.
7. Open `/api/analysis-runs` and confirm it returns `local_fallback` mode.
8. Export a report and confirm the report preview opens normally.

## Test With Supabase

1. Apply migrations:

```bash
supabase db push
```

2. Seed source metadata:

```bash
supabase db seed
```

3. Set environment variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

4. Run Express Analysis.
5. Confirm `analysis_runs` receives or updates a row.
6. Export an analysis report.
7. Confirm `reports` receives or updates a row.
8. Refresh the workspace and confirm Analysis History can display DB-backed items.

## Limitations

- No user authentication.
- No workspaces/projects.
- No row-level security policies are enabled yet.
- No customer data governance, retention, or audit model.
- No binary PDF storage.
- No DB-backed comparison set persistence in the UI yet.
- No external data adapters are connected.
- Stored JSON payloads should not contain secrets or unredacted sensitive customer data.

## Next Steps

- Add auth and workspace ownership.
- Add RLS policies and tenant isolation.
- Persist comparison sets.
- Add saved projects/studies.
- Add report artifact storage for generated PDFs.
- Add real data ingestion jobs with source metadata and audit trails.
- Add PostGIS-backed spatial feature reads behind the existing map layer adapter.
