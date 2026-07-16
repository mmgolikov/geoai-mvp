# Changelog

Status: Active chronological change authority
Last verified: 2026-07-16
Owner: GeoAI Release Engineering
Authority: Chronological released/unreleased change record; runtime truth remains `docs/CURRENT_RELEASE_STATE.md`
Successor: None; any replacement must update `docs/DOCUMENTATION_INDEX.md`
Navigation: [Documentation Index](docs/DOCUMENTATION_INDEX.md) · [Current Release State](docs/CURRENT_RELEASE_STATE.md) · [Full System Audit](docs/FULL_SYSTEM_AUDIT_2026_07_16.md) · [Codex Backlog](docs/CODEX_BACKLOG_2026_07_16.md)

## Unreleased — Full system audit and pre-Auth containment

### Security and reliability

- Classified all 83 API handlers in an explicit public-demo/project access manifest.
- Enforced access denial before mutation across the known bypassed routes, blocked every server mutation until request-scoped identity exists, rejected evidence multipart uploads before body parsing and added object-first scope checks for affected ID routes.
- Added strict profile/membership status checks, an explicit seven-key demo allowlist, fail-closed Supabase Auth misconfiguration and visible early denial in six identity-gated handlers; this remains containment, not working Auth/RBAC.
- Removed service-role selection from user-facing repository clients.
- Prevented boolean environment flags from promoting Auth/membership/RLS readiness.
- Replaced public DB, Storage, platform, pilot, RLS and limitations diagnostics with static/sanitized contracts; live infrastructure inventory belongs to an operator-authenticated plane.
- Fixed public pilot `sourceMode` to an operator-only disabled value so flag/token presence cannot be inferred anonymously.
- Added bounded AI request parsing, timeouts/token caps and an explicit hard/Auth upstream gate.
- Removed private filesystem/storage paths from public source-lineage projections.
- Moved public-demo AOI/upload/report-summary/analysis/comparison user state to project-scoped browser records, made explicit data lookups fail closed, made invalid Workspace URLs clear/reset visibly, disabled protected controls before fetch and disabled Vercel `/tmp` fallback.
- Kept public analysis/decision scoring in the browser, blocked both server generation POSTs before body parsing until AUTH-01, and stopped user-uploaded/user-drawn raw content, geometry and derived coordinates from entering market/climate calls.
- Added a no-confidential/personal/regulated-data warning; strict quoted CSV parsing with required data row/unique headers/paired WGS84 coordinates; GeoJSON geometry/property quotas; AOI 5 MB/1,000-vertex pre-topology bounds; project-scoped 24-upload/40-AOI retention; read-time revalidation; compound project+ID mutations; and visible localStorage failure handling. Browser persistence now uses `geoai-public-demo-v2`, fails closed outside public demo and is cleared with exact legacy keys on Auth startup/sign-out; TTL, verified subject/organization scoping, worker parsing and stricter CSP remain residual work.
- Made anonymous external-data routes use only a static reviewed manifest plus compact aggregate-quality metadata (`contractVersion 1.3`, manifest `1.6`, no live registry query/count or deep snapshot trace). Per-source DLD/OSM/Overture counts/status/use no longer inherit group totals.
- Fixed `/explore` to receive its runtime environment from the server, removed the client development default and required flag + server-only operator token + matching request authorization for local/Preview source execution. Upstream hosts are fixed HTTPS, redirects fail closed, non-success/oversized bodies are cancelled, and NASA/Copernicus/Overpass payload semantics are strictly validated.
- Restored live report-map attribution, corrected report key/UUID lookup, protected dynamic print routes and added map readiness-stall/keyboard fallback handling without global console patching.
- Added canonical already-decoded report/package ID validation, bounded direct seed lookup and a 16 KB summary-only public report-package collection that excludes full sections and dynamic/browser state.
- Made report-package evidence lineage explicit: only selected acquired sources and linked acquired Data Room assets are `used`; zero/manual/planned sources remain validation-required candidates. Explicit unknown report/analysis/comparison IDs no longer substitute another report.
- Added server evidence-receipt and evidence-attestation authority gates: caller report JSON cannot mint evidence use, analyst screening review cannot establish client/official validation, and report/attestation persistence remains disabled until server-verified authority exists.
- Added a manifest-driven shared protected-GET response boundary (`private, no-store, max-age=0`; `Vary: Authorization, Cookie`) while retaining explicit immutable public-seed cache allowlists.
- Replaced spread/delete public source shaping with an explicit field allowlist and corrected printable `market_context` evidence/candidate rendering.
- Removed full package construction from the anonymous report-package list: committed compact summaries now cover all five correctly mapped demo projects without source-manifest filesystem reads; the heavy repository is lazy and reserved for verified/dynamic or generation paths.
- Coalesced map hover work to one animation frame and one cached feature query, deduplicated hover-source writes and suspended the underlying map while the mobile picker owns the single active WebGL instance. `preserveDrawingBuffer` remains always-on in the current live-canvas capture path; making it on-demand remains PERF-01.
- Disabled public application Supabase repositories before AUTH-01 and removed all service-role/direct-DB credential references from runtime code; external Vercel credential evacuation/rotation remains owner task ENV-01.
- Added CSP, HSTS, frame, MIME, referrer and permissions headers.
- Prepared (not applied) full-chain pre-Auth RLS/Storage/function-ACL containment SQL, missing constrained `profiles.status`, partial unique Auth-user mapping, legacy AOI-policy removal, empty `SECURITY DEFINER` search paths and a regression check that fails on historical anonymous policy/grant reintroduction.
- Reconstructed and hash/byte-pinned the exact ten-entry live Supabase ledger, quarantined non-ledger SQL, added pre-ledger reconciliation plus three review-only containment/identity/source-custody migrations and expanded database personas to 57 pgTAP assertions.
- Added pending SOURCE-01 migration `20260716113000_geoai_source_custody_foundation_v1.sql`: five RLS-enabled/direct-grant-closed custody tables; immutable releases, artifacts, status events and ingestion receipts; composite tenant/release and actor organization/project-membership FKs; fail-closed `restricted`/`registered_unverified` legacy catalog backfill; and bounded `api.current_source_releases()` metadata for approved sources only, without object paths, source URIs, secrets or `client_viewer` access. The migration connects no provider and exposes no write API; provider writes remain blocked.
- Added the static source-custody migration checker to the permanent Quality Gate. Exact-SHA GitHub execution and database replay remain pending.
- Extended the guarded operator migration check to enumerate all three pending migrations and require the source-custody checker. Replaced direct protected-table joins in the review-only Storage policy with narrow `SECURITY DEFINER geoai_private.has_storage_project_role()`; object reads remain operation-aware/no-listing and exclude `client_viewer`. No Storage policy was applied.
- Added an `api`-only Postgres 17 `supabase/config.toml`, pinned Supabase CLI `2.109.1` and configured CI `database-replay` for clean start/reset plus pgTAP. This job has not run on the exact candidate SHA and local Docker is unavailable, so no replay pass is claimed.
- Updated patch dependencies and forced PostCSS 8.5.19; `npm audit` reports zero known vulnerabilities.
- Added the previously omitted runtime-status truth matrix to the permanent Quality Gate.
- Replaced the old 133–158 KB repeated source responses with `compact_public_v1`, including `/api/external-data/sources`, 48/64 KB response budgets and Vercel output-trace budgets that exclude deep snapshots. The final local build measured 5,063/4,467/19,448/5,063/8,158/4,352 B across data-sources/readiness/manifest/sources/status/lineage; only exact-head remote Preview measurement remains pending. The disabled legacy AnalysisPanel fanout/dead code, six-request Hub bootstrap and always-on current capture buffer remain residual performance work.

