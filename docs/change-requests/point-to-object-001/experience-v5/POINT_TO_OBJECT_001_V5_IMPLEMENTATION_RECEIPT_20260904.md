# POINT_TO_OBJECT_001 V5 Implementation Receipt

Status: `PREVIEW_RELEASE_CANDIDATE` — application work complete; exact-head Vercel verification pending

Date: 2026-09-04

Scope: isolated branch `codex/point-to-object-clickable-prototype-v1`; Production and `main` excluded

## Delivered outcome

- One bilingual Analyse / Find / Create experience for Dubai, Abu Dhabi, Doha, Riyadh, Jeddah, Kuala Lumpur, Singapore, Hong Kong and Moscow.
- Live OpenFreeMap/MapLibre presentation with OpenStreetMap-derived objects, address search, object selection, 2D/3D controls and city-bounded navigation.
- Read-only Nominatim and OSM/Overpass routes are independently gated from OpenAI credentials so map context remains testable if AI is unavailable.
- Geoanalysis V2 builds a canonical evidence pack from the selected object, its geometry and bounded surrounding context, then produces a structured English or Russian brief.
- Find queries a bounded current 2D map view for nine evidence-supported object groups and never emits synthetic candidates, ranking or completeness claims.
- Create draws or uploads one guarded AOI, reads bounded aggregate context, can hide rendered source buildings in the session, and turns a validated AI programme into deterministic conceptual massing within the AOI.
- The header exposes language and profile controls. Shared demo credentials are no longer printed in the UI or source-facing explanatory copy.

## OpenAI routing

| Operation | Quick | Standard | Deep |
| --- | --- | --- | --- |
| Initial analysis | GPT-5.6 Luna / low | GPT-5.6 Terra / medium | GPT-5.6 Sol / high |
| Focused analysis | GPT-5.6 Terra / low | GPT-5.6 Sol / medium | GPT-5.6 Sol / high |
| Analysis repair | GPT-5.6 Terra / low | GPT-5.6 Sol / medium | GPT-5.6 Sol / medium |
| Create concept | GPT-5.6 Terra / low | GPT-5.6 Sol / medium | GPT-5.6 Sol / high |

All provider requests use the Responses API with `store:false`, no model tools, strict JSON Schema, server-side model selection, bounded timeout and complete per-attempt usage/cost telemetry. One bounded repair is allowed; it adds the cost of a second full provider attempt.

## Indicative API cost per successful request

These ranges are planning estimates without a cache hit; the UI telemetry is authoritative for each completed provider call.

| Operation | Quick | Standard | Deep |
| --- | ---: | ---: | ---: |
| Initial analysis | $0.0018–$0.0040 | $0.026–$0.064 | $0.056–$0.136 |
| Focused analysis | $0.020–$0.058 | $0.056–$0.152 | $0.066–$0.142 |
| Create concept | $0.008–$0.023 | $0.020–$0.052 | $0.024–$0.056 |

## Supabase decision

Persistence code, the Preview-only gate, owner/project-scoped RPCs, RLS migration and deactivation script are prepared but not applied to hosted `geoai-dev`.

The hosted migration ledger is a verified non-contiguous applied set: 12 applied versions exist while seven earlier `20260716` migrations remain unapplied holes; the new persistence migration is the eighth pending migration. Hosted Auth currently has zero users. Applying persistence alone would create a misleading saved-state claim without the required request identity, membership and negative cross-user evidence. Therefore the safe decision for this release candidate is `NO_GO_HOSTED_APPLY`; analysis remains usable without fabricated persistence.

Activation requires, in order:

1. reconcile and replay the seven pending identity/containment migrations in a disposable Postgres environment;
2. verify the effective hosted schema, grants, RLS and API-only exposure;
3. provision an explicit Preview user and project membership without committing credentials;
4. run same-user reload and cross-user/anonymous denial tests;
5. apply `20260904065018_point_object_analysis_persistence_v1.sql` only after those checks pass.

## Verification completed

- TypeScript: PASS.
- Next.js production build: PASS, 78/78 pages.
- Point-to-object evidence contract: PASS.
- Find contract: PASS.
- AOI context contract: PASS.
- Create contract: PASS on bundled Node.js 22 runtime.
- AOI integrity: PASS, 11 geometry personas.
- Persistence static contract: PASS.
- API access guard: PASS, 100 classified handlers.
- API route inventory: PASS, 75 routes.
- Canonical hosted migration ledger reconciliation: PASS with eight declared pending migrations.
- Data-honesty AST scan: PASS, 403 files, zero findings.
- Secret hygiene, private-cache boundary, request-scoped project reads and source connector foundation: PASS.
- Local interactive QA: PASS for RU/EN, city switch, live OSM object context, 3D-to-2D Find transition, real Find result selection, AOI drawing and aggregate context.

Known infrastructure note: the system Node.js 20 runtime is approaching end of support in `@supabase/supabase-js`; verification also used the bundled Node.js 22 runtime for TypeScript-strip tests. This is not a functional blocker for the Preview build but the deployment runtime should remain on Node.js 22+.

## Exact release evidence

- Commit: pending
- Pull request: https://github.com/mmgolikov/geoai-mvp/pull/147 (Draft)
- Protected Preview: pending
- Production: unchanged
- `main`: unchanged

## Product boundary

OpenStreetMap/Nominatim/Overpass provide public, contributor-mapped screening context with uneven coverage. Generated massing is a reversible visualization from a structured programme, not BIM, an architectural design or an approved plan.

> Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.
