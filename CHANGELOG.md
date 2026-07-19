# Changelog

Status: Active chronological change authority
Last verified: 2026-07-19
Owner: GeoAI Release Engineering
Authority: Chronological released/unreleased change record; runtime truth remains `docs/CURRENT_RELEASE_STATE.md`
Successor: None; any replacement must update `docs/DOCUMENTATION_INDEX.md`
Navigation: [Documentation Index](docs/DOCUMENTATION_INDEX.md) · [Current Release State](docs/CURRENT_RELEASE_STATE.md) · [Full System Audit](docs/FULL_SYSTEM_AUDIT_2026_07_16.md) · [Codex Backlog](docs/CODEX_BACKLOG_2026_07_16.md)

## Unreleased — Full system audit and pre-Auth containment

### Simplified Auth product decision

- Contained public Preview signup for issue #101: email-link and phone OTP now set `shouldCreateUser: false`, password sign-in remains existing-user-only, and the browser-local demo remains non-authoritative. Public copy no longer advertises automatic registration; future onboarding requires a separate approved invitation/server policy. The pending seventh migration now names and documents the exact permanent non-anonymous identity contract, while `require_aal2()` remains only a compatibility wrapper. No Supabase migration, user, provider, environment, secret or Production change was made.
- Added authenticated global product navigation for Workspace, Projects and Explore: a one-action mobile menu beside the profile control, direct tablet/desktop links, current-route semantics, outside-pointer/Escape dismissal and trigger-focus restoration. Exact head `80645d64662699bd646f96718d300df5d2b84f5f` passed Quality Gate `29611412924`: Chrome `12/12`, a new 430×932 visual baseline, 834×1112 route coverage, all nine Axe surfaces at zero serious/critical, mobile Projects Lighthouse performance `0.97` (LCP `2398 ms`, CLS `0`, TBT `83.5 ms`) and desktop Explore `1.00` (LCP `582 ms`, CLS `0.0109`, TBT `0`). READY Preview `dpl_94eRMRsM8NJR2hdmYE1zLLbiQE8b` returned 200 for the eight-route hosted matrix with empty exact-deployment build/runtime error evidence. Field Core Web Vitals, broader device/route coverage and real-user personas remain open.
- Added two 390×844 mobile product journeys, 40px primary-control measurements, horizontal-overflow guards, five exact Chrome/Linux visual-regression baselines and pinned Lighthouse `13.4.0` budgets. Exact head `32267fdea6a5f71d0bcc47e2f4821dd3da173352` passed Quality Gate `29596337090`: Chrome `10/10` in `1.1m`, five screenshots within `1%`, nine Axe surfaces at zero serious/critical, mobile landing Lighthouse performance `0.99` (LCP `2075 ms`, CLS `0`, TBT `59 ms`) and desktop login `1.00` (LCP `748 ms`, CLS `0`, TBT `0`). CI exposed and the implementation fixed mobile comparison container overflow and a non-wrapping winner label. READY Preview `dpl_77DXr2wR1qKdm8Mk4q7bUSDw4CEx` passed the eight-route HTTP/security matrix. Mobile global navigation, additional device/deep-route budgets and real-user personas remain open.
- Extended the exact-pinned Axe/Playwright suite to Projects, Explore, criteria-first comparison and printable comparison report. Exact head `0edf442f7aa59f0fe1f82f26ef6ad7ca9dde7868` passed Quality Gate `29590190286`: Chrome `8/8` in `1.4m`, with `0` serious/critical findings on all nine scanned surfaces. The Tab/Enter-only flows now create, persist, reload and open a browser-local project and compare/export/print an untouched criteria-first shortlist. Project Hub now restores the stored active local project after reload; project-create fields have programmatic names and audience toggles expose pressed state. READY Preview `dpl_9n6d8RoVN6yEoxRzEALyG3F3rSHP` passed the eight-route HTTP/security matrix. Visual regression, Lighthouse/Core Web Vitals, remaining responsive acceptance and real-user personas remain open.
- Added exact-pinned `@axe-core/playwright` CI evidence and a desktop Tab/Enter-only demo → Workspace Map-first-to-Criteria-first switch → candidate search/selection → analysis dashboard → export → printable report journey. Exact head `5d7af89ac2ead5b4df545e2f1810d5966c22cd0e` passed Quality Gate `29587485235`; Chrome `150.0.7871.114` completed `6/6` in `41.6 s`, and the landing Hub, unified login, Workspace setup, analysis dashboard and printable report each reported `0` serious/critical Axe findings. Print heading semantics, named map regions and accessible evidence text were corrected. READY Preview `dpl_HhpTExvknfLRhMNqxXunUvXZQorF` returned 200 for the critical HTTP matrix with security headers. Projects/Explore Axe, comparison/project keyboard paths, visual regression, Lighthouse/Core Web Vitals and real-user personas remain open.
- Extended the permanent Auth browser suite with desktop (1440×900), tablet (834×1112) and 390×844 mobile landing/login checks, horizontal-overflow assertions, a 40px minimum application baseline for primary mobile entry controls and a keyboard-only demo → Workspace → authenticated profile journey. Exact head `e203e895406817497f339fccf1d04da377a7bc65` passed Quality Gate `29584919107`; Chrome `150.0.7871.114` completed all five tests in `41.5 s`, both jobs succeeded, and the quality/database evidence artifacts are `8408623087` / `8408665081`. Functional Vercel `dpl_PLFxUhjLfy4nBSXU9g1jzT3A1sak` is rejected after runtime 500 middleware failures. Axe/Lighthouse, deep Workspace/report/project/print flows and real email/phone personas remain open.
- Added a focused Playwright Auth/session flow and a static CI wiring contract. The isolated CI server uses `supabase_auth`, the approved rehearsal origin and a runtime-constructed fake publishable-key-shaped value; the browser proves bounded anonymous continuation, demo credential fill/sign-in, authenticated profile highlighting, reload/direct-route restoration across Workspace/Projects/Explore/Profile, logout cleanup and renewed login gating. Exact head `4e5208a729f9dfb13068dc9521871da74a7de8db` passed Quality Gate `29582671453`; Chrome `150.0.7871.114` completed `1/1` test in `24.3 s`, and both jobs succeeded. It creates no hosted identity, uses no real credential and does not replace real email/phone/RLS/Admin personas. Functional Vercel `dpl_DzLXYYmip3N6CazkW3gXpUG34Sib` is rejected after runtime 500 `MIDDLEWARE_INVOCATION_FAILED`; subsequent evidence-control Preview `dpl_2YXvVKVHox3YTCwcm7oe3mhC4MNV` is healthy on exact head `0f22f4c194b422f12ab1e65b14d3577e4de11341`.
- Added a resolved-session client gate to `/workspace`, `/projects`, `/explore` and `/profile`. Supabase Auth Preview now waits for session restoration before rendering product UI, preserves the browser-only demo session, redirects resolved anonymous visitors through `/login` with a bounded `next`, leaves `demo_public` unchanged and fails closed when Auth is disabled. Exact functional head `77ac593b51d43a62ddc89656dbae735378cab69f` passed Quality Gate `29579739837`; Vercel Preview `dpl_6Er5tTEesM2V6RA7ZQD8eR5VYJpQ` is READY and all four product-route HTML responses contain only the restoration shell, not product content. This does not replace server authorization/RLS; rendered-browser redirects and real session personas remain pending.
- Added `/profile` with full name, region, contact phone, browser-local photo, registered-email change, password change and default B2B/B2C role selection. Workspace and Projects consume these defaults unless an explicit URL context is present; user-editable preference metadata never authorizes server access.
- Added optional real email/password sign-in so a password created from the profile is usable, while retaining email-link sign-in and the exact browser-only demo credentials. Public email/phone OTP registration is now disabled; direct sign-in-phone change remains disabled pending a safe provider/backend flow; avatar upload remains browser-local until STORAGE-01.
- Added `test:user-profile`; exact functional head `232fb532db1e5bc1dcf134ca1d616e4506f682f0` passed Quality Gate `29572587381`, and Vercel Preview `dpl_G5vcKVQCHypacP9foGpAJ4Egwu5k` is READY with hosted 200 responses for `/profile`, `/login`, `/workspace`, health and activation status. No live Supabase project, Storage policy, Production deployment or migration was changed.
- Restored `View demo` and `Leave a request` actions in the landing header and hero. Both enter the unified login/registration screen with a bounded `/workspace` return instead of bypassing Auth; once a browser session is saved, the login screen immediately continues to Workspace.
- Replaced the shared text account action with a circular profile icon. The icon is visibly highlighted for an authenticated session, opens `/profile` when signed in and opens `/login` otherwise. The oversized browser-only demo caveat was removed from the top of the personal account while the compact demo/storage limitations remain visible lower in the page.
- Exact functional head `bdb7f0629c39838e2e3451925825699df7f84fc0` passed Quality Gate `29576709336`; both application and isolated database-replay jobs succeeded. Vercel Preview `dpl_HNLx2RCVTYKjnHvxhi8mEoHpLgfa` is READY and returned 200 for the landing, both intent-specific login URLs, profile, Workspace, health and activation status. Hosted HTML contains both landing actions and their bounded Auth targets; no exact-deployment build or runtime error/fatal log was found. Rendered-browser interaction remains unclaimed.
- Replaced the separate registration, MFA and technical invitation flow with one `/login` experience for existing-user email, phone and demo access. Public email and phone OTP do not create users; phone OTP code paths still require an external SMS provider.
- Added the ready browser-only mock account `demo@geoai.space` / `111111`. The demo session enables only sample/browser-local behavior and is never accepted by protected server APIs, Admin, customer data or durable writes.
- Redirected `/register` and `/mfa` to `/login`, removed MFA callback/session/UI dependencies and changed the default verified callback destination to `/workspace`.
- Rebuilt onboarding around plain-language account/project states. Invitation tokens remain fragment-to-HttpOnly-cookie staged and SHA-256 hashed, but users no longer see or paste them.
- Added unapplied migration `20260716213214_simplify_auth_remove_mfa_requirement.sql`, replacing the legacy AAL2 check with a permanent non-anonymous identity guard while preserving role/RLS/last-owner/concurrency/audit controls. The helper does not assert verified email or phone ownership. No Supabase environment was modified.

