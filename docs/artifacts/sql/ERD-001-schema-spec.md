# SQL-001 — ERD-001 Implemented Schema Mapping

Version: v1.0

Status: Review; publication not passed

Authoritative implementation: `supabase/migrations/20260624_geoai_pilot_persistence_foundation.sql` plus subsequent migrations

This document maps ERD-001 to migration code. It is not executable SQL, a migration authorization or evidence that the current Production demo is connected to Supabase.

## ERD-001 entities

| Table | Implemented purpose | Primary scope |
|---|---|---|
| `organizations` | tenant/client organization foundation | organization |
| `profiles` | Auth-linked user profile | organization/user |
| `projects` | project/workspace boundary | organization |
| `project_memberships` | user-to-project role binding | project/user |
| `aois` | selected/drawn/uploaded spatial target | project |
| `analysis_runs` | analysis request and result record | project/AOI |
| `ai_decision_scores` | governed score payload | project/analysis |
| `reports` | report metadata | project/analysis |
| `comparison_sets` | comparison payload | project |
| `uploaded_datasets` | uploaded dataset metadata/storage reference | project |
| `data_room_assets` | project evidence asset metadata | project |
| `source_registry_snapshots` | registered source readiness snapshot | source |
| `external_data_snapshots` | bounded external snapshot metadata/payload | source |
| `audit_events` | audit foundation record | project/actor |

The migration also defines validation checklist, pilot workflow, client input and deliverable tables that are not shown in the compact ERD. The earlier core migration defines `sources`, `spatial_layers`, `spatial_features`, `market_areas` and `market_metrics`; those data-plane tables remain outside the pilot-control ERD view.

## Runtime boundary

`src/lib/db/schema-readiness.ts` checks the required persistence table set. `src/lib/supabase/runtime-readiness.ts` separately reports environment, read reachability, schema, Storage, Auth/membership/RLS evidence and fallback. A migration file or readable table never by itself passes confidential-pilot or Production readiness.

No migration is applied by CR-DEV7-003.

Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.
