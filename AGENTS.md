# Codex Workflow Instructions

Status: Active coding-agent operating authority
Last verified: 2026-08-19
Owner: GeoAI Engineering
Authority: Current Codex/agent operating rules
Successor: None; any replacement must update `docs/DOCUMENTATION_INDEX.md`
Navigation: [Documentation Index](docs/DOCUMENTATION_INDEX.md) · [Current Release State](docs/CURRENT_RELEASE_STATE.md) · [Product Baseline and Readiness](docs/PRODUCT_BASELINE_AND_READINESS.md) · [External Authority Registry](docs/EXTERNAL_AUTHORITY_REGISTRY.json) · [Roadmap](docs/roadmap.md) · [QA Checklist](docs/qa-checklist.md)

You are Codex working on GeoAI, a B2B/B2G/B2B2G spatial decision intelligence platform for spatial assets. Your role is implementation engineer under a documentation-first delivery process. Do not invent product direction; implement only approved, documented tasks.

## Project context

GeoAI helps users decide where to build, buy, invest, monitor, insure, reconstruct or optimize land, real estate, infrastructure and spatial assets. Priority market: UAE, especially Dubai/Abu Dhabi real estate and development intelligence. Current product is a public-demo prototype; audit and feature candidates are unreleased unless the current release authority says otherwise. Do not claim production-ready or pilot-ready status.

Repo: https://github.com/mmgolikov/geoai-mvp
Production: https://geoai-mvp.vercel.app
Vercel team/project: geoaidev / geoai-mvp
Release policy/schema: [`docs/RELEASE_AUTHORITY_POLICY.json`](docs/RELEASE_AUTHORITY_POLICY.json). Historical evidence: [`docs/LAST_VERIFIED_RELEASE_SNAPSHOT.json`](docs/LAST_VERIFIED_RELEASE_SNAPSHOT.json).
Current externally verified `main` and `release/production`: merged PR #113 at `7f323c4227f2409f3fe2d4d68be48a30176f4e2a`.
Current externally verified Production: deployment `dpl_4yBHCo1eZ7N6GYQWGAg1EdQGwFTE`, READY at https://geoai-mvp.vercel.app on the exact merge SHA.
Live operational authority is external post-release evidence from GitHub default-branch/deployment state, the Vercel Production alias and the Project Hub receipt. Repository snapshots are historical and are superseded when newer release evidence exists.
Rollback deployment for the PR #113 tuple: unverified; select and verify a rollback target before any future Production action.
Released stage: `public_demo_prototype`; public demo and browser-local deterministic workflows are active. The Production source pack is fail-closed (`503`, disabled, zero sources).
Production status: public demo, synthetic/local fallback and soft access with Production Supabase not configured. Real geometry, real-source persistence, protected client data and B2B/B2C activation are not authorized.
Released-runtime boundary: PR #97 containment, PR #106 public-funnel/release-truth fixes and PR #113 Product System v3.2.2 correction are released, but the public demo remains browser-local and fixture-bounded. Never enter or upload confidential, regulated, sensitive or client-protected information. Protected persistence, real sources and confidential pilot operation remain blocked.
Next delivery controls, in dependency order: development Data API/identity decision and canonical migration replay/RLS; fresh exact-head ENV-01 Preview/negative evidence after owner-confirmed Vercel evacuation and development legacy-key disablement; request-scoped Auth/RBAC hosted personas; protected Storage; explicit source visibility/custody; observability; and current architecture publication.
Spatial B2B gate: GitHub Issue #80 remains open; delivery, distribution, attribution, retention and rollback decisions are not approved.
Current Supabase authority is deliberately split. GeoAI_main observed management metadata only in a read-only refresh on 2026-08-19 (`observedAt` `2026-08-19T20:07:43Z`; valid through `2026-08-20T20:07:43Z`): development project `geoai-dev`, ref `pphdqkurxneyagvnnjdt`, is `INACTIVE`; Free rehearsal `geoai-auth-rehearsal`, ref `bkmfcjzalcvdsdvyxpgi`, is `ACTIVE_HEALTHY`. Those management labels do not read or certify either database. Physical schema, migration ledger, Auth and database rows, source rows, advisors, RLS, policies and Storage are `unverified` until a fresh authorized physical readback.

The 2026-07-16 rehearsal receipt is historical evidence only. It recorded 18 migration-ledger entries, `183/183` hosted pgTAP personas, a 14-RPC `api`-only PostgREST boundary, RLS on 29 GeoAI domain tables, zero uncovered domain foreign keys, one pre-existing Auth user without recorded project/tenant/protected-resource authority, and four Storage buckets with zero object policies. Do not restate any of those values as current hosted truth. The local migration manifest now lists a seventh pending MFA-removal compatibility migration, but its current hosted application state is unverified and it must not be applied to rehearsal, development or Production by inference.

