# GeoAI Real Data + OpenAI Decision Scoring Foundation v2.1

Release date: 2026-06-24

Production URL: https://geoai-mvp.vercel.app

Release deployment URL: https://geoai-pqz5h63xo-geoaidev.vercel.app

Release deployment ID: `dpl_DakNu1uhPJ3wyyfHvvfVr4BY7Yiu`

Release commit SHA: `6c07bc89a72d55168f4f2daaf1fff5e14ea406d3`

## Scope

GeoAI v2.1 adds the first combined foundation for real-data readiness and server-side OpenAI decision scoring while preserving deterministic demo behavior.

This release does not add live official DLD, Dubai Pulse, GeoDubai or Dubai Municipality integrations. It does not add auth, durable enterprise storage, secure file storage, official validation connectors or production/pilot readiness certification.

Required caveat remains:

> screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.

## What Changed

- Added source data modes separate from repository/storage modes.
- Fixed the Projects dashboard first-paint mismatch so bundled market-area records show `5 snapshot / 6 demo` with fallback caveats.
- Hardened manual public DLD / Dubai Pulse-style snapshot ingestion.
- Added status and validation commands:
  - `npm run data:status`
  - `npm run validate:external-data`
- Added server-only `/api/ai/decision-score`.
- Added deterministic fallback scoring when `OPENAI_API_KEY` is missing, OpenAI fails, JSON validation fails or unsupported claims appear.
- Added a compact AI Decision Memo to dashboards and report previews.
- Linked external readiness into Data Room and Pilot Workflow evidence metadata.

## Current Source States

| Source | State | Notes |
| --- | --- | --- |
| DLD / Dubai Pulse market context | `sample_fallback` | 5 bundled sample market-area records are available for demo screening only. Manual import is supported for approved public snapshots. |
| DLD public snapshot categories | `sample_fallback` / `manual_import_ready` | Transactions, rents, projects, valuations, land, building, unit, brokers and developers are supported as manual CSV categories. Missing real files do not fail builds. |
| OSM / Geofabrik | `sample_fallback` | Open snapshot sample context remains available; real import path is documented for future validation. |
| Overture Maps | `manual_import_ready` | Import path is prepared, but no live data is bundled. |
| Open-Meteo | `real_snapshot` | Screening-level climate context with fallback behavior. |
| NASA POWER | `real_snapshot` | Screening-level solar/climate context with fallback behavior. |
| OpenAQ | `sample_fallback` | Demo air-quality context only. |
| WorldPop | `sample_fallback` | Demo demographic context only. |
| Copernicus / Sentinel | planned / token-required path | Metadata path only; no live satellite connector is claimed. |
| GeoDubai / Dubai Municipality | planned validation | Official validation path only; not connected. |
| DLD API Gateway | permission-required | Official validation path only; not connected. |

## OpenAI Decision Scoring

The new `/api/ai/decision-score` route is server-only and reads `OPENAI_API_KEY` only from the server environment.

Optional model variables:

- `OPENAI_MODEL`
- `OPENAI_MODEL_DECISION_SCORING`

If no server-side API key is configured, the product continues to work with deterministic fallback scoring. Frontend code must never use `NEXT_PUBLIC_OPENAI_API_KEY`.

AI scoring is used as a structured decision memo. Deterministic scoring and source caveats remain the stable baseline.

## Demo Value

This release enables demos to show:

- source readiness and lineage;
- snapshot versus fallback state;
- manually importable external data categories;
- server-side AI decision-support scoring;
- reportable AI Decision Memo output;
- Data Room and Pilot Workflow evidence linkage.

## QA Summary

- `npm run ingest:dld:public` passed.
- `npm run ingest:dld:snapshot` passed.
- `npm run ingest:public-data:all` passed.
- `npm run data:status` passed.
- `npm run validate:external-data` passed.
- `npm run lint` passed.
- `npm run build` passed.
- Vercel preview reached `READY`.
- Vercel production deployment reached `READY`.
- Preview and production smoke checks confirmed `/projects` no longer shows stale `0 snapshot / 6 demo`.
- Preview runtime error/fatal log check returned no matching logs after deployment.

## Limitations

- Not production-ready.
- Not pilot-ready without client/official validation.
- No live official DLD, Dubai Pulse, GeoDubai or Dubai Municipality integration.
- No cadastral, zoning, planning, ownership, entitlement or valuation validation.
- No auth or multi-tenant governance.
- No secure file storage.
- No durable enterprise persistence unless Supabase/PostGIS is configured and successfully used.
- Data Room remains a lightweight evidence index, not secure enterprise storage.
- AI output is decision-support narrative only and must not be treated as an official conclusion.

## Recommended Next Sprint

Workspace Shell Decomposition v2.1.1, followed by Enterprise Report Pack v2.2.
