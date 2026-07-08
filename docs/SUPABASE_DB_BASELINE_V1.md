# Supabase DB Baseline v1

Date: 2026-07-08
Project: `geoai-dev`
Supabase ref: `pphdqkurxneyagvnnjdt`
Region: `eu-west-1`

## Status

Supabase DB baseline was upgraded from metadata/source-lineage foundation to a persisted demo/project workspace baseline.

This is **not** production-ready, pilot-ready, legal, cadastral, zoning, planning, ownership or valuation validation.

Required caveat: **Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.**

## Applied migrations

| Version | Migration | Status |
| --- | --- | --- |
| `20260705102844` | `geoai_pilot_persistence_foundation` | Existing |
| `20260705103329` | `geoai_source_registry_seed_v1` | Existing |
| `20260708120003` | `geoai_db_foundation_hardening_v1` | Applied 2026-07-08 |
| `20260708120117` | `geoai_demo_project_baseline_seed_v1` | Applied 2026-07-08 |

## What changed in DB

### Hardening

- Added FK-covering indexes for GeoAI project/workflow/report/data-room/audit tables.
- Added unique indexes required for idempotent baseline seed:
  - `ux_pilot_workflows_project_key`
  - `ux_validation_checklist_project_title`
  - `ux_pilot_client_inputs_project_title`
  - `ux_pilot_deliverables_project_title`
  - `ux_data_room_assets_project_name_type`
- Replaced `geoai_set_updated_at()` with explicit `SET search_path = public`.
- Optimized `geoai profiles self read` policy to use `(select auth.uid())`.

### Baseline seed

Seeded durable demo/project baseline data:

| Table | Rows after seed |
| --- | ---: |
| `organizations` | 1 |
| `profiles` | 1 |
| `projects` | 5 |
| `project_memberships` | 5 |
| `pilot_workflows` | 5 |
| `pilot_client_inputs` | 15 |
| `pilot_deliverables` | 15 |
| `validation_checklist_items` | 20 |
| `analysis_runs` | 10 |
| `comparison_sets` | 5 |
| `reports` | 10 |
| `data_room_assets` | 10 |
| `source_registry_snapshots` | 5 |
| `external_data_snapshots` | 5 |
| `audit_events` | 1 |

Seeded projects:

| Project key | Segment | Use case |
| --- | --- | --- |
| `dubai-investment-screening-demo` | B2B | Fund/family-office investment screening |
| `developer-land-pipeline-demo` | B2B | Developer land pipeline |
| `bank-asset-review-demo` | B2B | Bank collateral / asset review |
| `home-buyer-neighborhood-demo` | B2C | Home-buyer neighborhood fit |
| `family-relocation-area-demo` | B2C | Family relocation area review |

## Current limitations

The database now has a proper persisted demo/project baseline, but the application runtime is still not connected to Supabase until Vercel environment variables are configured:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Current production runtime remains `local_api_fallback` until these env vars are configured and redeployed.

## Security/advisor notes

Supabase advisor still reports expected items that were intentionally not auto-fixed:

1. `public.spatial_ref_sys` has RLS disabled. Supabase warned not to auto-enable RLS without choosing policies because it may block spatial reference access. Leave as explicit review item.
2. PostGIS is installed in `public`. Moving PostGIS extension schemas is a separate migration and can break spatial types if rushed.
3. GeoAI security-definer helper functions are visible as RPC-callable. These are used by RLS helper policies; revoking execution requires a dedicated auth/RLS test pass.
4. Many indexes are marked unused immediately after creation. This is expected until app traffic uses Supabase-backed paths.

## Next activation steps

1. Configure Vercel Preview env only, not Production first.
2. Redeploy Preview and smoke test:
   - `/api/db/health`
   - `/api/projects`
   - `/api/analysis-runs?projectKey=dubai-investment-screening-demo`
   - `/api/reports`
   - `/api/data-room`
   - `/api/platform/activation-status`
3. Verify the UI uses Supabase-backed projects/reports while preserving all caveats.
4. Only after Preview passes, decide whether to configure Production env.
5. Do not enable hard access until Supabase Auth, memberships, RLS and storage policies are fully tested.

## Out of scope

- No Vercel env vars were changed by this DB migration pass.
- No production runtime activation was performed.
- No Supabase Storage buckets were created.
- No auth hardening or hard access enforcement was enabled.
- No official DLD/GeoDubai live integration was connected.
