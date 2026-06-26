# GeoAI Pilot Infrastructure Activation v2.4

Date: 2026-06-24

## Scope

GeoAI v2.4 turns the v2.3 persistence foundation into an explicit activation path. It adds public-safe readiness APIs, guarded migration/seed/verification scripts, soft project access metadata, non-blocking audit calls, storage readiness checks and a compact Project Dashboard readiness panel.

This release does not claim durable production storage, secure enterprise storage, certified audit trail or official validation. Local/API fallback remains active unless Supabase/PostGIS is configured, the migration is applied, schema readiness passes and write/read verification succeeds.

## New Readiness Routes

- `GET /api/platform/activation-status` reports the overall activation gate.
- `GET /api/db/health` now includes migration, seed, read/write, storage, blockers and next actions.
- `GET /api/storage/health` reports Supabase Storage bucket readiness.
- `GET /api/known-limitations` exposes a machine-readable limitations tracker.

No route returns secrets.

## Migration Apply Runbook

The migration file is:

```text
supabase/migrations/20260624_geoai_pilot_persistence_foundation.sql
```

Check readiness:

```bash
npm run supabase:migrate:check
```

Apply from a trusted local terminal only:

```bash
export SUPABASE_DB_URL="postgres://..."
export GEOAI_ALLOW_SUPABASE_MIGRATION_APPLY=true
npm run supabase:migrate:apply
```

The apply script will not run unless `SUPABASE_DB_URL` and `GEOAI_ALLOW_SUPABASE_MIGRATION_APPLY=true` are both set. It never prints the database URL or secret keys. If `psql` is unavailable, use the Supabase SQL editor and paste the migration SQL manually.

Required caveat: Supabase/PostGIS durable persistence is active only when configured and schema readiness checks pass.

## Pilot Seed Runbook

Seed minimum demo/pilot access data after schema readiness passes:

```bash
npm run supabase:seed:pilot-foundation
```

The seed is idempotent and includes the demo organization, demo user profile, three demo projects, owner memberships, source registry snapshots and an initial audit event. If Supabase env or schema is unavailable, the script exits safely with blockers and writes nothing.

## Durable Persistence Verification

Run:

```bash
npm run supabase:verify:persistence
```

The verifier tests create/read/cleanup coverage for AOIs, analysis runs, reports, data room assets, pilot workflows and audit events.

By default, missing Supabase configuration reports `local_fallback_only` without failing. To require Supabase readiness:

```bash
GEOAI_REQUIRE_SUPABASE_READY=true npm run supabase:verify:persistence
```

## Access Enforcement Status

Core project-scoped APIs now call `requireProjectAccess({ projectKey, action, mode: "soft" })` and include safe response metadata:

```json
{
  "access": {
    "allowed": true,
    "role": "owner",
    "mode": "soft",
    "reason": "Demo project access allowed in soft mode."
  }
}
```

Soft mode preserves the public demo. Hard mode is available in the helper but should not be enabled for protected workflows until Supabase Auth, project memberships and RLS are configured and verified.

Required caveat: Demo access is not production authentication.

## Audit Event Status

Key API operations now call the audit helper for auth session checks, AOI changes, analysis/report saves, comparison set changes, data room asset changes, checklist updates, pilot workflow updates and AI decision scoring.

Audit writes are non-blocking. If Supabase is unavailable, audit returns local fallback/no-op behavior and never breaks the core workflow.

Required caveat: This is not a certified audit trail.

## Storage Readiness

Required bucket names:

- `geoai-data-room-assets`
- `geoai-validation-evidence`
- `geoai-report-exports`
- `geoai-aoi-imports`

`/api/storage/health` reports bucket reachability, allowed MIME types, max file-size guidance and signed URL readiness. v2.4 does not upload protected files.

Required caveat: Storage readiness is not secure enterprise storage until buckets, policies, signed URL flows and access enforcement are configured and verified.

v2.6 adds the evidence-file upload/download API foundation, metadata-only fallback and Supabase Storage bucket policy draft. See [Secure File Storage & Evidence Uploads v2.6](SECURE_FILE_STORAGE_EVIDENCE_UPLOADS_V26.md).

v2.7 adds evidence review decisions, upload intent and signed URL verification. Signed URL availability requires configured storage buckets and policies. See [Evidence Review Workflow & Signed URL Verification v2.7](EVIDENCE_REVIEW_SIGNED_URL_VERIFICATION_V27.md).

v2.9 adds the canonical pilot backend activation summary at `GET /api/pilot-backend/status`, environment-driven soft/hard enforcement, membership verification, storage signed URL binary verification, audit verification and dynamic known limitation statuses. See [Pilot Backend Activation & Hardening v2.9](PILOT_BACKEND_ACTIVATION_HARDENING_V29.md).

## UI Surface

`/projects` now includes a compact Platform Readiness panel showing Auth, DB, Schema, Storage, Audit and Access enforcement status.

## v2.5 Validation Governance Link

Validation Governance & Official Connector Readiness v2.5 builds on this activation baseline with project-scoped validation evidence metadata, connector readiness and report appendices. It remains metadata-only in local/API fallback mode and does not make official validation claims.

See [Validation Governance & Official Connector Readiness v2.5](VALIDATION_GOVERNANCE_OFFICIAL_CONNECTOR_READINESS_V25.md).

## Remaining Limitations

- Local/API fallback is not durable production storage.
- Supabase/PostGIS durable persistence is active only when configured and schema readiness checks pass.
- Demo access is not production authentication.
- RLS policies require configured Supabase Auth, project memberships and deployment governance.
- Storage readiness is not secure enterprise storage until buckets, policies, signed URL flows and access enforcement are configured and verified.
- No certified audit trail.
- No live official DLD/GeoDubai connector.
- No legal, cadastral, zoning, planning or valuation conclusion.

## How To Move Limits To Verified Active

1. Configure Supabase env in local/operator and Vercel server runtime.
2. Apply the v2.3 migration.
3. Confirm `/api/db/health` reports `repositoryMode: "supabase"` and `migrationApplied: true`.
4. Run `npm run supabase:seed:pilot-foundation`.
5. Run `npm run supabase:verify:persistence`.
6. Configure private Supabase Storage buckets and policies.
7. Verify `/api/storage/health` reports bucket readiness.
8. Enable Supabase Auth and project memberships.
9. Run RLS role tests before switching any workflow from soft to hard enforcement.

## QA Commands

```bash
npm run lint
npm run build
npm run supabase:migrate:check
npm run supabase:verify:persistence
npm run supabase:seed:pilot-foundation
npm run data:status
```

## Recommended Next Sprint

Validation Governance & Official Connector Readiness v2.5.
