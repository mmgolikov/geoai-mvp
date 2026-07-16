# Supabase Pilot Activation

> **Superseded — do not use operationally.** This is a historical activation draft and its legacy anon/service-role/DB-URL instructions are prohibited by the current application boundary. Use the [Documentation Index](DOCUMENTATION_INDEX.md), [Current Release State](CURRENT_RELEASE_STATE.md) and [Supabase Data API Containment Runbook](SUPABASE_DATA_API_CONTAINMENT_RUNBOOK_2026_07_16.md). No migration apply, Auth activation or public-runtime credential change is authorized by this file.

GeoAI pilot activation targets Supabase project `geoai-dev` (`pphdqkurxneyagvnnjdt`) in `eu-west-1`. The project is expected to be `ACTIVE_HEALTHY` on Postgres `17.6`; the currently observed public healthcheck table is `geoai_healthcheck`.

This runbook does not authorize production deployment by itself. It verifies readiness and documents the guarded path to activate Supabase/PostGIS persistence for preview or pilot environments.

## Required Environment

Configure these only in local trusted terminals, Vercel environment variables, or server runtimes:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL`
- `NEXT_PUBLIC_AUTH_MODE=supabase_auth` when testing auth-backed access
- `GEOAI_ACCESS_ENFORCEMENT_MODE=soft` until memberships/RLS are verified
- `GEOAI_REQUIRE_SUPABASE_READY=true` only after schema readiness passes
- `GEOAI_REQUIRE_STORAGE_READY=true` only after bucket/signed URL checks pass

Migration apply is blocked unless all of these are set in a trusted terminal:

- `SUPABASE_DB_URL`
- `GEOAI_ALLOW_SUPABASE_MIGRATION_APPLY=true`
- `GEOAI_ALLOW_SUPABASE_TARGET=preview` or `GEOAI_ALLOW_SUPABASE_TARGET=pilot`

Never commit `.env`, `.env.local`, `SUPABASE_SERVICE_ROLE_KEY`, or `SUPABASE_DB_URL`.

## Check

```bash
npm run supabase:activation-status
npm run supabase:migrate:check
```

The activation status script reports env presence, the known project metadata, REST reachability for `geoai_healthcheck`, required table readiness, blockers and next actions. It never prints Supabase keys or DB URLs.

## Apply

Apply migrations only after reviewing the SQL and confirming the target is preview or pilot:

```bash
GEOAI_ALLOW_SUPABASE_MIGRATION_APPLY=true \
GEOAI_ALLOW_SUPABASE_TARGET=preview \
npm run supabase:migrate:apply
```

Use `GEOAI_ALLOW_SUPABASE_TARGET=pilot` for the pilot environment. Do not use this path for production without a separate reviewed release decision.

## Verify

```bash
npm run supabase:activation-status
npm run supabase:verify:persistence
npm run supabase:verify:memberships
npm run storage:check
```

Then verify the deployed runtime:

- `GET /api/db/health`
- `GET /api/platform/activation-status`
- `GET /api/pilot-backend/status`

Expected pilot-ready signals are:

- `activation.activationReady: true` in `/api/db/health`
- required persistence tables present
- PostGIS readiness verified
- storage buckets reachable
- signed URL flow verified before protected client files are stored
- Supabase Auth, memberships and RLS policy tests verified before hard access enforcement

## Vercel Notes

Add the same required env vars in Vercel for the intended Preview or pilot environment. Do not set service role or database URL as public/client-exposed variables. Keep `GEOAI_ACCESS_ENFORCEMENT_MODE=soft` until auth, memberships, RLS and storage verification are complete.

No code path in this runbook flips hard enforcement automatically.
