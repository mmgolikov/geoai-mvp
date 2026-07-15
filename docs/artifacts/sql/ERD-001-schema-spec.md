# SQL-001 — ERD-001 Migration Source Mapping

Version: v1.0

Status: Review; publication not passed

Source basis: the ordered migration set, including `20260618_0001_geoai_core.sql`, `20260618_0003_persistence_payloads.sql`, `20260618_0004_projects_workspaces.sql`, `20260618_0005_fix_persistence_schema.sql`, `20260624_geoai_pilot_persistence_foundation.sql` and later hardening migrations

This document maps ERD-001 to migration source. It is not executable SQL, a migration authorization, proof that the full ordered chain applies cleanly to a fresh database, or evidence that the current Production demo is connected to Supabase.

## ERD-001 entities

| Table | Implemented purpose | Primary scope |
|---|---|---|
| `organizations` | tenant/client organization foundation | organization |
| `profiles` | User profile with `auth_user_id` identity link; the foundation declaration does not define an `auth.users` FK | user |
| `projects` | project/workspace boundary | organization |
| `project_memberships` | user-to-project role binding | project/user |
| `aois` | selected/drawn/uploaded spatial target | project |
| `analysis_runs` | analysis request/result with optional `selected_aoi_id` and `ai_decision_score_id` links | project/AOI/score |
| `ai_decision_scores` | governed score payload with a text `analysis_run_key`; no score-to-run FK is declared | project/AOI |
| `reports` | report metadata; the earlier persistence correction adds nullable UUID `analysis_run_id` | project/analysis |
| `comparison_sets` | comparison payload | project |
| `uploaded_datasets` | uploaded dataset metadata/storage reference | project |
| `data_room_assets` | project evidence asset metadata | project |
| `source_registry_snapshots` | registered source readiness snapshot | source |
| `external_data_snapshots` | bounded external snapshot metadata/payload | source |
| `audit_events` | audit foundation record with nullable `actor_user_id` link to `profiles.id` | project/actor |

The migration also defines validation checklist, pilot workflow, client input and deliverable tables that are not shown in the compact ERD. The earlier core migration defines `sources`, `spatial_layers`, `spatial_features`, `market_areas` and `market_metrics`; those data-plane tables remain outside the pilot-control ERD view.

## Pre-review schema finding

The migration files use `create table if not exists` across an evolving schema. Several tables are created in earlier migrations and described again with additional columns in the 20260624 foundation file. Static source presence therefore does not prove that a fresh ordered migration chain or an existing applied schema has every field shown by the later declaration. Direct applied-schema verification and, if required, an additive reconciliation migration are separate Security/backend and Data review actions. CR-DEV7-003 does not apply or change a migration.

## Runtime boundary

`src/lib/db/schema-readiness.ts` checks the required persistence table set. `src/lib/supabase/runtime-readiness.ts` separately reports environment, read reachability, schema, Storage, Auth/membership/RLS evidence and fallback. A migration file or readable table never by itself passes confidential-pilot or Production readiness.

No migration is applied by CR-DEV7-003.

Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.