### Security and reliability

- Created one authorized Free Supabase rehearsal (`geoai-auth-rehearsal`, ref `bkmfcjzalcvdsdvyxpgi`) without changing development or Production. Replayed the canonical ledger plus six candidates, including a newly rebuilt Auth/Admin/client/project activation migration, 39-index FK hardening and forward-only lifecycle remediation; the lost unpublished activation migration was not claimed as recovered.
- Passed `183/183` hosted pgTAP personas after the final schema head (`71 + 73 + 39`). Test Auth users roll back to zero; all 29 GeoAI domain tables have RLS and uncovered domain foreign keys are zero. Remediation closes invitation expiry rollback and lock-order defects, adds atomically audited bootstrap v2, keeps temporary bans dynamic and constrains the aggregate Admin snapshot to an initial 25-item page.
- Applied an owner-only PostgREST override exposing only the 14-RPC `api` schema. HTTP proves anonymous health 200, `public` denial with `PGRST106` and API base-table denial with `PGRST205`; managed PostGIS ACL/RLS remains untouched. Storage remains four buckets/zero object policies and real HTTP Auth/MFA/Admin/Storage E2E remains open.
- Exercised the canonical organization→project→invitation lock order through two independent backend sessions for invitation create→accept and create→revoke. Both rollback-only cases observed their mutation, left zero residual rows and produced no deadlock; authenticated RPC/HTTP concurrency remains open.
- Classified all 88 API handlers in an explicit public-demo/project/identity/admin access manifest.
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
- Disabled public application Supabase repositories before AUTH-01 and removed all service-role/direct-DB credential references from runtime code. The owner confirmed Vercel service-role/legacy-anon removal, Shared-scope review, development legacy-key disablement and Preview-only rehearsal configuration without recording values; ENV-01 now awaits fresh exact-head deployment and hosted negative/Auth evidence.
- Added CSP, HSTS, frame, MIME, referrer and permissions headers.
- Prepared (not applied) full-chain pre-Auth RLS/Storage/function-ACL containment SQL, missing constrained `profiles.status`, partial unique Auth-user mapping, legacy AOI-policy removal, empty `SECURITY DEFINER` search paths and a regression check that fails on historical anonymous policy/grant reintroduction.
- Reconstructed and hash/byte-pinned the exact ten-entry live Supabase ledger, quarantined non-ledger SQL, added pre-ledger reconciliation plus three review-only containment/identity/source-custody migrations and expanded database personas to 71 pgTAP assertions. The final 14 red-team additions cover exact source-release projection with ordered multi-event latest-status selection, explicit `revoked` and default-`sealed` projections, lower/upper pagination clamps, inactive organization/project denial, exact-project creator membership and update/delete immutability for artifacts, status events and ingestion receipts; the policy sweep also covers all source custody/audit tables for `public` or authenticated-applicable policies.
- Added pending SOURCE-01 migration `20260716113000_geoai_source_custody_foundation_v1.sql`: five RLS-enabled/direct-grant-closed custody tables; immutable releases, artifacts, status events and ingestion receipts; composite tenant/release and actor organization/project-membership FKs; fail-closed `restricted`/`registered_unverified` legacy catalog backfill; and bounded `api.current_source_releases()` metadata for approved sources only, without arbitrary quality/lineage summary JSON, object paths, source URIs, secrets or `client_viewer` access. The migration connects no provider and exposes no write API; provider writes remain blocked.
- Hardened the AUTH permanent-user boundary: UUID `claims.sub` must equal canonical `auth.getUser().id`, and both claims/user anonymous markers must be explicitly false before the profile RPC; mismatch maps to 401 and anonymous identity to 403. Added effective-mode-gated exact-target SSR/PKCE/session/logout, email magic-link login/registration, TOTP enrollment/challenge/removal with explicit AAL refresh, short-lived HttpOnly same-site invitation handoff, one-time hashed invitation onboarding and AAL2 Admin RPC routes. Auth-cookie mutations keep exact same-origin enforcement even when Auth mode is disabled; AUTH-01B Product repositories and all hosted persona-readiness flags remain disconnected/false.
- Kept the Supabase browser SDK out of the public-demo root bundle through mode-gated dynamic loading. Independent review caught a 285 kB `/workspace` First Load JS regression; the corrected local production build is 220 kB against the 218 kB pre-Auth candidate baseline.
- Added SOURCE-02 pure `reserve_or_replay` claim v1. Execution/idempotency hashes bind the exact environment, tenant, connector/provider/parser, rights, broker, endpoint/network/body/window contract while omitting actor only from the shared acquisition key. The unsigned claim is correlation-only with authorization `none`; external registry/plan/hash revalidation, trusted execution and transactional writing remain mandatory. The registry is empty, Production is denied and there is no fetch/env/secrets/persistence or atomic pre-fetch reservation writer.
- Hardened the AOI validator against non-finite/out-of-WGS84 coordinates, wrong tuple arity and unsupported antimeridian crossings and added an 11-persona adversarial contract covering the representative Dubai success case plus ten negative geometries.
- Added the static source-custody migration checker to the permanent Quality Gate. Functional/evidence head `e999c5a07d3ced6c95f2eb44f6a5f03a9c17caea` (tree `73b7c198813d6aede795b8b186bd4d58e741b181`) passed the complete application gate in run `29500488408`, job `87627894974`.
- Extended the guarded operator migration check to enumerate all three pending migrations and require the source-custody checker. Replaced direct protected-table joins in the review-only Storage policy with narrow `SECURITY DEFINER geoai_private.has_storage_project_role()`; object reads remain operation-aware/no-listing and exclude `client_viewer`. No Storage policy was applied.
- Added an `api`-only Postgres 17 `supabase/config.toml`, pinned Supabase CLI `2.109.1` and configured CI `database-replay` for clean start/reset plus pgTAP. Supabase job `87627894968` in successful run `29500488408` passed clean 71/71, a synthetic local exact-ten-ledger-prefix/pre-ledger-repair/three-pending-migration/security-surface rehearsal and a second 71/71 suite. This is not a current-development clone, live drift, live apply or DB-01 certification; those gates remain open.
- Updated patch dependencies and forced PostCSS 8.5.19; `npm audit` reports zero known vulnerabilities.
- Added the previously omitted runtime-status truth matrix to the permanent Quality Gate.
- Added a Production dependency audit and AOI adversarial contract to the permanent Quality Gate; the AUTH and SOURCE-02 pure-contract checks also passed exact-head run `29500488408`.
- Replaced the old 133–158 KB repeated source responses with `compact_public_v1`, including `/api/external-data/sources`, 48/64 KB response budgets and Vercel output-trace budgets that exclude deep snapshots. Preview `dpl_CY7oNavQwu5ddkhRRLaR3FWTd3d9` is READY on exact head `e999c5a07d3ced6c95f2eb44f6a5f03a9c17caea`; remote UTF-8 sizes are 5,164/4,411/18,284/5,164/8,221/4,292 B across data-sources/readiness/manifest/sources/status/lineage, with contract 1.3, manifest 1.6 and `liveRegistryIncluded:false`. The disabled legacy AnalysisPanel fanout/dead code, six-request Hub bootstrap and always-on current capture buffer remain residual performance work.
- Lazy-loaded Workspace comparison, express-result and report-preview surfaces behind a stable loading state. On the same local production-build basis, Workspace First Load JS decreased from 252 kB to 218 kB (34 kB, approximately 13.5% gzip). Exact Preview and local production-server HTTP evidence exists, but rendered browser flows and Core Web Vitals remain unclaimed.
- Preserved quality artifact `8376235675` (`geoai-quality-evidence-29500488408`, digest `sha256:dcabdae37373a7c7ca7676cd0761c5c56e7b2ffb8c35104ec1ed0330dfb39de2`) and database artifact `8376300064` (`geoai-database-evidence-29500488408`, digest `sha256:c9297dbde840bef1c289fb1aac55a2c3ee743a1be7411c49a59e10df6ed552f1`). No Production, live Supabase, Auth, Storage or provider write was performed.

