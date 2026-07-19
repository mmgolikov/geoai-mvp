# GeoAI Supabase/PostGIS Durable Persistence Foundation v2.3

> **Superseded — do not use operationally.** This historical foundation document contains an obsolete migration filename, legacy anon/service-role environment guidance and a pre-canonical apply path. Use the [Current Release State](CURRENT_RELEASE_STATE.md) and [Supabase Data API Containment Runbook](SUPABASE_DATA_API_CONTAINMENT_RUNBOOK_2026_07_16.md); the authoritative ledger is `supabase/migration-ledger-baseline.json`.

Date: 2026-06-24

## Purpose

GeoAI v2.3 introduces the durable persistence foundation needed for future real pilots. It adds a Supabase/PostGIS schema, schema-readiness checks, repository adapter groundwork, audit event foundation and documentation while preserving the public demo and local fallback behavior.

This is a foundation sprint, not a production security sprint.

## What This Sprint Implements

- Supabase migration: `supabase/migrations/20260624_geoai_pilot_persistence_foundation.sql`.
- Core organization, profile, project and membership tables.
- PostGIS AOI table for user-drawn/uploaded screening polygons.
- Durable table foundations for analyses, reports, comparison sets, Data Room assets, pilot workflows, source snapshots, external data snapshots and AI decision scores.
- Audit event table and non-blocking audit helper.
- RLS policy draft based on project memberships.
- Schema readiness helper and expanded `/api/db/health` response.
- Supabase-aware AOI repository path with local fallback.
- Existing Supabase-aware project, analysis, report and comparison adapters aligned with v2.3 payload fields.

## What This Sprint Does Not Implement

- No production route enforcement.
- No full RLS rollout with seeded production memberships.
- No verified secure enterprise file storage. v2.6 adds a storage-ready upload/download foundation and policy draft, but buckets, policies, signed URLs and access enforcement must still be configured and verified.
- No enterprise data room claim.
- No certified audit trail.
- No official validation connectors.
- No production-ready storage claim.

## Schema Tables

The v2.3 migration creates:

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

## AOI / PostGIS Model

`aois` stores user-drawn or uploaded polygons using:

- `geometry geometry(Polygon, 4326)`
- `centroid geometry(Point, 4326)`
- `bbox jsonb`
- `measurements jsonb`
- `source_type`, `data_mode`, `validation_status`
- project and organization scoping fields

AOIs remain screening geometry only. They are not official parcel, zoning, cadastral, planning, ownership or entitlement boundaries.

## RLS Policy Draft

The migration enables RLS on core tables and adds conservative authenticated policies based on:

- `profiles.auth_user_id = auth.uid()`
- active `project_memberships`
- project or organization access helpers

There is no broad anonymous write policy. Service-role usage remains server-side only. Demo public mode remains an app-level fallback, not database public write access.

RLS policies require configured Supabase Auth, project memberships and deployment governance.

v2.9 adds `npm run supabase:verify:memberships` and `GET /api/pilot-backend/status` to make membership and confidential-pilot readiness explicit. Migration apply remains guarded and now also requires `GEOAI_ALLOW_SUPABASE_TARGET` in addition to `SUPABASE_DB_URL` and `GEOAI_ALLOW_SUPABASE_MIGRATION_APPLY=true`.

## Repository Adapter Behavior

GeoAI now has repository adapter status helpers in `src/lib/db/repository-adapter.ts`.

Prepared repositories include:

- projects
- AOIs
- analysis runs
- reports
- comparison sets
- Data Room assets
- pilot workflows
- pilot client inputs
- pilot deliverables
- AI decision scores
- audit events

The app uses Supabase only when configured and ready enough. If Supabase is missing, unreachable or schema-incomplete, existing local/demo fallback behavior continues.

Local/API fallback is not durable production storage.

## DB Health Fields

`/api/db/health` now returns:

- `configured`
- `status`
- `repositoryMode`
- `postgisReady`
- `tablesReady`
- `missingTables`
- `requiredTables`
- `migrationName`
- `schemaVersion`
- `storageReady`
- `migrationApplied`
- `seedReady`
- `canWrite`
- `canRead`
- `caveat`
- `sources_count`
- `blockers`
- `nextActions`

Expected modes:

- `not_configured`: Supabase env is missing; app stays in `local_fallback`.
- `configured_unavailable`: env exists but the DB is unreachable; app stays in `local_fallback`.
- `configured_incomplete`: DB is reachable but tables/PostGIS are not ready; app stays in `local_fallback`.
- `connected`: Supabase/PostGIS schema checks pass and repository mode can become `supabase`.

Supabase/PostGIS durable persistence is active only when configured and schema readiness checks pass.

## Audit Event Foundation

`src/lib/audit/audit-event.ts` adds:

- `recordAuditEvent()`
- `createAuditEventPayload()`
- `auditEventTypeLabels`

Audit writes are non-blocking. If Supabase is unavailable, audit recording returns a local fallback result and never breaks the core workflow.

This is not a certified audit trail.

## Migration Instructions

1. Configure Supabase environment variables in the target environment.
2. Apply `supabase/migrations/20260624_geoai_pilot_persistence_foundation.sql` using Supabase CLI or SQL editor.
3. Open `/api/db/health`.
4. Confirm `postgisReady: true`, `tablesReady: true`, and `repositoryMode: "supabase"`.
5. Seed organizations, profiles, projects and project memberships before enabling production route enforcement.

This migration was authored in the repository. It was not applied to a live Supabase database in this Codex task.

## v2.4 Activation Runbook

GeoAI v2.4 adds guarded operator scripts and readiness APIs:

```bash
npm run supabase:migrate:check
npm run supabase:migrate:apply
npm run supabase:seed:pilot-foundation
npm run supabase:verify:persistence
```

`npm run supabase:migrate:apply` requires `SUPABASE_DB_URL` and `GEOAI_ALLOW_SUPABASE_MIGRATION_APPLY=true`. If those are missing, it exits safely with instructions. See [Pilot Infrastructure Activation v2.4](PILOT_INFRASTRUCTURE_ACTIVATION_V24.md).

## Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_AUTH_MODE=demo_public
```

`SUPABASE_SERVICE_ROLE_KEY` is server-only. Never expose it to client components.

## Limitations

- Local/API fallback is not durable production storage.
- Supabase/PostGIS durable persistence is active only when configured and schema readiness checks pass.
- RLS policies require configured Supabase Auth, project memberships and deployment governance.
- No secure enterprise storage claim.
- No production-ready storage claim.
- No compliance-ready or certified audit claim.
- No official validation completed claim.

## Recommended Next Sprint

Secure File Storage & Evidence Uploads v2.6 is documented in [SECURE_FILE_STORAGE_EVIDENCE_UPLOADS_V26.md](SECURE_FILE_STORAGE_EVIDENCE_UPLOADS_V26.md). The next recommended sprint after v2.6 is Evidence Review Workflow & Signed URL Verification v2.7.
