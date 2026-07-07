# GeoAI Supabase Runtime Readiness v1

## Summary

Supabase Runtime Readiness v1 adds fallback-safe runtime checks for Supabase configuration and read-only reachability. It improves `/api/db/health`, `/api/platform/activation-status` and `/api/pilot-backend/status` so they clearly separate missing env, configured-but-unreachable env, source-readiness table access, storage gaps, local/API fallback and disabled hard access.

This release does not implement design changes.

Required caveat:

“Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.”

## What Changed

- Added a server-only runtime-readiness model for safe Supabase env and read-only probe status.
- Added `npm run supabase:runtime-readiness` for JSON-only local/runtime checks.
- Added read-only status fields for:
  - `geoai_healthcheck`;
  - `source_registry_snapshots`;
  - `external_data_snapshots`;
  - schema/table readiness;
  - storage readiness gaps;
  - local/API fallback;
  - hard access disabled or unverified.
- Updated `/api/db/health`, `/api/platform/activation-status` and `/api/pilot-backend/status` with runtime mode, blockers, next actions, caveats and generated timestamps.
- Extended API contract checks for runtime-readiness shape and secret hygiene.
- Added `docs/SUPABASE_RUNTIME_READINESS_V1.md`.

## Validation Run

Required validation for this release:

- `npm run lint`
- `npm run build`
- `npm run supabase:activation-status`
- `npm run supabase:runtime-readiness`
- `npm run test:api-contract`

Required smoke routes:

- `/api/health`
- `/api/db/health`
- `/api/platform/activation-status`
- `/api/pilot-backend/status`
- `/api/data-sources`
- `/api/data-sources/readiness`
- `/api/source-lineage`
- `/projects`

## Runtime Readiness Behavior

- Missing Supabase env reports local/API fallback, blockers and next actions.
- Supabase URL/key presence is represented as boolean flags only.
- Service-role presence is represented as `present_read_only` or `absent`.
- Service role is not used for writes.
- Read probes return booleans, counts and status labels only.
- Production responses do not include stack traces, keys, JWTs, database URLs or raw env values.

## No Migrations / Writes

This release does not:

- apply migrations;
- insert, update, delete, upsert or seed Supabase data;
- create tables;
- alter tables;
- change RLS;
- create storage buckets;
- upload storage objects.

## No Hard Auth

Hard access enforcement remains disabled unless a separate approved task configures and verifies Supabase Auth, memberships, RLS, storage policy and deployment governance.

## Data Honesty

This release does not claim:

- live official DLD integration;
- live GeoDubai integration;
- official parcel;
- official zoning;
- cadastral validation;
- ownership verification;
- certified valuation;
- approved site;
- guaranteed best use;
- production-ready status;
- pilot-ready status.

Runtime readiness is infrastructure status only. GeoAI remains a screening workflow requiring official/client validation.

## Known Limitations

- Supabase runtime env may still be missing in production/preview.
- Data API grants/RLS can block source registry reads even when env exists.
- Storage is not secure enterprise storage until buckets, policies, signed URL flows and access enforcement are configured and verified.
- RLS correctness is not certified by read-only probes.
- Local/API fallback is not durable production storage.

## Rollback Point

Before merge, rollback is the current `main` before this PR. After merge, revert this PR or remove the Supabase runtime env variables and redeploy the previous known-good commit.

## Design Freeze Confirmation

No Figma implementation, Page 14 work, visual redesign, Tailwind palette change, layout refactor or design-system change is included.
