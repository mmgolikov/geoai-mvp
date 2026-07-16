# GeoAI MVP

Status: Active repository overview
Last verified: 2026-07-16
Owner: GeoAI Engineering
Authority: Current repository/product behavior and local setup
Successor: None; any replacement must update `docs/DOCUMENTATION_INDEX.md`

GeoAI is a Next.js spatial decision intelligence MVP for evaluating Dubai real estate, infrastructure, construction, and climate-risk scenarios. The current release is a public demo prototype, not a production-ready or pilot-ready product. It uses Mapbox, synthetic/demo geospatial layers, deterministic scoring, bounded source-context contracts, comparison dashboards, and print-friendly report previews.

Release authority is PR #87 / `2999e7e857989baf53ce58ecfed63550b5896be0`. This worktree contains the unreleased Draft PR #97 audit candidate; implementation claims below that concern browser-only state, server-mutation containment or `/explore` source wiring are candidate behavior until merge and deploy. The released Production demo must be used only with built-in synthetic fixtures: do not enter or upload user/client AOIs, CSV, GeoJSON, filenames, evidence or dynamic package data.

The historical Pilot UX v3.6 label describes the current workspace-first and criteria-first design lineage; it is not Product SemVer or evidence of client/pilot approval. The current released build is identified by its Git commit and deployment ID. Outputs remain screening hypotheses requiring official/client validation.

Public-demo analysis and decision scoring run deterministically in the browser. Server `POST /api/analyze` and `POST /api/ai/decision-score` fail closed with 403 before body parsing until AUTH-01 supplies a verified request identity. OpenAI upstream code is dormant and cannot be activated by an API key or environment flag alone.

## Current isolated Auth/database rehearsal

The Free Supabase project `geoai-auth-rehearsal` (`bkmfcjzalcvdsdvyxpgi`, `eu-west-1`) is now the only environment where the six candidate migrations and owner Data API path have been executed. It is not development or Production. Hosted PostgreSQL evidence passes `183/183` pgTAP personas across identity/RLS/source custody, Auth/Admin/client/project activation and lifecycle remediation; all test Auth users rolled back. The forward remediation enforces organization→project→invitation locking, durable expired status, bootstrap-v2 change provenance, dynamic temporary-ban behavior and an initial-only 25-row-per-collection Admin snapshot. PostgREST remains pinned to the RPC-only `api` schema (`14` functions, `0` relations): anonymous health returns HTTP 200, `public` returns `PGRST106`, and a base-table lookup in `api` returns `PGRST205`. All `29` GeoAI domain tables have RLS and all domain foreign keys are covered after `39` added indexes.

This closes the SQL/rehearsal and API-schema isolation increments only. A two-session hosted PostgreSQL regression also completed `create→accept` and `create→revoke` lock-order transitions without deadlock or residual rows; it was table-level runtime evidence, not authenticated RPC/HTTP E2E. Exact Auth-rehearsal head `8e0039260f4cf201b230288b6b02c48d2955600e` passed Quality Gate run `29534323096`, and fresh Preview `dpl_66rk4tVny9TmPjo7BKona5Xo1p1b` is READY with hard Supabase Auth mode, public demo denied and no synthetic anonymous identity. This closes privileged Vercel ENV-01 for non-Production Preview integration. Real email signup/login/MFA/Admin personas, first-owner bootstrap, Storage policies/personas, development apply, real sources and Production remain blocked. See the [machine receipt](docs/SUPABASE_AUTH_REHEARSAL_RECEIPT_2026_07_16.json).

## Implemented Features

- Homepage and `/workspace` application shell
- GeoAI Explore v1.1 embedded scenario command panel at `/workspace` and `/explore` with B2C/B2B roles, scenario setup, explicit criteria-first candidate search, searched candidate map overlays, shortlist comparison and direct Workspace analysis targeting
- Dubai-centered Mapbox workspace
- Point selection with marker and coordinates
- Polygon AOI drawing workflow with vertex handles, preview edge, validation and approximate area/perimeter measurements
- Project AOI Library with save, reopen, rename, delete, GeoJSON import and GeoJSON export for user-provided screening polygons
- Synthetic demo geospatial layers:
  - Development Zones
  - Premium Real Estate Areas
  - Infrastructure Nodes
  - Construction Sites
  - Coastal / Flood Risk Zones
  - Heat Risk Zones
  - Transport Corridors
- Collapsed spatial layer controls with toggles and legend
- Demo object selection from map layers
- Scenario selector:
  - Real Estate Development
  - Investment Site Selection
  - Construction Monitoring
  - Infrastructure / Urban Planning
  - Climate & Risk
  - Custom Query
