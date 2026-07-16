# Supabase DB Baseline v1

Date: 2026-07-08
Project: `geoai-dev`
Supabase ref: `pphdqkurxneyagvnnjdt`
Region: `eu-west-1`

## Status

Supabase DB baseline was upgraded from metadata/source-lineage foundation to a persisted demo/project workspace baseline and activated in Vercel Preview.

This is **not** production-ready, pilot-ready, legal, cadastral, zoning, planning, ownership or valuation validation.

Required caveat: **Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.**

> **Historical ledger correction — 2026-07-16.** The migration table below recorded repository-side names, not the exact live ledger. The authoritative [migration ledger baseline](../supabase/migration-ledger-baseline.json) shows that the combined `20260708132300` draft was never the applied ledger entry; Preview read access is split into `20260708132308` policies and `20260708132343` grants. Do not replay migration names from this historical page.

## Preview activation result

| Check | Result |
| --- | --- |
| Preview deployment | READY |
| Preview URL | `https://geoai-28v4sh6bs-geoaidev.vercel.app` |
| Branch alias | `https://geoai-mvp-git-supabase-db-baseline-v1-geoaidev.vercel.app` |
| `/api/db/health` | `repositoryMode=supabase`, `tablesReady=true`, `missingTables=[]` |
| Runtime mode | `supabase_read_only_ready` |
| Local API fallback | `false` |
| Source registry snapshots | 5 readable rows |
| External data snapshots | 5 readable rows |
| Projects API | `mode=supabase`, 5 persisted demo projects |
| Analysis runs API | `mode=supabase`, seeded analysis rows readable |
| Reports API | `mode=supabase`, 10 seeded reports readable |
| Storage | Not ready; buckets not created |
| Auth / hard access | Not configured; soft public demo mode remains active |

## Applied and documented migrations

| Version | Migration | Status |
| --- | --- | --- |
| `20260705102844` | `geoai_pilot_persistence_foundation` | Existing live DB foundation |
| `20260705103329` | `geoai_source_registry_seed_v1` | Existing live DB seed |
| `20260708120003` | `geoai_db_foundation_hardening_v1` | Applied live DB / documented in repo |
| `20260708120117` | `geoai_demo_project_baseline_seed_v1` | Applied live DB / documented in repo |
| `20260708132300` | `geoai_preview_demo_read_access_v1` | Applied live DB / documented in repo |

## What changed in DB

### Hardening

- Added FK-covering indexes for GeoAI project/workflow/report/data-room/audit tables.
- Added unique indexes required for idempotent baseline seed.
- Replaced `geoai_set_updated_at()` with explicit `SET search_path = public`.
- Optimized profile self-read policy to use `(select auth.uid())`.

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

### Preview read access

- Added read-only demo policies for demo/sample rows.
- Added PostgREST `SELECT` grants required for Preview read probes.
- RLS remains enabled on GeoAI tables.
- This does not enable confidential client access, hard access, auth enforcement or production access control.

## Code changes required for Preview activation

- Supabase server client now uses a literal dynamic import so Vercel bundles the dependency.
- The internal Supabase client adapter remains loosely typed to avoid repository-layer type regressions.
- Preview runtime is pinned to the GeoAI Supabase project reference `pphdqkurxneyagvnnjdt`.
- Temporary diagnostic endpoint `/api/db/probe` was removed before merge-readiness review.

## Current limitations

The database is now reachable from Preview, but the system is still not production-ready or pilot-ready.

Remaining blockers:

1. Supabase Storage buckets are not created:
   - `geoai-data-room-assets`
   - `geoai-validation-evidence`
   - `geoai-report-exports`
   - `geoai-aoi-imports`
2. Signed upload/download flows are not verified.
3. Supabase Auth is not configured for hard client access.
4. Hard access enforcement is not enabled.
5. Audit write/read durability is not fully verified.
6. Production env was not configured or redeployed.

## Security/advisor notes

Supabase advisor still reports expected items that were intentionally not auto-fixed:

1. `public.spatial_ref_sys` has RLS disabled. Supabase warned not to auto-enable RLS without choosing policies because it may block spatial reference access.
2. PostGIS is installed in `public`. Moving extension schema is a separate controlled migration.
3. GeoAI security-definer helper functions are visible as RPC-callable; changing execution rights requires a dedicated auth/RLS pass.
4. Some indexes may be marked unused until sustained Supabase-backed app traffic runs.

## Next activation steps

1. Complete PR #47 pre-merge review.
2. Merge PR #47 only after explicit approval.
3. Create Supabase Storage buckets in a separate controlled Storage Readiness pass.
4. Verify signed URL upload/download flows in a trusted environment.
5. Verify audit write/read durability.
6. Only after Preview + Storage pass, decide whether to configure Production env.
7. Do not enable hard access until Supabase Auth, memberships, RLS and Storage are verified.

## Out of scope

- No production runtime activation was performed.
- No Supabase Storage buckets were created.
- No auth hardening or hard access enforcement was enabled.
- No official DLD/GeoDubai live integration was connected.
