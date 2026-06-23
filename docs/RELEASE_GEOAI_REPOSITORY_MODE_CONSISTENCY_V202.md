# GeoAI Repository Mode & Fallback Consistency v2.0.2

Release date: 2026-06-24

Production URL: https://geoai-mvp.vercel.app

Deployment URL: https://geoai-q24epjsrz-geoaidev.vercel.app

Deployment ID: `dpl_6qgSQYomYVw6DUNPfRUox9YNmotz`

Production commit SHA: `8ce5740ed68a17f530ecdf3a2b5d67dc9669c4ce`

## Scope

GeoAI Repository Mode & Fallback Consistency v2.0.2 is a technical hardening release. It normalizes repository mode names, fallback caveats, API response metadata and user-facing storage labels.

This release does not add product features, auth, full Supabase/PostGIS persistence, official validation connectors, new analysis logic, AOI behavior changes or map behavior changes.

## What Changed

- Added canonical `RepositoryMode` helpers.
- Added repository mode label and caveat utilities.
- Added `normalizeRepositoryMode`.
- Added `repositoryModeFields` for consistent API payloads.
- Normalized API mode payloads to canonical values.
- Added storage caveats to fallback API responses where practical.
- Updated `/api/db/health` so connection `status` is separate from repository mode.
- Updated UI labels to avoid raw legacy mode strings.
- Updated docs and QA guidance for repository mode consistency.
- Added `.gitignore` coverage for local fallback runtime folders:
  - `data/local_fallback/`
  - `data/local-fallback/`

## Canonical Repository Modes

| Mode | User label | Meaning | Caveat |
| --- | --- | --- | --- |
| `supabase` | Supabase/PostGIS | Durable DB-backed mode only when Supabase/PostGIS is configured and used successfully. | Supabase/PostGIS is active only when configured and successfully used. |
| `local_fallback` | Local/API fallback | Server/API fallback for demo continuity. | Local/API fallback is not durable production storage. |
| `browser_local` | Browser-local demo | Browser localStorage continuity for demo flows. | Browser-local storage is for demo continuity only. |
| `demo_seed` | Demo seed | Static/generated demo seed records. | Demo seed records are sample context and require validation. |
| `disabled` | Not configured | Feature or repository unavailable/not configured. | Repository mode is not configured. |

## Affected API Routes

- `/api/db/health`
- `/api/projects`
- `/api/analysis-runs`
- `/api/reports`
- `/api/comparison-sets`
- `/api/uploaded-datasets`
- `/api/aois`
- `/api/aois/[id]`
- `/api/data-room`
- `/api/data-room/assets`
- `/api/data-room/assets/[id]`
- `/api/data-room/checklist`
- `/api/data-room/checklist/[id]`
- `/api/pilot-workflow`
- `/api/pilot-workflow/client-inputs/[id]`
- `/api/pilot-workflow/deliverables/[id]`

## QA Summary

- PR #17 merged into `main`.
- Vercel production deployment reached `READY`.
- `npm run lint` passed before merge.
- `npm run build` passed before merge.
- `git diff --check` passed before merge.
- Runtime error/fatal log check returned no matching production logs after deployment.
- Legacy string search confirmed old values remain only in compatibility normalizer aliases and documentation/QA notes describing legacy values.
- Direct HTTP smoke from the local Codex shell was blocked by environment network restrictions, so deployment readiness and runtime health were verified through Vercel.

## Limitations

- No full Supabase/PostGIS persistence was added.
- No auth was added.
- No durable production storage is active unless Supabase/PostGIS is configured and successfully used.
- No official validation connectors were added.
- Local/API fallback remains non-durable.
- Browser-local storage remains demo continuity only.
- Demo seed records remain sample context and require validation.

Required caveat remains:

> screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.

## Recommended Next Sprint

Workspace Shell Decomposition v2.0.3.
