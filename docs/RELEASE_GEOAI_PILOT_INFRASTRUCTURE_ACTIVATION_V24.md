# Release: GeoAI Pilot Infrastructure Activation v2.4

Date: 2026-06-24

## Production

- Production URL: https://geoai-mvp.vercel.app
- Deployment URL: https://geoai-fsdds4on4-geoaidev.vercel.app
- Deployment ID: `dpl_Csa9xfVd8ki2V7QNbR9PKws3MDtp`
- Production commit SHA: `61e91d717e444a43b5fe74111326b805fb62110c`
- PR: https://github.com/mmgolikov/geoai-mvp/pull/21

## Scope

GeoAI v2.4 activates the infrastructure readiness path around the v2.3 Supabase/PostGIS foundation. It adds explicit readiness APIs, guarded operator scripts, soft project access metadata, non-blocking audit calls, storage readiness checks, a machine-readable known limitations tracker and a compact Platform Readiness card in the Project Dashboard.

## What Changed

- Added `/api/platform/activation-status`.
- Expanded `/api/db/health` with `migrationApplied`, `seedReady`, `canRead`, `canWrite`, `storageReady`, `blockers` and `nextActions`.
- Added `/api/storage/health` for Supabase Storage bucket readiness.
- Added `/api/known-limitations` for machine-readable limitation states.
- Added guarded scripts:
  - `npm run supabase:migrate:check`
  - `npm run supabase:migrate:apply`
  - `npm run supabase:seed:pilot-foundation`
  - `npm run supabase:verify:persistence`
- Added soft access metadata to core project-scoped APIs.
- Added non-blocking audit calls to core workflow operations.
- Added compact Platform Readiness panel on `/projects`.
- Added runbook documentation in `docs/PILOT_INFRASTRUCTURE_ACTIVATION_V24.md`.

## Current Activation State

- Supabase env on production: not configured according to `/api/db/health`.
- Repository mode: `local_fallback`.
- Migration applied: no.
- Seed ready: no.
- Storage provider: disabled.
- Storage ready: no.
- Access enforcement: soft metadata only.
- Audit: foundation integrated, but durable audit writes require Supabase configuration and schema readiness.
- Known limitations tracker: active at `/api/known-limitations`.

Migration not applied: blocked by missing Supabase URL/key env, missing `SUPABASE_DB_URL`, disabled migration apply guard and unavailable Supabase CLI in the local Codex environment.

## QA Results

Local:

- `npm run lint` passed.
- `npm run build` passed.
- Clean-cache rebuild after `rm -rf .next` passed.
- `npm run supabase:migrate:check` passed with explicit blockers.
- `npm run supabase:verify:persistence` passed in local-fallback status.
- `npm run supabase:seed:pilot-foundation` passed in blocked/no-write status.
- `npm run data:status` passed.
- Local production smoke routes returned 200 after clean rebuild.

Preview:

- Preview URL: https://geoai-mlfnqejfu-geoaidev.vercel.app
- Preview deployment ID: `dpl_ErFjgDPcp64tGvFhrRX2BCcUd8eJ`
- Vercel preview status: READY.
- Preview smoke routes returned 200.
- Preview runtime logs: no error/fatal entries for the checked window.

Production:

- Production smoke routes returned 200 for:
  - `/`
  - `/login`
  - `/workspace`
  - `/projects`
  - `/api/db/health`
  - `/api/storage/health`
  - `/api/auth/session`
  - `/api/platform/activation-status`
  - `/api/known-limitations`
  - `/api/aois?projectKey=dubai-investment-screening-demo`
  - `/api/data-room?projectKey=dubai-investment-screening-demo`
  - `/api/pilot-workflow?projectKey=dubai-investment-screening-demo`
  - `/api/ai/decision-score`
  - `/reports/seeded-analysis-dubai-marina-report/print`
  - `/reports/seeded-comparison-dubai-shortlist-report/print`
- Production runtime logs: no error/fatal entries for the checked window.

## Limitations

- Local/API fallback is not durable production storage.
- Supabase/PostGIS durable persistence is active only when configured and schema readiness checks pass.
- Demo access is not production authentication.
- RLS policies require configured Supabase Auth, project memberships and deployment governance.
- Storage readiness is not secure enterprise storage until buckets, policies, signed URL flows and access enforcement are configured and verified.
- Audit events are a foundation only, not a certified audit trail.
- No live official DLD, Dubai Pulse, GeoDubai, parcel, zoning, cadastral, ownership or valuation connector is active.
- GeoAI outputs remain screening hypotheses; official validation required; not legal, cadastral, zoning, planning or valuation conclusions.

## Recommended Next Sprint

Validation Governance & Official Connector Readiness v2.5.