### Documentation and governance

- Synchronized Confluence CHG-19 across all 28 mapped operational pages with per-page read-before-write, immediate read-back and an independent full-set read-back. Recorded current versions and SHA-256 hashes, added direct Hub links to Production/Vercel and the repository release/backlog/containment authorities, and explicitly rebased the legitimate design-page v49 update without changing its post-control design/navigation content.
- Published exact Auth-rehearsal head `8e0039260f4cf201b230288b6b02c48d2955600e`: Quality Gate run `29534323096` and both application/database jobs passed; evidence artifacts `8389906783`/`8389970353` were retained; fresh Vercel Preview `dpl_66rk4tVny9TmPjo7BKona5Xo1p1b` is READY in hard `supabase_auth` mode with public demo denied, no anonymous synthetic identity and no legacy anon/service-role runtime names. ENV-01 is closed for non-Production Preview integration; real email/MFA/Admin/browser personas remain open.
- Added the machine-readable Free rehearsal receipt and a self-contained new-chat continuation prompt; synchronized active authorities to distinguish hosted SQL/API evidence from still-open real Auth/MFA/browser/Storage/development/Production gates.
- Synchronized Confluence CHG-18 across all 28 mapped operational pages after detecting a post-CHG-17 Hub regression. Rebuilt Hub as the current operational entry point and preserved direct read-back versions plus SHA-256 hashes for every page with `183/183` rehearsal evidence.
- Reconciled active repository documentation to PR #87 / `2999e7e857989baf53ce58ecfed63550b5896be0` and Production `dpl_EAXREH31JKznnGbQYEU8bNqTqagN`.
- Replaced stale architecture, source strategy and roadmap baselines.
- Added canonical current-release, documentation-index, audit and Codex-backlog documents.
- Added the Supabase Data API containment runbook with the verified live development exposure, owner disable-vs-minimal-schema choice and caller-JWT/Storage-policy prerequisites; its owner path is now executed on rehearsal only and remains a development draft.
- Reconciled `/demo` to its actual HTTP 307 redirect, source contract 1.3 vs manifest 1.6, and candidate-vs-live diagnostic boundaries.
- Recorded the complete Confluence traversal (253 descendants plus Hub, depth eight), numbering collisions/stubs/label mismatches and repository lifecycle baseline; no orphan claim is made without evidence.
- Generated and gated a complete lifecycle/successor manifest plus clickable archive sidecar: 131 in-scope repository Markdown documents, 12 active and 119 non-active/generated, with `docs/artifacts` included and zero unclassified.
- Added owner/authority/successor metadata to every active authority and a machine-readable 28-page Confluence synchronization map; downgraded historical UI/independent-review controls from current authority.
- Added explicit superseded/do-not-use banners and current-successor links to dangerous historical Supabase/Auth/Storage runbooks, recorded ledger corrections in the DB/Storage baselines and marked v0.9 architecture artifacts as non-authoritative target drafts with clickable registry navigation.
- Strengthened the current-truth gate against legacy anon-key and obsolete migration-path claims while allowing historical bodies to remain intact behind mandatory superseded banners.
- Recorded that independent reviewer approvals are not required in the current phase while objective technical/evidence gates remain.

### Scope boundary

- Every item above is an unreleased Draft PR #97 candidate until merge and deployment; Production remains on PR #87 and retains its documented public-state/source-UI warnings.
- No Production deployment or promotion.
- No development/Production Supabase migration or Auth/hard-mode activation; all database writes in this change were confined to the authorized Free rehearsal.
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
