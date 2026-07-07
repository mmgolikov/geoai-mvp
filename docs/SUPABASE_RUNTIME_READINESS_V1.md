# Supabase Runtime Readiness v1

## Purpose

Supabase Runtime Readiness v1 prepares GeoAI to connect safely to Supabase from local trusted runtimes or Vercel Preview/Production runtime configuration while preserving local/API fallback.

This runbook is runtime readiness only. It does not authorize production deployment, pilot access, schema migration, Supabase writes, storage bucket creation, hard authentication enforcement or live official data integration.

Required caveat:

“Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.”

## What This Enables

- Safe detection of whether Supabase runtime environment variables are present.
- Read-only checks for `geoai_healthcheck`, `source_registry_snapshots` and `external_data_snapshots`.
- Decision-useful API responses for `/api/db/health`, `/api/platform/activation-status` and `/api/pilot-backend/status`.
- Continued local/API fallback when Supabase env is missing, unreachable or incomplete.
- Clear next actions without exposing Supabase keys, JWTs, database URLs or raw env values.

## What This Does Not Enable

- No Supabase migrations.
- No inserts, updates, deletes, upserts, seed writes or storage writes.
- No storage bucket creation.
- No RLS or policy changes.
- No hard access enforcement.
- No live official DLD, Dubai Pulse or GeoDubai integration.
- No official parcel, zoning, cadastral, ownership or valuation validation.
- No production-ready or pilot-ready claim.

## Vercel Environment Variables

Configure variable names only in the intended Vercel environment. Do not commit values.

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL`
- `NEXT_PUBLIC_AUTH_MODE`
- `GEOAI_ACCESS_ENFORCEMENT_MODE`
- `GEOAI_REQUIRE_SUPABASE_READY`
- `GEOAI_REQUIRE_STORAGE_READY`
- `GEOAI_ALLOW_DEMO_PUBLIC`

Keep `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_DB_URL` server-only. Never use a `NEXT_PUBLIC_` prefix for service-role or database connection values.

## Local `.env.local` Example

Use placeholders only:

```text
NEXT_PUBLIC_SUPABASE_URL=<supabase-project-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<server-only-service-role-key>
SUPABASE_DB_URL=<server-only-db-url>
NEXT_PUBLIC_AUTH_MODE=demo_public
GEOAI_ACCESS_ENFORCEMENT_MODE=soft
GEOAI_REQUIRE_SUPABASE_READY=false
GEOAI_REQUIRE_STORAGE_READY=false
GEOAI_ALLOW_DEMO_PUBLIC=true
```

## Safe Validation Steps

Run locally or in a trusted runtime:

```bash
npm run supabase:runtime-readiness
npm run supabase:activation-status
npm run test:api-contract
```

Then smoke:

- `/api/health`
- `/api/db/health`
- `/api/platform/activation-status`
- `/api/pilot-backend/status`
- `/api/data-sources`
- `/api/data-sources/readiness`
- `/api/source-lineage`
- `/projects`

Expected fallback-safe behavior:

- Missing Supabase env reports blockers and next actions.
- Present env performs read-only probes only.
- Service role presence is reported as `present_read_only` and is not used for writes.
- API responses return booleans, counts and status labels only.
- No secrets, JWTs, database URLs or raw env values are returned.

## Rollback Steps

- Remove or unset Supabase runtime env variables in the affected Vercel environment.
- Keep `GEOAI_ACCESS_ENFORCEMENT_MODE=soft`.
- Keep `GEOAI_REQUIRE_SUPABASE_READY=false`.
- Keep `GEOAI_REQUIRE_STORAGE_READY=false`.
- Redeploy the previous known-good commit if a runtime regression appears.
- Re-run `/api/db/health`, `/api/platform/activation-status` and `/api/pilot-backend/status` to confirm local/API fallback is active.

## Required Checks After Setting Env

- `npm run supabase:runtime-readiness`
- `npm run supabase:activation-status`
- `npm run supabase:migrate:check`
- `npm run test:api-contract`
- `/api/db/health`
- `/api/platform/activation-status`
- `/api/pilot-backend/status`
- `/api/storage/health`

Storage remains incomplete until buckets, policies, signed URL flows and access enforcement are configured and verified.

## Data Honesty

GeoAI remains a screening workflow. Runtime readiness does not create legal, cadastral, zoning, planning, ownership, valuation, insurance, lending, entitlement or investment conclusions.

Do not claim live official integration, official parcel, official zoning, cadastral validation, ownership verification, certified valuation, approved site, guaranteed best use, production-ready status or pilot-ready status.

## Known Limitations

- Public/demo access remains enabled unless a separate approved auth task enables and verifies hard access.
- Source registry and external snapshot reads depend on Data API grants/RLS and may remain blocked in some environments.
- Storage readiness is still a separate bucket/policy/signed URL verification path.
- RLS correctness is not inferred from table count probes.
- Production remains investor/client demo and local/API fallback unless runtime env is configured and verified.

## Reference Docs Checked

- Supabase changelog, including the April 28, 2026 Data API exposure change.
- Supabase Data API security guidance on explicit grants plus RLS.
- Vercel environment-variable environment scoping guidance.
- Next.js environment-variable behavior for public and server variables.