- Express Analysis dashboard with browser-local deterministic scores and narrative
- Dormant, fail-closed server OpenAI path reserved for request-scoped Auth/RBAC
- Dubai Market Context Adapter v0.1 with seed/demo-normalized area matching
- Data Ingestion v0.1 for seed_static market metrics and deterministic normalization
- Open Geospatial Baseline v0.1 for local OSM-style roads, POI anchors, landuse context and accessibility metrics
- Spatial Data Adapter v0.1 for seed_geojson demo layers and structured feature selection
- Data Credibility v0.5 local-first CSV / GeoJSON upload workflow with browser-local source lineage
- Comparison mode for 2-3 selected points, demo objects, or user-drawn AOIs
- Comparison dashboard with scores, recommendation, risks, and next actions
- Print-friendly report preview for single-site analysis and comparison
- Dedicated printable report route for saved reports: `/reports/[id]/print`
- Lightweight project/workspace selector with local demo fallback
- Project Dashboard v0.1 for active project summary, KPIs, recent analyses, data readiness and next actions
- Client Data Room Foundation v1.9 read-only/seed UI for project-scoped AOIs, analyses, reports, comparisons, validation checklist and pilot deliverable summary; public server mutations are blocked
- Pilot Workflow & Deliverables v2.0 read-only/seed UI for project-scoped client inputs, deliverables and caveated workflow-readiness scoring; public updates are blocked
- Auth & Project Access Foundation v2.2 with public demo access mode, Supabase Auth readiness and compact access status indicators
- Unreleased exact-target Auth candidate with `/register`, `/auth/callback`, `/login`, `/mfa`, `/onboarding` and `/admin`; PKCE cookie sessions, local logout, TOTP AAL2 elevation, server-hashed one-time invitations and `api`-only Admin RPCs are implemented but not hosted-persona certified
- Supabase/PostGIS Durable Persistence Foundation v2.3 with additive migration SQL, schema readiness checks, RLS draft and audit event foundation
- Pilot Infrastructure Activation v2.4 with guarded migration/seed/verify scripts, activation status APIs, soft access metadata, audit integration, storage readiness and known limitations tracker
- Validation Governance & Official Connector Readiness v2.5 for project validation evidence metadata, official connector readiness, report appendices and AI claim guardrails
- Secure File Storage & Evidence Uploads v2.6 dormant foundation with readiness/API/policy drafts; public upload and metadata mutations are blocked pending AUTH-01/STORAGE-01
- Evidence Review Workflow & Signed URL Verification v2.7 domain/read-only foundation; public review/upload-intent mutations are blocked
- Enterprise Report Pack v2.8 with structured seed/package model, protected printable route, safe JSON export and governance appendices; public package mutation is blocked
- Pilot Backend Activation & Hardening v2.9 foundation with static public limitations, sanitized status DTOs and operator-only infrastructure diagnostics
- Pilot Readiness & Client Delivery Package v1.1 with client-specific pilot packages, readiness scoring, setup checklist and deliverable framing
- Offline DLD / Dubai Pulse CSV ingestion prototype with normalized sample outputs
- API routes for health, demo objects, and analysis
- Vercel-ready Next.js deployment structure

## Tech Stack

- Next.js App Router
- TypeScript
- React
- Tailwind CSS
- Mapbox GL JS
- Next.js API routes
- Synthetic GeoJSON-style demo data
- Deterministic local mock scoring logic
- Browser-local deterministic analysis; server OpenAI generation is blocked until request-scoped Auth/RBAC exists
- Seed market context adapter for Dubai area-level qualitative intelligence
- Local market ingestion layer with validation, normalization, aggregation, and data quality notes
- Spatial adapter layer with geometry validation, centroid/area utilities, and seed GeoJSON registry

## Local Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open the URL printed by Next.js, then go to `/workspace`.

Example:

```text
http://localhost:3000/workspace
```

If port `3000` is occupied, Next.js may start on another port. Use the exact URL printed in the terminal.

## Environment Variables

```bash
NEXT_PUBLIC_MAPBOX_TOKEN=
OPENAI_API_KEY=
OPENAI_MODEL=
OPENAI_MODEL_DECISION_SCORING=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_GEOAI_ALLOW_LOCAL_SUPABASE=false
NEXT_PUBLIC_AUTH_MODE=
GEOAI_ACCESS_ENFORCEMENT_MODE=soft
GEOAI_REQUIRE_SUPABASE_READY=false
GEOAI_REQUIRE_STORAGE_READY=false
GEOAI_ALLOW_DEMO_PUBLIC=true
GEOAI_ALLOW_OPENAI_UPSTREAM=false
GEOAI_ENABLE_PREVIEW_SOURCE_PACK=false
GEOAI_OPERATOR_SOURCE_TOKEN=
```

`NEXT_PUBLIC_MAPBOX_TOKEN` is required for the live Mapbox basemap.

`OPENAI_API_KEY` is optional and server-only. A key alone never activates upstream calls. Until AUTH-01 completes membership/resource integration and real persona evidence, public analysis remains browser-local and both server generation POST routes return 403.

Supabase/PostGIS is optional in v0.1. When Supabase environment variables are not configured, GeoAI remains fully usable in local/demo mode and analysis history stays in browser storage.

`NEXT_PUBLIC_AUTH_MODE` is optional and defaults to `demo_public`. Valid values are `demo_public`, `supabase_auth`, and `disabled`. `supabase_auth` now becomes effective only when the URL resolves to the exact development or Auth-rehearsal allowlist and the key has the `sb_publishable_` shape. Arbitrary Supabase hosts fail closed; exact loopback `http://127.0.0.1:54321` additionally requires `NEXT_PUBLIC_GEOAI_ALLOW_LOCAL_SUPABASE=true`. The implemented candidate uses PKCE cookie transport, `auth.getClaims()` plus canonical `auth.getUser()`, `api.current_profile()`, local logout, TOTP MFA and AAL2-gated Admin/Onboarding APIs. Repository, membership and RLS persona readiness flags remain false; enabling the mode is not runtime certification and creates no public-demo fallback.

Invalid environment values fail closed: an unknown Auth mode becomes `disabled`; an unknown enforcement mode becomes `hard`; an invalid demo-public flag becomes `false`; and invalid Supabase/Storage readiness flags become `true`. This prevents a typo from weakening access or readiness requirements.

Pilot backend activation is controlled by server/runtime environment variables. `GEOAI_ACCESS_ENFORCEMENT_MODE=soft` preserves the public demo. `hard` requests protected enforcement but remains fail-closed until verified Auth, membership, RLS, Storage and audit evidence exists; it does not activate Auth by itself. `GEOAI_ALLOW_DEMO_PUBLIC=true` keeps seeded demo projects visible while hard mode is being tested.

The AUTH permanent-user boundary requires a UUID `claims.sub` exactly equal to canonical `auth.getUser().id`, plus explicit `claims.is_anonymous === false` and `user.is_anonymous === false`, before any profile RPC. Subject mismatch is a 401 and anonymous identity is a 403; missing or ambiguous evidence fails closed. Session, MFA and Admin/Onboarding routes consume this boundary in the local candidate, while Product repositories remain disconnected and live HTTP/JWT/RLS/IDOR personas remain open.

