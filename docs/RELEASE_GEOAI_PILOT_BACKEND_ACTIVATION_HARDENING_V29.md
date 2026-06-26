# Release: GeoAI Pilot Backend Activation & Hardening v2.9

Release date: 2026-06-26

Production URL: https://geoai-mvp.vercel.app

Production deployment URL: https://geoai-l9ti4knmt-geoaidev.vercel.app

Deployment ID: `dpl_DzAYu2tZNTWTDqYKYGDXLsA341Jy`

Production commit SHA: `451ac3aa11f3a32890fb6d96efea472f2eda6161`

## Scope

GeoAI v2.9 moves the backend from a broad pilot foundation toward an explicit pilot activation path. It does not activate confidential-client production storage by itself. It makes readiness measurable, enforceable and honest.

## What Changed

- Added canonical pilot backend activation model.
- Added `GET /api/pilot-backend/status`.
- Added environment-driven access enforcement:
  - `GEOAI_ACCESS_ENFORCEMENT_MODE`
  - `GEOAI_REQUIRE_SUPABASE_READY`
  - `GEOAI_REQUIRE_STORAGE_READY`
  - `GEOAI_ALLOW_DEMO_PUBLIC`
- Added hard-mode access path for core project-scoped APIs.
- Added membership verification script: `npm run supabase:verify:memberships`.
- Hardened migration apply guard with `GEOAI_ALLOW_SUPABASE_TARGET`.
- Added storage signed URL binary verifier: `npm run storage:verify:signed-url`.
- Added audit write/read verifier: `npm run audit:verify`.
- Added lightweight API contract check: `npm run test:api-contract`.
- Updated `/api/known-limitations` to enrich selected statuses from live backend readiness.
- Updated `/projects` Platform Readiness card with demo/confidential pilot status, DB, Auth, Storage, Audit, RLS, blockers and next action.
- Updated docs and QA runbooks.

## Current Production Readiness

- Demo pilot readiness: available through public demo fallback.
- Confidential pilot readiness: blocked.
- DB: local/API fallback; Supabase env is not configured in production.
- Storage: local metadata-only fallback; private buckets and signed URL binary flow are not verified.
- Auth: demo public mode; production route enforcement is not active.
- Audit: helper foundation only; durable audit write/read is not verified.
- RLS: policy draft/foundation only; live RLS is not verified.

## Data Honesty

Required caveats remain:

```text
Local/API fallback is not durable production storage.
Demo access is not production authentication.
Supabase/PostGIS durable persistence is active only when configured and schema readiness checks pass.
Storage readiness is not secure enterprise storage until buckets, policies, signed URL flows and access enforcement are configured and verified.
Audit events are a foundation only, not a certified audit trail.
screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.
```

## Verification

Completed before merge:

- `npm run lint`
- `npm run build`
- `npm run data:status`
- `npm run storage:check`
- `npm run storage:verify:signed-url`
- `npm run supabase:migrate:check`
- `npm run supabase:verify:persistence`
- `npm run supabase:verify:memberships`
- `npm run audit:verify`
- `GEOAI_TEST_BASE_URL=http://127.0.0.1:3029 npm run test:api-contract`
- Local smoke checks for `/`, `/login`, `/workspace`, `/projects`, health/status APIs, Data Room, report packages and seeded printable reports.
- Vercel preview smoke checks.
- Production smoke checks after merge.
- Production runtime logs checked for `error` and `fatal`: no entries found.

## Remaining Limitations

- Supabase/PostGIS durable persistence is not active until configured and verified.
- Supabase Storage is not secure enterprise storage until private buckets, policies, signed URL flows and hard access enforcement are configured and verified.
- Demo access remains active by default and is not production authentication.
- Audit events are not a certified audit trail.
- Official validation connectors are not live.
- Product outputs remain screening hypotheses until official/customer validation evidence is reviewed.

## Recommended Next Sprint

Search-first Explore Interface v3.0.
