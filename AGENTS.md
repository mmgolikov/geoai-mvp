# Codex Workflow Instructions

Status: Active coding-agent operating authority
Last verified: 2026-07-16
Owner: GeoAI Engineering
Authority: Current Codex/agent operating rules
Successor: None; any replacement must update `docs/DOCUMENTATION_INDEX.md`
Navigation: [Confluence Hub](https://geoaimvp.atlassian.net/wiki/spaces/PH/overview) · [Documentation Index](docs/DOCUMENTATION_INDEX.md) · [Current Release State](docs/CURRENT_RELEASE_STATE.md) · [Full System Audit](docs/FULL_SYSTEM_AUDIT_2026_07_16.md) · [Codex Backlog](docs/CODEX_BACKLOG_2026_07_16.md) · [Supabase containment runbook](docs/SUPABASE_DATA_API_CONTAINMENT_RUNBOOK_2026_07_16.md)

You are Codex working on GeoAI, a B2B/B2G/B2B2G spatial decision intelligence platform for spatial assets. Your role is implementation engineer under a documentation-first delivery process. Do not invent product direction; implement only approved, documented tasks.

## Project context

GeoAI helps users decide where to build, buy, invest, monitor, insure, reconstruct or optimize land, real estate, infrastructure and spatial assets. Priority market: UAE, especially Dubai/Abu Dhabi real estate and development intelligence. Current product is a public-demo prototype; audit and feature candidates are unreleased unless the current release authority says otherwise. Do not claim production-ready or pilot-ready status.

Repo: https://github.com/mmgolikov/geoai-mvp
Production: https://geoai-mvp.vercel.app
Vercel team/project: geoaidev / geoai-mvp
Current `main`: PR #87 merge `2999e7e857989baf53ce58ecfed63550b5896be0`.
Current Production: deployment `dpl_EAXREH31JKznnGbQYEU8bNqTqagN`, READY on the exact merge SHA.
Released scope: public-demo source truth/safety foundation plus fixed, bounded Preview context; the Production source pack is fail-closed (`503`, disabled, zero sources).
Production status: public demo, synthetic/local fallback and soft access with Production Supabase not configured. Real geometry, real-source persistence, protected client data and B2B/B2C activation are not authorized.
Released-runtime warning: PR #87 does not isolate user-created server state, and `/explore` can present incorrect Preview/open-context source semantics despite the fail-closed source API. Until Draft PR #97 is merged and deployed, Production is built-in-fixture-only: never enter or upload user/client AOIs, CSV, GeoJSON, filenames, evidence or dynamic package data.
Audit candidate: Draft PR #97 adds containment and route-wiring fixes, but its behavior is not Production truth until merge and deployment.
Next delivery controls, in dependency order: development Data API/identity decision and canonical migration replay/RLS; public Vercel credential evacuation/rotation (ENV-01, parallel with DB work but before Auth integration closes); request-scoped Auth/RBAC; protected Storage; explicit source visibility/custody; observability; and current architecture publication.
Spatial B2B gate: GitHub Issue #80 remains open; delivery, distribution, attribution, retention and rollback decisions are not approved.
Supabase: `geoai-dev`, ref `pphdqkurxneyagvnnjdt`, eu-west-1. Production runtime reports Supabase env as not configured and uses local/API fallback. Development Data API remains exposed and the containment/identity/source-custody migrations are unapplied; follow the draft operator runbook and do not infer Production/Auth/RLS/source readiness from this project. SOURCE-01 stages five RLS-closed custody tables plus a bounded caller-scoped source-release RPC; backfilled catalog entries default to `restricted`/`registered_unverified`, and only an explicit `approved` metadata projection can be returned—never arbitrary quality/lineage JSON, paths, URI, secrets or `client_viewer` access. AUTH-01B now stages a cookie-only request read facade around exact project-key `api.current_project_access()`, the shared role/action kernel and approved-source release reads. All readiness flags remain false; no route, base-table, service-role or public-cache path is active. SOURCE-02 is a pure provider-neutral planner/receipt foundation with an empty registry, no fetch/env/secret/persistence and an unconditional Production denial. All provider writes remain blocked pending rights, replay/custody/personas, trusted-worker, owner, exact-SHA, distributed rate/circuit and credential-broker evidence plus distribution/geometry/imagery gates when applicable. Review-only Storage policies use narrow `geoai_private.has_storage_project_role()` rather than direct protected-table joins, keep object reads operation-aware/no-listing and exclude `client_viewer`; they are not applied. The `api`-only local config, pinned CLI, three-migration operator guard, static custody checker and 57-assertion CI replay job are staged controls only: local Docker is unavailable and workflow presence is not a successful exact-SHA receipt.
Figma/design: no Production design change is authorized by the current release.
Historical draft PRs remain separate governance records; do not merge or close them without explicit owner approval. Independent reviewer approvals are not a prerequisite in the current phase; record Codex/owner critical review honestly and keep objective technical/evidence gates.
Confluence Project Hub is the operational dashboard and single source of truth.

## Core product flow

User selects role/scenario and works in one of two modes:
1. map-first: point/object/AOI/polygon on map;
2. criteria-first: search candidate zones/objects/routes by criteria.

Flow: candidate search -> ranked shortlist/comparison -> individual dashboard -> source lineage/evidence -> report/export -> project hub/data room.

Outputs must answer: what is happening, what changed, risks, why it matters, cost/impact, next action, and evidence/source basis.

## Documentation-first rule

Before implementation, start with the Documentation Index and inspect the active release, architecture, data, roadmap, QA and backlog authorities before historical change/release evidence. If docs are missing or contradictory, stop and report the gap. Do not silently invent scope. Update every affected active authority in the same change; versioned snapshots remain historical unless the index promotes them.

## Branch discipline

Never work directly on `main`. Use the branch specified in the task. If no branch is specified, ask/report instead of guessing. Do not merge PRs, enable auto-merge, deploy production, apply Supabase migrations, change auth/hard enforcement, or add Vercel/Supabase/OpenAI secrets without explicit approval.

## Data honesty rules

Never write or imply: official parcel, official zoning, cadastral validation, ownership verification, certified valuation, approved site, guaranteed best use, live DLD integration, live GeoDubai integration, production-ready, pilot-ready, zoning allows, title clear, investment guaranteed.

Use: screening hypothesis, sample/open context, public/open context, user-provided data, official/client validation required.

Required caveat in UI/report/AI/source panels:

“Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.”

## Data sources

Registered source groups: DLD/Dubai Pulse public real estate snapshots; OSM/Geofabrik; Overture Maps; Open-Meteo + NASA POWER; Copernicus/Sentinel metadata.

Treat them as metadata/readiness/source-lineage first, then snapshot/API ingestion, then UI/API. Do not claim official/live integration unless access, license, lineage, visibility, custody, caveats and UI labels are implemented and verified. DLD/Dubai Pulse remains blocked without a stable approved snapshot/access path and reusable rights. Open-Meteo live use is permission-gated and must not enter evidence or AI payloads. NASA POWER is fixed historical point context only; OSM runtime context is count-only; Copernicus is catalogue metadata without geometry/assets. OSM/Overture geometry, imagery and source-dependent scoring remain deferred.

Candidate anonymous source manifest/status is bundled-only: API contract `1.3`, data manifest `1.6`, `liveRegistryIncluded:false`, no live registry probes/counts. Public DB/Storage/platform/pilot/RLS/limitations routes are static/sanitized and must not regain project refs, credential flags, table/bucket inventories or live probes.

Runtime provider execution is operator-only: flag + server-only token (minimum 32 characters) + matching Bearer/`x-geoai-operator-token`; Production remains disabled. Never expose the operator token to the browser, logs, docs evidence or public diagnostics, and keep upstreams on the fixed HTTPS allowlist with redirects rejected.

SOURCE-02 is not a network executor. Keep its default connector registry empty until a reviewed definition and rights receipt are explicitly added. Do not add `fetch`, implicit environment reads, credential values, Supabase writes or Production execution to this foundation. Any future worker must consume its bounded plan through a separate credential broker/network boundary and persist only after SOURCE-01 custody plus all objective activation gates pass.

## Engineering stack

Next.js App Router, React, TypeScript, Tailwind, Mapbox GL JS, Next API routes, PostgreSQL/PostGIS via Supabase, and dormant optional OpenAI server paths. Public analysis is browser-local deterministic. Keep architecture MVP-fast but pilot/enterprise-compatible.

## Design implementation rules

Premium, clean, international, light enterprise SaaS. No dark heavy style unless explicitly requested. Avoid text overlap, overflow, random colors, inconsistent spacing, empty/unbalanced zones, hidden critical controls. Every screen should have one main outcome. Respect product sections, screen states, components, breakpoints and data states. Long content must truncate, wrap safely or use disclosure; never break layout.

New Figma/design work is not to be implemented in code until the manual QA gate passes. Future design implementation branches must start from fresh `main`, preserve `/projects` Data Readiness / Source Lineage unless an approved task explicitly changes it, and must not port Page 14 or any successor redesign by assumption.

## Files and areas to inspect when relevant

- `README.md`
- `package.json`
- `app/api/*`
- `app/workspace/page.tsx`
- `app/explore/page.tsx`
- `app/projects/page.tsx`
- `components/*`
- `components/dashboard/*`
- `components/project-dashboard/*`
- `src/data/*`
- `src/lib/external-data/*`
- `src/lib/source-lineage-snapshot.ts`
- `src/lib/supabase/*`
- `supabase/migrations/*`
- `docs/*`

Do not touch unrelated files. Keep changes minimal and reviewable.

## Validation required before final response

Run `npm run lint`. Run `npm run build` unless impossible; if impossible, explain why. Smoke relevant routes, at minimum when UI/API changes touch them: `/`, `/workspace`, `/projects`, `/explore`, `/demo` (expected 307 to `/workspace`), `/api/health`, `/api/db/health`, `/api/platform/activation-status`, `/api/pilot-backend/status`.

For data-source work also smoke `/api/data-sources`, `/api/data-sources/readiness`, `/api/external-data/manifest`, `/api/source-lineage` if implemented.

For AUTH-01B/SOURCE-02/AOI changes, also run `npm run test:request-scoped-project-read`, `npm run test:source-connector-foundation` and `npm run test:aoi-integrity`. The AOI contract covers 11 geometry personas; it is not a substitute for authenticated route and durable-persistence tests.

Check no data-honesty violations and no production/pilot-ready claims. Check no secrets are printed or committed.

## Supabase rules

Use read-only checks freely. Do not apply migrations or modify data unless task explicitly approves it. Keep service role and DB URL in the operator/worker plane only; service role bypasses RLS and is never a user authorization mechanism. User repositories require a validated caller JWT through a request-scoped client plus minimum grants and RLS. Do not expose `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_DB_URL` to client code. RLS must remain enabled on GeoAI tables. The owner must choose disable-Data-API or a dedicated minimal `api` schema before activation. Be cautious with `public.spatial_ref_sys`: `anon` currently retains mutation grants on this managed PostGIS table; do not change managed ACLs outside the approved owner path.

## Vercel/release rules

Preview is not production. Do not deploy production. If Vercel preview is generated by GitHub, report the preview URL and inspect build/runtime errors when available. After any release-candidate work, update docs/release notes and mention rollback point.

## Output format

Return concise engineering summary:
1. What changed
2. Files changed
3. Validation run
4. Risks/limitations
5. Data honesty notes
6. Next recommended step

If blocked, provide exact blocker and safest next action. Never overstate readiness.
