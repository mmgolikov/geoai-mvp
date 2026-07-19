# GeoAI Pilot Backend Activation & Hardening v2.9

> **Superseded — do not use operationally.** This point-in-time record predates the current fail-closed Auth, publishable-key and project-bound operator controls. Do not follow its hard-mode, migration, seed or credential instructions. Use the [Current Release State](CURRENT_RELEASE_STATE.md), [Codex Backlog](CODEX_BACKLOG_2026_07_16.md) and [Supabase Data API Containment Runbook](SUPABASE_DATA_API_CONTAINMENT_RUNBOOK_2026_07_16.md).

Date: 2026-06-26

## Scope

GeoAI v2.9 makes the pilot backend activation path explicit, verifiable and enforceable without breaking the public demo. It adds a canonical pilot backend status model, environment-driven access enforcement, membership/storage/audit verification scripts, dynamic known limitation statuses and a compact Project Dashboard readiness panel.

This release does not claim production-ready storage, secure enterprise storage, certified audit trail, official validation or pilot readiness for confidential client data unless the backend checks are actually verified.

Required caveats:

```text
Local/API fallback is not durable production storage.
Demo access is not production authentication.
Supabase/PostGIS durable persistence is active only when configured and schema readiness checks pass.
Storage readiness is not secure enterprise storage until buckets, policies, signed URL flows and access enforcement are configured and verified.
Audit events are a foundation only, not a certified audit trail.
```

## Status Model

`GET /api/pilot-backend/status` returns the canonical backend truth:

- `status`
- `canRunDemoPilot`
- `canRunConfidentialPilot`
- `capabilities`
- `blockers`
- `nextActions`
- `caveats`

Confidential pilot readiness remains `false` unless Supabase/PostGIS, Auth, memberships, storage buckets, signed URL verification, audit write/read verification and hard access enforcement are all verified.

## Environment Switches

Defaults preserve the public demo:

```bash
GEOAI_ACCESS_ENFORCEMENT_MODE=soft
GEOAI_REQUIRE_SUPABASE_READY=false
GEOAI_REQUIRE_STORAGE_READY=false
GEOAI_ALLOW_DEMO_PUBLIC=true
```

Hard mode path:

```bash
GEOAI_ACCESS_ENFORCEMENT_MODE=hard
GEOAI_ALLOW_DEMO_PUBLIC=true
```

Hard mode blocks non-demo/private project API access unless authenticated membership is available. Seeded public demo projects can remain visible when `GEOAI_ALLOW_DEMO_PUBLIC=true`.

## Migration Runbook

Check:

```bash
npm run supabase:migrate:check
```

Apply only from a trusted operator terminal:

```bash
export SUPABASE_DB_URL="postgres://..."
export GEOAI_ALLOW_SUPABASE_MIGRATION_APPLY=true
export GEOAI_ALLOW_SUPABASE_TARGET=pilot
npm run supabase:migrate:apply
```

The apply script does not print the database URL or keys. It is blocked unless `SUPABASE_DB_URL`, `GEOAI_ALLOW_SUPABASE_MIGRATION_APPLY=true` and a declared target are present.

## Seed And Membership Verification

Seed:

```bash
npm run supabase:seed:pilot-foundation
```

Verify:

```bash
npm run supabase:verify:memberships
```

The verifier checks organizations, profiles, projects and project memberships, including active owner/admin membership for seeded pilot/demo projects. If Supabase is not configured, it reports controlled blockers.

## Storage Verification

Check:

```bash
npm run storage:check
```

Signed URL binary verification:

```bash
GEOAI_ALLOW_STORAGE_WRITE_TEST=true npm run storage:verify:signed-url
```

The signed URL verifier writes, signs, reads and deletes a temporary test object only when explicitly allowed. Do not make buckets public.

Runtime storage health includes:

- private bucket policy readiness
- signed URL verification status
- write-test allowance
- blockers and next actions

## Audit Verification

Run:

```bash
npm run audit:verify
```

The verifier writes, reads and cleans up a test audit event when Supabase is ready. This is technical readiness only, not a certified audit trail.

## API Contract Check

Run against a local or deployed base URL:

```bash
GEOAI_TEST_BASE_URL=http://127.0.0.1:3000 npm run test:api-contract
```

Routes checked:

- `/api/db/health`
- `/api/storage/health`
- `/api/platform/activation-status`
- `/api/pilot-backend/status`
- `/api/known-limitations`
- `/api/auth/session`

The contract check validates status 200, JSON shape and basic secret hygiene.

## Dynamic Known Limitations

`GET /api/known-limitations` now enriches selected static limitations with live backend readiness:

- durable storage
- secure file storage
- auth enforcement
- RLS governance
- audit trail

Nothing is marked `verified_active` without runtime evidence.

## UI Surface

The `/projects` Platform Readiness card now shows:

- demo pilot readiness
- confidential pilot readiness
- DB
- Auth
- Storage
- Audit
- RLS
- top blockers
- next action

It remains compact and does not replace the deeper health APIs.

## Remaining Blockers

In the current production/public-demo path, expected blockers include:

- Supabase env not configured
- schema/migration not verified
- Supabase Auth not enforced
- private storage buckets not verified
- signed URL binary flow not verified
- durable audit write/read not verified

These blockers are expected until a trusted Supabase/Vercel environment is configured and verified.