### Documentation and governance

- Reconciled active repository documentation to PR #87 / `2999e7e857989baf53ce58ecfed63550b5896be0` and Production `dpl_EAXREH31JKznnGbQYEU8bNqTqagN`.
- Replaced stale architecture, source strategy and roadmap baselines.
- Added canonical current-release, documentation-index, audit and Codex-backlog documents.
- Added the draft, unexecuted Supabase Data API containment runbook with the verified live development exposure, owner disable-vs-minimal-schema choice and caller-JWT/Storage-policy prerequisites.
- Reconciled `/demo` to its actual HTTP 307 redirect, source contract 1.3 vs manifest 1.6, and candidate-vs-live diagnostic boundaries.
- Recorded the complete Confluence traversal (253 descendants plus Hub, depth eight), numbering collisions/stubs/label mismatches and repository lifecycle baseline; no orphan claim is made without evidence.
- Generated and gated a complete lifecycle/successor manifest plus clickable archive sidecar: 130 in-scope repository Markdown documents, 12 active and 118 non-active/generated, with `docs/artifacts` included and zero unclassified.
- Added owner/authority/successor metadata to every active authority and a machine-readable 25-page Confluence synchronization map; downgraded historical UI/independent-review controls from current authority.
- Added explicit superseded/do-not-use banners and current-successor links to dangerous historical Supabase/Auth/Storage runbooks, recorded ledger corrections in the DB/Storage baselines and marked v0.9 architecture artifacts as non-authoritative target drafts with clickable registry navigation.
- Strengthened the current-truth gate against legacy anon-key and obsolete migration-path claims while allowing historical bodies to remain intact behind mandatory superseded banners.
- Recorded that independent reviewer approvals are not required in the current phase while objective technical/evidence gates remain.

