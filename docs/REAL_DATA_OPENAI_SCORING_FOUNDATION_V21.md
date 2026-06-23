# GeoAI Real Data + OpenAI Decision Scoring Foundation v2.1

Date: 2026-06-24

GeoAI v2.1 introduces the first combined foundation for manual external snapshot activation and optional OpenAI-based structured decision scoring. It remains a demo/pilot-foundation release, not a production-ready or official validation product.

Required caveat:

> screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.

## Scope

- Fixes the Projects dashboard market-area mismatch so bundled snapshot records are visible as snapshot context with fallback caveats.
- Separates source data modes from repository modes.
- Hardens manual DLD / Dubai Pulse-style CSV snapshot ingestion.
- Adds `npm run data:status` and `npm run validate:external-data`.
- Adds server-only `/api/ai/decision-score` for structured OpenAI decision scoring with deterministic fallback.
- Adds a compact AI Decision Memo to analysis dashboards and reports.
- Links current external readiness into Data Room and Pilot Workflow evidence metadata.

## Repository Mode vs Source Data Mode

Repository modes describe storage/backend behavior:

- `supabase`
- `local_fallback`
- `browser_local`
- `demo_seed`
- `disabled`

Source data modes describe evidence/source state:

- `real_snapshot`
- `imported_snapshot`
- `sample_fallback`
- `manual_import_ready`
- `permission_required`
- `planned_validation`
- `demo_seed`

These terms must not be mixed. `local_fallback` means storage is non-durable; it does not describe whether a data source has a snapshot.

## Manual External Snapshot Workflow

Raw DLD / Dubai Pulse-style files may be placed under:

- `data/external/dld/`
- `data/external/dubai-pulse/`
- `data/external/samples/`

Supported DLD filename patterns:

- `dld_transactions_YYYYMMDD.csv`
- `dld_rents_YYYYMMDD.csv`
- `dld_projects_YYYYMMDD.csv`
- `dld_valuations_YYYYMMDD.csv`
- `dld_land_YYYYMMDD.csv`
- `dld_building_YYYYMMDD.csv`
- `dld_unit_YYYYMMDD.csv`
- `dld_brokers_YYYYMMDD.csv`
- `dld_developers_YYYYMMDD.csv`

Commands:

```bash
npm run ingest:dld:public
npm run ingest:dld:snapshot
npm run ingest:public-data:all
npm run data:status
npm run validate:external-data
```

Missing real files do not fail the build. Categories with no real or sample file are marked `manual_import_ready`. Bundled samples remain `sample_fallback`.

## OpenAI Decision Scoring

New endpoint:

- `GET /api/ai/decision-score` returns route status.
- `POST /api/ai/decision-score` returns structured decision scoring.

Environment variables:

- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `OPENAI_MODEL_DECISION_SCORING`

The API key is server-only. Do not expose it as `NEXT_PUBLIC_*`.

If `OPENAI_API_KEY` is missing, OpenAI fails, JSON is invalid, or forbidden claims are detected, the endpoint returns deterministic fallback scoring.

## Decision Score Output

The structured score includes mode, decision posture, recommended use, suitability score, risk score, confidence, evidence used, key drivers, key risks, validation required, next actions, caveat and unsupported claims.

Deterministic Express Analysis scores remain the baseline. AI scoring is a scenario-specific decision memo, not a replacement for validated underwriting.

## Guardrails

AI output must not claim official parcel boundary, zoning approval, cadastral validation, ownership verification, certified valuation, approved site, guaranteed best use, official suitability or legal conclusion.

If unsupported language appears, confidence is downgraded and unsupported claims are listed.

## Limitations

- No live DLD, Dubai Pulse or GeoDubai integration.
- No DLD API Gateway connection.
- No scraping, captcha bypass or protected endpoint automation.
- No auth.
- No durable Supabase/PostGIS persistence added in this sprint.
- No secure file storage.
- No official validation connectors.
- OpenAI scoring is decision-support hypothesis only.
- Official validation is required before legal, planning, cadastral, zoning, ownership, valuation or investment conclusions.

## Next Recommended Sprint

Workspace Shell Decomposition v2.1.1 or Enterprise Report Pack v2.2.