Bounded Preview provider execution is off by default. The non-secret `GEOAI_ENABLE_PREVIEW_SOURCE_PACK=true` flag is necessary but never sufficient: a reviewed local/Preview deployment also needs a server-only `GEOAI_OPERATOR_SOURCE_TOKEN` of at least 32 characters and each request must supply the matching Bearer or `x-geoai-operator-token`. Production remains disabled even when these values exist. The pack remains non-persistent/non-scoring, uses a fixed HTTPS host allowlist with redirects rejected, cancels non-success and oversized bodies, and enforces strict provider/date/value schemas. Exact-deployment provider evidence and distributed budgets remain required.

### Supabase development foundation — not activation guidance

Use `npm run supabase:activation-status` only for a local, read-only inspection of an exact allowlisted development or Auth-rehearsal target. It rejects arbitrary Supabase refs. Project `geoai-dev` (`pphdqkurxneyagvnnjdt`, `eu-west-1`) is not a pilot target and is not Product runtime.

This development target is separate from Production and is not contained yet. The 2026-07-16 11:31 UTC snapshot found it `ACTIVE_HEALTHY` on PostgreSQL `17.6.1.141`, with 20 public tables/19 using RLS (`spatial_ref_sys` is the exception), zero Auth users, four buckets and zero `storage.objects` policies. A later read-only migration-ledger check still shows exactly the ten historical entries and none of the six current candidates. `anon` and `authenticated` each retained 22 public-table `TRUNCATE` grants; advisors were 14 security findings (one ERROR, 13 WARN) and 71 performance findings (53 INFO, 18 WARN). The repository reconstructs the exact ten-entry live migration ledger, adds a pre-ledger reconciliation artifact, pins Supabase CLI `2.109.1`, stages operation-specific RLS plus a minimal `api.healthcheck()`/identity/membership/source-release RPC allowlist, and keeps direct `public` grants closed in the pending model. These are rehearsal-proven but development-unapplied artifacts. Before Auth, real sources or protected files, the owner must expose only `api` (or disable the Data API) and prove development upgrade replay, direct-`public` denial and live caller-JWT/Storage/source personas. Follow the [Supabase Data API Containment Runbook](docs/SUPABASE_DATA_API_CONTAINMENT_RUNBOOK_2026_07_16.md); it authorizes no development change.

Pending SOURCE-01 migration `20260716113000_geoai_source_custody_foundation_v1.sql` adds five RLS-enabled, direct-grant-closed custody tables: catalog, immutable releases, artifacts, status events and ingestion receipts. Composite tenant/release and actor organization/project-membership FKs prevent cross-scope custody rows. Legacy registry backfill is fail-closed as `restricted`/`registered_unverified`. Bounded `api.current_source_releases()` returns only an explicit approved metadata projection for owner/admin/analyst/viewer in the caller project; it omits arbitrary quality/lineage summary JSON, Storage paths, source URIs, secrets and `client_viewer` access. The migration connects no provider and exposes no write API; all source-provider writes remain blocked pending a trusted worker design, rights approval and execution evidence.

SOURCE-02 adds a pure `reserve_or_replay` receipt-claim v1 contract. Execution and idempotency hashes bind the exact environment, tenant, connector/provider/parser, rights, broker, endpoint/network/body and acquisition-window contract; only actor identity is omitted from the shared acquisition key. The unsigned claim is correlation-only with `authorization: none`: an external registry/plan/hash revalidation boundary, trusted executor and transactional SOURCE-01 writer remain mandatory, and the atomic pre-fetch reservation writer does not exist. Its shipped connector registry stays empty; it performs no provider `fetch`, environment/secret read, credential injection or persistence and denies Production. It does not activate a source.

Functional/evidence head `e999c5a07d3ced6c95f2eb44f6a5f03a9c17caea` (tree `73b7c198813d6aede795b8b186bd4d58e741b181`) passed GitHub Quality Gate run `29500488408`. Application job `87627894974` succeeded. Supabase job `87627894968` passed the clean 71-assertion pgTAP suite, then a synthetic local exact-ten-ledger-prefix/pre-ledger-repair/three-pending-migration/security-surface rehearsal, then a second 71/71 pgTAP pass. This rehearsal is explicitly not a current-development clone, live drift check, live apply or DB-01 certification. Quality artifact `8376235675` is `geoai-quality-evidence-29500488408`, digest `sha256:dcabdae37373a7c7ca7676cd0761c5c56e7b2ffb8c35104ec1ed0330dfb39de2`; database artifact `8376300064` is `geoai-database-evidence-29500488408`, digest `sha256:c9297dbde840bef1c289fb1aac55a2c3ee743a1be7411c49a59e10df6ed552f1`. Exact-head replay still closes only synthetic/ephemeral evidence: local Docker remains unavailable, and live-derived upgrade replay, drift, live apply, Data API containment, live JWT/Storage/source personas, advisor parity and DB-01 remain open.

Because authenticated callers have no direct `public`/Auth-table `SELECT`, the review-only Storage policy uses narrow `SECURITY DEFINER` predicate `geoai_private.has_storage_project_role()` for one exact organization/project path and role set. Authenticated object reads remain operation-aware so bucket listing is denied, and `client_viewer` remains excluded from raw objects. The policy is not applied or Storage-certified.

The current migration chain is not apply-ready for development or Production. Do not run `supabase:migrate:apply` against either target until DB-01 proves a target-derived upgrade/drift path, the owner completes the target-specific containment runbook, and an exact apply/rollback plan is approved. The isolated rehearsal apply is recorded separately and grants no broader authorization. Historical [Supabase Pilot Activation](docs/SUPABASE_PILOT_ACTIVATION.md) guidance is superseded for current operations.

Privileged Supabase/DB, Storage-write and provider credentials belong only in a separate operator/worker or trusted-terminal environment described by `.env.operator.example`; never configure them in the public GeoAI Vercel application. The public app may eventually use a Supabase URL plus an `sb_publishable_` key only after AUTH-01, with caller JWT and RLS. Legacy anon JWT keys are rejected by the candidate runtime.

For current fallback-safe runtime inspection, use `npm run supabase:runtime-readiness` and `npm run supabase:activation-status`; both probe only `api.healthcheck()` and keep base-table/PostGIS truth dependent on operator evidence. Historical Supabase runtime documents are superseded by the [current containment runbook](docs/SUPABASE_DATA_API_CONTAINMENT_RUNBOOK_2026_07_16.md).