### Scope boundary

- Every item above is an unreleased Draft PR #97 candidate until merge and deployment; Production remains on PR #87 and retains its documented public-state/source-UI warnings.
- No Production deployment or promotion.
- No Supabase migration/data write or Auth/hard-mode activation.
- No real provider, geometry, imagery, persistence or source-dependent scoring activation.

## Released — CR-DEV7-002 permanent Quality Gate

### Changed

- Run the permanent GeoAI Quality Gate on pull requests, manual dispatch and pushes to `main`.
- Preserve the exact tested commit, Node/npm versions, TypeScript output and build output in short-lived CI evidence.
- Add permanent Spatial B1 contract and Spatial B2A fail-closed regression checks to the Quality Gate.
- Extend built-application route smoke to current Product and readiness-control routes.
- Reconciled repository governance to the then-current PR #81 inactive release baseline. This is historical; current authority is PR #87.

### Scope boundary

- No Product UI/API, real geometry, Supabase, Auth/RLS, Storage, environment, secret, Figma or deployment change.
- Source-contract CI is not rendered-browser, physical-device, security, official-data, production-ready or pilot-ready certification.

## v0.1 — Public Demo Prototype

Initial public demo baseline for GeoAI MVP.

### Added

- Next.js App Router application structure.
- TypeScript and Tailwind CSS setup.
- Vercel-ready deployment configuration.
- Homepage and `/workspace` route.
- GeoAI top navigation and enterprise-style workspace layout.
- Mapbox GL JS workspace centered on Dubai.
- Safe browser-only Mapbox initialization.
- Point selection with marker and coordinate display.
- Synthetic demo geospatial layers:
  - Development Zones
  - Premium Real Estate Areas
  - Infrastructure Nodes
  - Construction Sites
  - Coastal / Flood Risk Zones
  - Heat Risk Zones
  - Transport Corridors
- Collapsed spatial layer controls with active layer count.
- Demo object selection and visual highlighting.
- Scenario-based Express Analysis using deterministic mock data.
- Scenario types for real estate, investment, construction monitoring, infrastructure planning, climate risk, and custom query.
- Full dashboard-style Express Analysis results.
- Comparison mode for 2-3 selected points or demo objects.
- Comparison dashboard with score table, score cards, winner recommendation, risks, and next actions.
- Print-friendly report preview for Express Analysis.
- Print-friendly report preview for Comparison.
- Static map-window cards in report previews.
- API routes for health and demo objects.
- Documentation baseline for architecture, data strategy, roadmap, and manual QA.

### Current Limitations

- Synthetic/demo data only.
- OpenAI analysis is optional and falls back to deterministic demo content.
- Supabase/PostGIS and persistence foundations are optional prototype paths, not production-grade storage yet.
- No authentication.
- No real GIS, planning, real estate, satellite, or market data adapters.
- Print-preview export only; no server-side PDF generation yet.
