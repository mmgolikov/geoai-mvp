# GeoAI Supabase/PostGIS Durable Persistence Foundation v2.3 Release Note

Release date: 2026-06-24

Production URL: https://geoai-mvp.vercel.app

Deployment URL: https://geoai-phwcw2ngu-geoaidev.vercel.app

Deployment ID: `dpl_HFZn9qijZaqNTrp2G7vhmHf5e84D`

Production commit SHA: `3d7a5c4c29d4cb2476b641b82c36106d5fe8b0c0`

## Scope

GeoAI v2.3 adds the Supabase/PostGIS durable persistence foundation required for future real pilots while preserving the public demo and local/API fallback behavior.

This release is a foundation release. It does not apply the migration automatically, does not enforce production access control, and does not claim production-ready storage.

## What Changed

- Added additive Supabase migration SQL for the pilot persistence foundation.
- Added durable schema for organizations, profiles, memberships, projects, AOIs, analysis runs, reports, comparison sets, uploaded datasets, Data Room assets, validation checklist items, pilot workflows, source snapshots, external data snapshots, AI decision scores and audit events.
- Added PostGIS AOI polygon and centroid model.
- Added conservative RLS policy draft without broad anonymous writes.
- Expanded `/api/db/health` with schema-readiness fields.
- Added schema-readiness helper and repository adapter readiness helper.
- Added non-blocking audit event helper.
- Hardened Supabase-aware AOI persistence path while preserving local/API fallback.
- Aligned analysis, report and comparison persistence payloads with v2.3 source-lineage fields.

## Schema Table List

1. `organizations`
2. `profiles`
3. `project_memberships`
4. `projects`
5. `aois`
6. `analysis_runs`
7. `reports`
8. `comparison_sets`
9. `uploaded_datasets`
10. `data_room_assets`
11. `validation_checklist_items`
12. `pilot_workflows`
13. `pilot_client_inputs`
14. `pilot_deliverables`
15. `source_registry_snapshots`
16. `external_data_snapshots`
17. `ai_decision_scores`
18. `audit_events`

## PostGIS AOI Geometry Model

`aois` includes:

- `geometry geometry(Polygon, 4326)`
- `centroid geometry(Point, 4326)`
- `bbox jsonb`
- `measurements jsonb`
- project and organization scoping fields
- validation caveat fields

AOIs remain user-drawn or uploaded screening geometry. They are not official parcel, zoning, cadastral, planning, ownership or entitlement boundaries.

## RLS Policy Draft

The migration enables RLS on core tables and adds membership-based authenticated policies.

There is no broad anonymous write policy. Demo public mode remains app-level fallback, not database public write access.

RLS policies require configured Supabase Auth, project memberships and deployment governance.

## DB Health / Schema Readiness

`/api/db/health` now returns:

- `configured`
- `status`
- `repositoryMode`
- `mode`
- `postgisReady`
- `tablesReady`
- `missingTables`
- `requiredTables`
- `migrationName`
- `schemaVersion`
- `caveat`
- `sources_count`

Expected states:

- Supabase not configured: `status: "not_configured"`, `repositoryMode: "local_fallback"`.
- Supabase configured but migration not applied: controlled `configured_unavailable` or `configured_incomplete`, with local fallback active.
- Supabase configured and schema-ready: `status: "connected"`, `repositoryMode: "supabase"`, `postgisReady: true`, `tablesReady: true`.

## Migration Status

Migration authored:

`supabase/migrations/20260624_geoai_pilot_persistence_foundation.sql`

The migration was not automatically applied during this release. Apply it only in an explicitly authorized Supabase environment after review.

## Production DB Status

Current production health after release reports local/API fallback because Supabase is not configured in the deployed environment.

Local/API fallback is not durable production storage.

## Limitations

- No production route enforcement.
- No full RLS rollout with production memberships.
- No secure file storage.
- No certified audit trail.
- No official validation connectors.
- No production-ready storage claim.
- No secure enterprise storage claim.
- No compliance-ready claim.

## Required Caveats

Local/API fallback is not durable production storage.

Supabase/PostGIS durable persistence is active only when configured and schema readiness checks pass.

RLS policies require configured Supabase Auth, project memberships and deployment governance.

## Recommended Next Sprint

Validation Governance & Official Connector Readiness v2.4.