Never expose OpenAI, operator-source, service-role or database credentials as `NEXT_PUBLIC_*`. Browser-publishable variables are limited to the Mapbox token and, only after AUTH-01, the Supabase URL plus an `sb_publishable_` key.

Do not commit real tokens. `.env`, `.env.local`, `.env.*` and `.env.operator` payloads are ignored; only blank `.env.example` and `.env.operator.example` contracts are tracked.

## Repository Modes

GeoAI uses canonical repository modes for API responses and UI labels:

- `supabase` -> Supabase/PostGIS
- `local_fallback` -> Local/API fallback
- `browser_local` -> Browser-local demo
- `demo_seed` -> Demo seed
- `disabled` -> Not configured

Local/API fallback is not durable production storage. Browser-local storage is for demo continuity only. Demo seed records are sample context and require validation.

See [Repository Mode & Fallback Consistency v2.0.2](docs/REPOSITORY_MODE_FALLBACK_CONSISTENCY_V202.md).

## Governance / Current Status

- [Confluence Project Hub](https://geoaimvp.atlassian.net/wiki/spaces/PH/overview)
- [Current Release State](docs/CURRENT_RELEASE_STATE.md)
- [Documentation Index](docs/DOCUMENTATION_INDEX.md)
- [Full System Audit — 2026-07-16](docs/FULL_SYSTEM_AUDIT_2026_07_16.md)
- [Supabase Data API Containment Runbook — rehearsal executed; development draft](docs/SUPABASE_DATA_API_CONTAINMENT_RUNBOOK_2026_07_16.md)
- Current `main`: PR #87 merge `2999e7e857989baf53ce58ecfed63550b5896be0`.
- Current Production: `dpl_EAXREH31JKznnGbQYEU8bNqTqagN`, READY on that exact SHA.
- Current functional/evidence head: `e999c5a07d3ced6c95f2eb44f6a5f03a9c17caea`, tree `73b7c198813d6aede795b8b186bd4d58e741b181`; Quality Gate run `29500488408`, app job `87627894974` and DB job `87627894968` succeeded; quality artifact `8376235675` and database artifact `8376300064` preserve the receipts.
- Last fully evidenced audit Preview: `dpl_CY7oNavQwu5ddkhRRLaR3FWTd3d9`, READY on exact evidence head `e999c5a07d3ced6c95f2eb44f6a5f03a9c17caea` at [geoai-oni3o8lwu-geoaidev.vercel.app](https://geoai-oni3o8lwu-geoaidev.vercel.app). The latest observed READY deployment is `dpl_3r3eFhCEnhg7QdURF79r4tnLsPfF` on remote PR head `cf0ee1903e8411eabf8e048c1d8e775a0454340c`, but no new route/browser matrix is claimed for it. Browser/mobile/keyboard/print evidence remains unclaimed; HTTP checks are not browser evidence.
- Production remains a synthetic/local-fallback public demo with soft access and no Production Supabase. The source pack is fail-closed (`503`, disabled, zero sources). Real geometry, real-source persistence, protected client data and B2B/B2C activation are blocked.

## Historical release/control archive

Versioned release notes and change requests are preserved as point-in-time evidence; they are not the latest runtime authority. Start with the [Documentation Index](docs/DOCUMENTATION_INDEX.md) and use the [Changelog](CHANGELOG.md) for chronology. The index links the current source control and explains lifecycle precedence.

## Useful Commands

```bash
npm run dev
npm run dev:turbo
npm run build
npm run supabase:activation-status
npm run supabase:runtime-readiness
npm run supabase:migrate:check
npm run supabase:seed:pilot-foundation
npm run supabase:verify:persistence
npm run supabase:verify:memberships
npm run storage:check
npm run storage:verify:signed-url
npm run audit:verify
npm run test:access-decision
npm run test:api-contract
npm run test:api-access-guards
npm run test:server-credential-boundary
npm run test:secret-hygiene
npm run test:canonical-migration-chain
npm run test:identity-authorization-migration
npm run test:source-custody-migration
npm run test:auth-ssr-transport
npm run test:request-scoped-project-read
npm run test:source-connector-foundation
npm run test:aoi-integrity
npm run test:supabase-local-contract
npm run test:readiness-evidence
npm run test:migration-security-surface
npm run test:rls-plan
npm run test:security-headers
npm run test:private-cache-boundary
npm run test:workspace-panel
npm run test:spatial-b1
npm run test:spatial-b2a
npm run test:data-honesty
npm run test:documentation-current-truth
npm run test:runtime-status-contract
npm run test:runtime-source-pack
npm run test:document-lifecycle
npm run test:project-isolation
npm run test:report-package-public-contract
npm run test:vercel-output-tracing
npm run ingest:dld:snapshot
npm run ingest:osm:snapshot
npm run data:status
npm run validate:external-data
npm run start
```

The default `npm run dev` command uses stable Webpack mode with polling enabled for local reliability. Migration/seed commands are inspection scaffolding, not authorization to write: development/Production remain blocked by DB-01 and their unexecuted target-specific containment plan; rehearsal execution is separately receipted.

## API Routes

- `GET /api/health` returns app status.
- `GET /api/db/health` returns a static `diagnostics_withheld` public DTO; it does not probe or enumerate database configuration, schema, tables, credentials or project refs.
- `GET /api/platform/activation-status` returns the static public-demo activation boundary and blockers; infrastructure evidence belongs to an operator-authenticated control plane.
- `GET /api/pilot-backend/status` returns a minimal public status DTO with explicit product/environment/access/auth/repository/source dimensions, demo/confidential readiness and sanitized blockers. Infrastructure diagnostics are not exposed by this public route.
- `GET /api/storage/health` returns static public limits and `diagnostics_withheld`; bucket/configuration/signed-URL inventories are not public.
- `GET /api/security/rls-readiness` returns a static non-attestation without table or policy inventory.
- `GET /api/known-limitations` returns the reviewed `static_candidate_truth` catalog; it performs no live readiness probes.
- `GET /api/external-data/manifest`, `/sources` and `/status` serve only reviewed bundled `compact_public_v1` (`contractVersion: 1.3`, manifest `1.6`, `liveRegistryIncluded: false`), expose no live registry probes/counts and use bounded public caching. Exact docs-head Preview UTF-8 sizes are manifest 18,284 B, sources 5,164 B and status 8,221 B; data-sources/readiness/source-lineage are 5,164/4,411/4,292 B. The source pack remains 503 with `activationAllowed:false` and `sources: []`.
- `GET /api/demo-objects` returns mock spatial objects for demo use.
- Public Workspace analysis and decision scoring are browser-local. `POST /api/analyze` and `POST /api/ai/decision-score` return 403 before body parsing until AUTH-01; `GET /api/ai/decision-score` exposes only the sanitized mode/caveat status.
- `GET /api/analysis-runs` exposes only immutable/demo-safe reads in public mode; user-created public-demo history remains browser-local.
- `POST /api/analysis-runs` is blocked for public-demo server persistence; durable writes require verified Auth/membership/RLS.
- `POST /api/context/market` returns seed-only Dubai market context for built-in/demo targets. User-uploaded and user-drawn targets skip market/climate network calls, so raw content, AOI geometry and derived coordinates stay in the browser.
- `GET /api/open-geodata` returns local open-geodata baseline availability and counts.
- Public-demo AOIs are browser-local and are not mirrored through `/api/aois`; AOI server mutations return 403 until verified Auth/membership/RLS exists.
- `GET /api/uploaded-datasets` returns an empty `browser_local` projection; POST/DELETE are disabled so uploaded CSV/GeoJSON never leaves the browser in public demo.
- `GET /api/data-room?projectKey=...` returns the project-scoped Client Data Room summary.
- `GET /api/report-packages?projectKey=...` returns only bounded dashboard summaries for immutable seed packages in public mode; it excludes full package bodies and all dynamic/browser state.
- `POST /api/report-packages` requires verified project access; public-demo package mutation is blocked.
- `GET /api/report-packages/[id]/json` exports safe report package metadata and section summaries.
- `GET /api/report-packages/[id]/export` returns package export manifest metadata.
- Report/package routes accept canonical already-decoded raw IDs only; malformed or unknown IDs return controlled 400/404 and never fall back to another project. `/report-packages/[id]/print` renders a print-friendly seed package; browser print/save as PDF remains the current PDF workflow.
- Data Room/checklist/evidence/pilot-workflow mutations require verified project access; public-demo write/upload/review/validate/manage actions return 403.

## GeoAI Explore v1.1

GeoAI Explore is now embedded in the workspace command panel. `/workspace` keeps the standard map-first flow, while `/explore` opens the same workspace layout with Explore setup expanded by default. The panel supports B2C and B2B audience selection, role-based personalization state for future onboarding, 10 data-driven scenarios, deterministic Dubai sample candidates, candidate map overlays and direct candidate selection as the current analysis target.

Explore v1.1 remains an MVP screening layer. Candidate data is sample/demo/open-context only and does not connect live official Dubai sources. All outputs are screening hypotheses and require official/client validation before legal, cadastral, zoning, planning, ownership, valuation, title, entitlement, lending, purchase, rental or development decisions.

## GeoAI Pilot UX v3.1

GeoAI Pilot UX v3.1 upgrades the pilot surface for faster decision review. The right-side command panel is more compact, criteria-first searches can open a ranked candidate comparison before a specific target is selected, and each candidate can be opened as an individual BI-style dashboard with a path back to the shortlist. The dashboard now emphasizes gauges, score bars, matrices, scenario sections, validation gaps and next actions.

The landing page remains lightweight and workspace-oriented, but now explains the product narrative, screening layers and outputs more clearly. `/explore` renders the workspace-style alias with Explore/scenario defaults.

## GeoAI Pilot UX v3.2

GeoAI Pilot UX v3.2 makes Criteria-first an explicit search flow. Candidate cards and map overlays appear only after the user runs the search. Changing role, scenario, filters, mode or custom query invalidates the searched set and prompts an updated search before comparison or analysis.

The Express Analysis dashboard now uses a dashboard model that curates short KPIs, top drivers, top risks, validation gaps, next actions and scenario-specific drill-down modules. Evidence/source details are collapsed last. `/explore` continues to render the workspace-style alias with Explore/scenario defaults.

## Market Context Adapter

GeoAI includes Dubai Market Context Adapter v0.1. It matches selected coordinates or demo objects to a nearest seed Dubai market area, then enriches the dashboard, AI prompt context, evidence, and report preview with qualitative area-level context.

Current market context is seed/demo-normalized only. It uses qualitative levels, 0-100 indices, trends, confidence labels, and limitations. It does not claim official transaction values, rents, ownership, zoning, density, or approvals.

Future production adapters are intended to connect official or licensed sources such as Dubai Land Department, Dubai Pulse / Data.Dubai, Dubai Municipality / GeoDubai planning layers, Dubai 2040 Urban Master Plan context, OpenStreetMap infrastructure extracts, and customer-provided documents. No external API keys are required for v0.1.

## Data Ingestion v0.1

GeoAI includes a local market data ingestion layer for the Market Context Adapter. The current ingestion modes combine bundled `seed_static` context with imported DLD / Dubai Pulse-style sample CSV fixtures. The ingestion script validates fields, normalizes area names, aggregates records by Dubai market area, writes normalized JSON outputs, and returns data quality notes.

The current seed metrics are qualitative/index-style only:

- Market activity index
- Rental demand index
- Liquidity index
- Development pipeline index
- Risk index
- Trend and confidence

No external API keys are required for Data Ingestion v0.1. Tiny samples are scored conservatively: low transaction counts reduce confidence and cap liquidity/rental-demand proxy influence. Future modes are prepared for `csv_ready`, `api_ready`, and `manual_upload_planned` workflows so DLD, Dubai Pulse, Dubai Municipality, licensed datasets, or customer uploads can be added later without changing the workspace UX.

## Open Geospatial Baseline v0.1

GeoAI includes an offline open-geodata baseline prototype for OSM-style roads, POI anchors, landuse context and accessibility metrics. The released source pack also contains a bounded OSM Overpass count-only Preview path without features, coordinates or geometry; it is disabled in Production. No real geometry is activated.

Run:

```bash
npm run ingest:open-geodata
```

Normalized outputs are written under `data/normalized/open_geodata_*`. The workspace and report maps use this baseline as subtle open-data context alongside Mapbox basemap labels and GeoAI demo analytical overlays. Evidence cards label this source as sample/open-geospatial context, not official GIS, planning, zoning or parcel data.

## Spatial Data Adapter v0.1

GeoAI includes a spatial data adapter for demo geospatial layers. The current ingestion mode is `seed_geojson`, which loads lightweight synthetic Dubai geometries for development zones, premium real estate clusters, infrastructure nodes, construction monitoring sites, coastal/flood exposure zones, heat exposure zones, transport corridors, and parcel-like demo assets.

The adapter validates geometry type, coordinate ranges, required properties, centroids, and simple polygon area estimates. Selected map features now carry structured spatial metadata into the command panel, Express Analysis, Evidence / Data Used, and report preview.

Current geometries are synthetic/demo only. They are not official parcel, planning, cadastral, utility, infrastructure, or risk-zone boundaries. Future ingestion modes are prepared for `uploaded_geojson_planned`, `api_ready`, and `database_ready` workflows for official GIS, customer uploads, or database-backed spatial layers.

## Polygon AOI Drawing v1.7

GeoAI supports an explicit polygon AOI drawing workflow in the workspace. Users can choose `Add polygon`, click vertices on the Mapbox canvas, preview the next edge while moving the cursor, close the polygon by clicking near the first vertex, then run Express Analysis or add the AOI to comparison.

Drawn AOIs include approximate area, perimeter, centroid, bounding box and vertex count. The shared validator rejects too few/too many vertices, non-finite or out-of-WGS84 coordinates, tuples other than exact longitude/latitude pairs, consecutive duplicates, self-intersections, antimeridian crossings unsupported by the planar model, and polygons outside the configured area bounds. The 11-persona adversarial contract includes one representative Dubai polygon and ten negative geometry cases; it does not replace server-route and durable-persistence evidence after Auth.

User-drawn AOIs are treated as user-provided screening context only. They are not official parcel, zoning, cadastral, planning, ownership or entitlement boundaries. See [Polygon AOI Drawing v1.7](docs/POLYGON_AOI_DRAWING_V17.md) and [GeoAI AOI-Ready Demo v1.7 Release Note](docs/RELEASE_GEOAI_AOI_READY_DEMO_V17.md).

## AOI Library + GeoJSON Import/Export v1.8

GeoAI now lets users save drawn AOIs into the active project AOI Library, reopen saved AOIs, rename/delete them, import a GeoJSON Polygon, export the current or saved AOI as GeoJSON, and run Express Analysis on saved or imported AOIs.

Supported import formats are GeoJSON `Feature` with `Polygon` geometry and `FeatureCollection` with one Polygon. FeatureCollections with multiple Polygon features import the first Polygon with a warning. Points, LineStrings, MultiPolygons, Polygon holes, CRS transformations and shapefiles are not supported in v1.8.

AOIs remain user-provided or uploaded screening geometry. They are not official parcel, zoning, cadastral, ownership, planning or valuation evidence. See [AOI Library + GeoJSON Import/Export v1.8](docs/AOI_LIBRARY_GEOJSON_IMPORT_EXPORT_V18.md).

## Client Data Room Foundation v1.9

GeoAI includes a lightweight project-level Client Data Room foundation that links AOIs, uploaded client metadata, analyses, reports, comparisons, source readiness, validation checklist items and expected pilot deliverables.

In the audit candidate, public-demo user state is browser-local and this section is a read-only/seed UI foundation. Data Room/checklist/file server mutations return 403 until request-scoped Auth, membership, RLS and protected Storage exist. Local JSON repositories are development-only and Vercel `/tmp` persistence is disabled. This is not durable production storage, secure enterprise storage, official validation, legal/cadastral/zoning/planning evidence or a valuation conclusion.

See [Client Data Room Foundation v1.9](docs/CLIENT_DATA_ROOM_FOUNDATION_V19.md) and the [GeoAI Client Data Room Foundation v1.9 Release Note](docs/RELEASE_GEOAI_CLIENT_DATA_ROOM_FOUNDATION_V19.md).

## Validation Governance & Official Connector Readiness v2.5

GeoAI now includes a validation governance foundation for project-scoped evidence metadata, official connector readiness, conservative claim levels, report validation appendices and AI decision-scoring guardrails.

This is not a live official DLD, Dubai Pulse, GeoDubai or Dubai Municipality integration. It does not certify ownership, zoning, cadastral status, planning approval, suitability or valuation. Outputs remain a screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.

See [Validation Governance & Official Connector Readiness v2.5](docs/VALIDATION_GOVERNANCE_OFFICIAL_CONNECTOR_READINESS_V25.md) and the [v2.5 release note](docs/RELEASE_GEOAI_VALIDATION_GOVERNANCE_V25.md).

## Secure File Storage & Evidence Uploads v2.6

GeoAI contains a dormant storage/evidence workflow foundation for future validation evidence and the Client Data Room. In the current audit candidate, public uploads are rejected before multipart parsing and no metadata-only server record is created. Activation requires request-scoped Auth/membership/RLS plus the protected upload controls in STORAGE-01.

This is not secure enterprise storage until buckets, policies, signed URL flows and access enforcement are configured and verified. Uploaded evidence requires review; it is not a legal, cadastral, zoning, planning, ownership or valuation conclusion.

The earlier [Secure File Storage & Evidence Uploads v2.6](docs/SECURE_FILE_STORAGE_EVIDENCE_UPLOADS_V26.md) is historical foundation context, not current operational guidance. Current acceptance is [STORAGE-01](docs/CODEX_BACKLOG_2026_07_16.md#storage-01--protected-evidence-pipeline).

## Evidence Review Workflow & Signed URL Verification v2.7

GeoAI defines evidence review states separately from file upload. The domain model supports `uploaded_unreviewed`, in-review, client-validated, official-validated, rejected, expired and superseded states, while AI/report guardrails remain conservative. Screening review, client attestation and official attestation use separate capabilities; analyst review cannot establish either attestation. Public mutations and both attestation authorities remain blocked until AUTH-01 supplies verified identity/membership, designated authority and RLS-backed immutable provenance.

Signed download verification remains a server-side foundation. Without verified private buckets, policies and caller identity, no public upload/metadata fallback is created; binary access remains unavailable. See [Evidence Review Workflow & Signed URL Verification v2.7](docs/EVIDENCE_REVIEW_SIGNED_URL_VERIFICATION_V27.md) and the [v2.7 release note](docs/RELEASE_GEOAI_EVIDENCE_REVIEW_SIGNED_URL_V27.md) as historical foundation records.

## Data Credibility Sprint v0.5

GeoAI now supports local-first CSV and GeoJSON uploads from the Workspace command panel. Uploaded CSV files can provide user-supplied site/area metrics, while uploaded GeoJSON files render as toggleable local map layers under Spatial Layers / Uploaded datasets.

Uploads are stored unencrypted only in this origin's versioned `geoai-public-demo-v2` browser namespace; non-demo modes do not read or write it, and Auth startup/sign-out purges that namespace plus exact legacy keys. The UI explicitly warns not to upload confidential, personal or regulated data. Candidate limits are 5 MB/file, 24 retained uploads per project, 10,000 CSV data rows, 128 unique non-empty headers and 16,384 characters/cell. CSV requires a data record, balanced quoted fields and paired finite WGS84 latitude/longitude columns when either coordinate column is present. GeoJSON is capped at 2,500 features and 100,000 coordinate pairs with bounded properties plus geometry-specific tuple/cardinality/closed-ring/WGS84 validation. AOI import is capped at 5 MB, 1,000 vertices and 40 records per project before self-intersection work. Browser records are revalidated on read and mutations use compound project+ID identity. They are never official evidence by default. Expiry/TTL, verified subject/organization scoping, stricter CSP and worker/off-main-thread parsing remain open. Sample files are available under `data/upload-samples/`:

- `dubai_site_metrics_sample.csv`
- `dubai_pipeline_sites_sample.geojson`

See [Data Credibility v0.5](docs/DATA_CREDIBILITY_V05.md) for the upload schema, parsing rules, source-lineage behavior and QA checklist.

## Real Data Backbone v0.7

This section is a historical capability description. Current authority is stricter: DLD/Dubai Pulse and Open-Meteo live use are blocked pending approved access/rights; permission-gated climate context is excluded from evidence and AI payloads. The released Preview pack is limited to fixed NASA POWER historical point context, Copernicus catalogue metadata without geometry/assets and OSM counts without geometry. Production is disabled.

## Real External Data Integration v1.4

GeoAI includes snapshot connector commands and a Source Registry foundation. These are readiness/manual-import tools, not current live-provider authorization. Open-Meteo remains `permission_required`; DLD/Dubai Pulse requires an approved stable snapshot/access path and reusable rights.

This is not a live official integration. Snapshot outputs remain screening context only: official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.

See [Real External Data Integration v1.4](docs/REAL_EXTERNAL_DATA_INTEGRATION_V14.md).

Run:

```bash
npm run ingest:dld:real
npm run ingest:osm:real
```

If raw external files are missing, the scripts exit gracefully and keep existing sample/demo fallback data available. This does not connect live official DLD, Dubai Pulse, GeoDubai, parcel, zoning, cadastral or ownership systems. See [Real Data Backbone v0.7](docs/REAL_DATA_BACKBONE_V07.md).

## Public Data Connectors v1.6

GeoAI includes connector contracts/readiness metadata for these source groups. Current positive runtime authority is narrower than the historical v1.6 catalog: only fixed, low-volume Preview context for NASA POWER, Copernicus catalogue metadata and OSM counts is released; Production is fail-closed. Other providers remain sample/manual/permission-required or deferred.

Run:

```bash
npm run ingest:dld:public
npm run ingest:osm:public
npm run ingest:overture:public
npm run ingest:worldpop:public
npm run ingest:admin-boundaries:public
npm run ingest:public-data:all
npm run data:status
npm run validate:external-data
```

This is not a live official integration layer. Outputs remain a screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.

See [GeoAI Public Data Ready Demo v1.6 Release Note](docs/RELEASE_GEOAI_PUBLIC_DATA_READY_DEMO_V16.md), [Public Data Connectors v1.6](docs/PUBLIC_DATA_CONNECTORS_V16.md), [Public Data Source Register v1.6](docs/PUBLIC_DATA_SOURCE_REGISTER_V16.md), and [Data License and Caveats v1.6](docs/DATA_LICENSE_AND_CAVEATS_V16.md).

## Investor Demo Narrative & Client Pilot Package v1.5

The three historical narrative definitions remain available as prepared workspace/project context. The current `/demo` route is not a card launcher: it redirects with HTTP 307 to `/workspace`. Narrative-specific journeys use explicit prepared Workspace/Project links and query parameters.

This is a demo and pilot-framing layer, not a production or official-data claim. Outputs remain a screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.

See [Investor Demo Narrative v1.5](docs/INVESTOR_DEMO_NARRATIVE_V15.md) and [Client Pilot Package v1.5](docs/CLIENT_PILOT_PACKAGE_V15.md).

## Persistence & Project Workspace v0.8

GeoAI has repository and schema foundations for future persistence. In the audit candidate, user-created public-demo AOIs, uploads, reports, analysis history and comparisons remain browser-local; server write/manage/upload/review/validate routes return 403 until request-scoped identity and RLS exist. Local JSON repositories are development-only, and all Vercel `/tmp` fallback is disabled. Supabase/PostGIS adapters are not active Product persistence.

This is not production-ready persistence. There is no activated application Auth, production-certified tenant security, protected production file storage or validated official source governance yet. See [Persistence & Project Workspace v0.8](docs/PERSISTENCE_PROJECT_WORKSPACE_V08.md).

Project dashboard records are scoped by active project. See [Project-Scoped Persistence v13](docs/PROJECT_SCOPED_PERSISTENCE_V13.md).

## Pilot Readiness & Client Delivery Package v1.1

GeoAI now includes pilot package framing for developer, fund/family office, bank/lender and government/free zone demo workflows. The Project Dashboard shows a recommended pilot package, readiness status, required client data, validation sources, success criteria and pilot deliverables for the active project. The Workspace command panel includes a compact Pilot Setup Checklist below the main configuration flow.

This is a client-delivery framing layer, not a production readiness claim. Pilot outputs still depend on uploaded/customer-approved data, open or sample snapshots, and agreed official validation before decisions. See [Pilot Readiness & Client Delivery Package v1.1](docs/PILOT_READINESS_CLIENT_PACKAGE_V11.md).

## Report Export & Client Deliverables v0.9

GeoAI now includes a dedicated printable report route for saved analysis and comparison reports. The Project Dashboard can link to saved printable reports, and the report preview includes an "Open printable report" action.

Current export remains browser print/save as PDF. GeoAI does not generate server-side PDFs yet. Printable reports use a stable schematic map fallback and include source lineage, validation checklist, next actions and explicit data honesty notes. See [Report Export & Client Deliverables v0.9](docs/REPORT_EXPORT_DELIVERABLES_V09.md).

## Deploy To Vercel

1. Push the repository to GitHub.
2. Create a Vercel project from the repository.
3. Keep the default Next.js build settings.
4. Add `NEXT_PUBLIC_MAPBOX_TOKEN` in Vercel environment variables.
5. Keep OpenAI upstream disabled until request-scoped Auth/RBAC and quotas are implemented. A server-side key alone does not activate it.
6. Deploy.

## Current Limitations

- Uses synthetic/demo geospatial data only.
- Uses deterministic mock scoring only.
- OpenAI upstream is disabled by default and additionally requires the explicit hard/Auth gate; deterministic scoring is the supported baseline.
- Market context is seed/demo-normalized and not official market evidence.
- Data ingestion currently uses local seed/static context and imported sample CSV fixtures only.
- Spatial layers currently use local seed_geojson demo geometries only.
- Uploaded CSV / GeoJSON files are browser-local, user-provided, validation-required context.
- AOI Library v1.8 keeps user-created project AOIs in the browser; its server mutations are blocked until Auth/RLS.
- Client Data Room v1.9 is read-only/seed UI in public demo; evidence/checklist/file server mutations are blocked.
- AOI GeoJSON import supports Polygon only. MultiPolygon, holes, CRS transformations and shapefiles are deferred.
- Real Data Backbone v0.7 supports optional snapshots/API context, but live official validation sources are still not connected.
- Persistence v0.8 supplies dormant repository/schema foundations; current public-demo user state is browser-local and server mutations are blocked.
- Supabase/PostGIS durable persistence is not active; future activation requires schema readiness plus request-scoped Auth/membership/RLS evidence.
- RLS policies require configured Supabase Auth, project memberships and deployment governance.
- Supabase/PostGIS and persistence are optional prototype foundations, not production-grade user storage yet.
- Pilot readiness scoring is a delivery checklist, not an approval, compliance or production-readiness certification.
- Auth foundation exists in public-demo mode, but production route enforcement, RLS and durable user/organization access control are not complete.
- The AUTH permanent-user boundary, AUTH-01B read facade and SOURCE-02 `reserve_or_replay` claim are fail-closed foundations only: readiness flags are false, the connector registry is empty, the receipt claim grants no authorization and no protected read/provider/reservation/persistence path is active.
- No activated real parcel, zoning, transaction, imagery or regulatory evidence adapters; bounded Preview source context is non-decision-grade and disabled in Production.
- Report export is browser print/save as PDF, not a generated server-side PDF.
- Comparison sets remain browser-local in public demo; durable comparison/report libraries require normalized repository contracts, Auth, tenant security and validated persistence.
- Workspace result-only dashboards and report preview are now loaded on demand; the same local production-build comparison reduced First Load JS from 252 kB to 218 kB (34 kB, approximately 13.5% gzip). This is a narrow bundle result, not a Core Web Vitals or exact-Preview performance certification.

## Documentation

| Need | Current authority |
| --- | --- |
| Operational snapshot and navigation | [Confluence Project Hub](https://geoaimvp.atlassian.net/wiki/spaces/PH/overview) |
| Repository navigation and lifecycle precedence | [Documentation Index](docs/DOCUMENTATION_INDEX.md) |
| Released/live truth | [Current Release State](docs/CURRENT_RELEASE_STATE.md) |
| Findings and go/no-go boundaries | [Full System Audit](docs/FULL_SYSTEM_AUDIT_2026_07_16.md) |
| Implemented architecture and source rules | [Architecture](docs/architecture.md) · [Data Strategy](docs/data-strategy.md) |
| Verification and executable residuals | [QA Checklist](docs/qa-checklist.md) · [Codex Backlog](docs/CODEX_BACKLOG_2026_07_16.md) |
| Delivery order and history | [Roadmap](docs/roadmap.md) · [Changelog](CHANGELOG.md) |

All other versioned and dated documents are historical/control evidence unless the Documentation Index explicitly promotes them as current.

## Next Roadmap

Current P0 order is the development Data API/identity decision and canonical replay, with public Vercel credential evacuation/rotation (ENV-01) in parallel but completed before Auth integration closes; then request-scoped Auth/RBAC, protected Storage and explicit source custody/visibility. Product, performance, accessibility and documentation closure remain evidence-based P1/P2 work. See the current [Roadmap](docs/roadmap.md) and acceptance-level [Codex Backlog](docs/CODEX_BACKLOG_2026_07_16.md); historical version labels do not override them.