The application candidate uses one existing-user-only email/phone login surface, redirects `/register` and `/mfa` to `/login`, and provides a browser-only mock demo account `demo@geoai.space`; the public demo password is intentionally non-authoritative and must never grant Admin, protected API or customer-data access. Public email and phone OTP must keep `shouldCreateUser: false`; future registration requires a separately approved invitation/server policy. Phone code transport still requires an external SMS provider. Real HTTP email/phone/browser/Admin/Storage personas, resource-specific Admin pagination, development upgrade/drift certification and Production activation remain open; no real-user browser persona was executed in CR 09.22. Never create a duplicate rehearsal or change managed PostGIS ACL/RLS blindly. Historical receipt: `docs/SUPABASE_AUTH_REHEARSAL_RECEIPT_2026_07_16.json`. SOURCE-02 remains an unsigned authorization-none correlation claim with empty registry, no fetch/env/secrets/persistence or atomic reservation writer; real sources remain blocked.
Figma/design: the released PR #113 Product System v3.2.2 runtime is the current visual/product baseline and must be preserved. CR 10.02 and Product System v3.2.1 receipts are historical provenance; Figma parity is only partial and no Figma/Code Connect write, page-body redesign or new Production design is authorized. Draft PR #143 (`product/gcc-real-estate-decision-platform-v1` at `e92fb5d8e8d83de72ee4c4376d958ce598c00536`) is an excluded non-authority: do not copy, cherry-pick, recreate or salvage its design/UI without file-level review and explicit inclusion in a separately approved Change Request.
Auth-rehearsal Preview `dpl_66rk4tVny9TmPjo7BKona5Xo1p1b` is READY on exact candidate head `8e0039260f4cf201b230288b6b02c48d2955600e`; Quality Gate run `29534323096` passed. That evidence predates the simplified email/phone/mock-demo product decision. Hosted HTTP evidence proves hard `supabase_auth`, public-demo denial and no synthetic anonymous identity, closing ENV-01 for non-Production Preview integration. Real email/phone/Admin/rendered-browser personas and the simplified exact-head Preview remain unclaimed; never relabel HTTP smoke as browser evidence.
Historical draft PRs remain separate governance records; do not merge or close them without explicit owner approval. Independent reviewer approvals are not a prerequisite in the current phase; record Codex/owner critical review honestly and keep objective technical/evidence gates.
Confluence Project Hub is the single operational entry point/dashboard. Exact SHA, deployment and database facts are governed by the linked repository authorities and machine receipts.

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

SOURCE-02 is not a network executor or reservation writer. Keep its registry empty and its `reserve_or_replay` claim unsigned/correlation-only with authorization `none`. Do not add `fetch`, implicit environment reads, credential values, Supabase writes or Production execution. A future worker must revalidate the external registry, exact plan and hashes, reserve atomically before fetch, execute through the trusted broker/network boundary and persist transactionally through SOURCE-01 after all objective gates pass.

## Engineering stack

Next.js App Router, React, TypeScript, Tailwind, Mapbox GL JS, Next API routes, PostgreSQL/PostGIS via Supabase, and dormant optional OpenAI server paths. Public analysis is browser-local deterministic. Keep architecture MVP-fast but pilot/enterprise-compatible.

## Design implementation rules

Premium, clean, international, light enterprise SaaS. No dark heavy style unless explicitly requested. Avoid text overlap, overflow, random colors, inconsistent spacing, empty/unbalanced zones, hidden critical controls. Every screen should have one main outcome. Respect product sections, screen states, components, breakpoints and data states. Long content must truncate, wrap safely or use disclosure; never break layout.

New Figma/design work is not to be implemented in code without an explicit owner-approved Change Request. Production at PR #113 is the current Product System v3.2.2 visual baseline. Future design implementation branches must start from an exact owner-approved baseline, preserve `/projects` Data Readiness / Source Lineage unless an approved task explicitly changes it, and must not port PR #143, Page 14, Page 90, Page 99 or any successor redesign by assumption.

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

For AUTH/SOURCE-02/AOI changes, also run `npm run test:request-scoped-project-read`, `npm run test:source-connector-foundation` and `npm run test:aoi-integrity`. Permanent-user evidence must fail closed on subject mismatch/anonymous ambiguity; SOURCE claims must remain non-authoritative until external revalidation and atomic reservation. The AOI contract covers 11 geometry personas; it is not a substitute for authenticated route and durable-persistence tests.

Check no data-honesty violations and no production/pilot-ready claims. Check no secrets are printed or committed.

## Supabase rules

Use read-only checks freely. Do not apply migrations or modify data unless task explicitly approves it. Keep service role and DB URL in the operator/worker plane only; service role bypasses RLS and is never a user authorization mechanism. User repositories require a validated caller JWT through a request-scoped client plus minimum grants and RLS. Do not expose `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_DB_URL` to client code. RLS must remain enabled on GeoAI tables. The owner must choose disable-Data-API or a dedicated minimal `api` schema before activation. The historical 2026-07-16 development receipt recorded mutation grants for `anon` on managed `public.spatial_ref_sys`; current physical grants are unverified. Do not change managed ACLs outside the approved owner path.

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
