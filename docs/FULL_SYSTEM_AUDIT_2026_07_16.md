# GeoAI Full System Audit — 2026-07-16

Status: Active audit record; PR #97 remediation is released
Last verified: 2026-07-21
Owner: GeoAI Engineering / Governance
Authority: Current full-system findings, remediation and residual risk
Successor: None; any replacement must update `DOCUMENTATION_INDEX.md`
Audit mode: critical, multi-agent, evidence-led; no independent-reviewer approval claim
Current operational release: merged PR #106 / `cc8f9ebcf3989fab4a3c4eac9be9dfb8da786a7b` / `dpl_6RC2ohEdLBjiV82k758tFMkaDB9X` / https://geoai-mvp.vercel.app / `public_demo_prototype`
Historical audit release: merged PR #97 / `b915a831d5e5b28eab5fd26ac86059820e7e4a32` / rollback deployment `dpl_ERVqZPD5GAGDLjAVhMcPF2HT5Br7`
Machine authority: [CURRENT_RELEASE_RECEIPT.json](CURRENT_RELEASE_RECEIPT.json)
Navigation: [Confluence Hub](https://geoaimvp.atlassian.net/wiki/spaces/PH/overview) · [Documentation Index](DOCUMENTATION_INDEX.md) · [Current Release State](CURRENT_RELEASE_STATE.md) · [Codex Backlog](CODEX_BACKLOG_2026_07_16.md) · [Supabase containment runbook](SUPABASE_DATA_API_CONTAINMENT_RUNBOOK_2026_07_16.md)
Confluence authority: [09.13 Full System Audit — 2026-07-16](https://geoaimvp.atlassian.net/wiki/spaces/PH/pages/12320972) · GitHub execution: [#96](https://github.com/mmgolikov/geoai-mvp/issues/96)

## Executive verdict

The prototype is a credible public-demo foundation, but it is not ready for protected client data, real Auth/RBAC/Admin activation, durable user writes or Production real-source activation. The architecture direction is recoverable without a rewrite. The correct next move is canonical database replay followed by request-scoped identity integration before expanding protected capability; both may be developed against an ephemeral environment in parallel.

The audit removed the organisational dependency on unavailable independent reviewer approvals. It did **not** remove objective technical gates. Six boundaries remain release-blocking for any confidential or real-data mode: development Data API/identity-model containment, clean database replay with RLS persona evidence, public-runtime credential evacuation, request-scoped identity/membership, protected file handling and explicit source visibility/custody.

Post-audit implementation has now closed two isolated rehearsal increments. Free project `bkmfcjzalcvdsdvyxpgi` passes `183/183` hosted SQL personas, including forward lifecycle remediation, exposes only the 14-RPC `api` schema through PostgREST, denies `public` over HTTP and has zero uncovered domain foreign keys. Two independent backend sessions also passed rollback-only table-level invitation create→accept and create→revoke lock-order checks without residual rows or deadlocks. This is strong SQL/API-boundary and table-level concurrency evidence, but not authenticated RPC/HTTP email/phone/Admin, Storage, development or Production certification. [Machine receipt](SUPABASE_AUTH_REHEARSAL_RECEIPT_2026_07_16.json).

Current Auth product decision: one simple existing-user-only email-or-phone sign-in screen, no MFA, no user-entered invitation token, and a browser-only mock demo using `demo@geoai.space` / `111111`. Both OTP paths set `shouldCreateUser: false`; phone also requires an owner-configured SMS provider. Future registration requires a separate approved invitation/server policy. A seventh migration replaces Admin AAL2 with a permanent non-anonymous identity contract that does not assert verified email/phone ownership, but it is prepared only and has not been applied to rehearsal, development or Production.

## Evidence scope

The audit covered:

- every repository API handler, data repository boundary, readiness signal and current migration;
- GitHub release/CI state, open delivery controls and dependency advisories;
- Vercel Production SHA, mode, routes and logs, plus the exact audit Preview HTTP matrix and a local production-server HTTP smoke matrix for the Auth/Admin/Onboarding candidate; rendered browser/mobile/keyboard/print evidence remains explicitly unclaimed because HTTP is not browser evidence;
- development Supabase schema, migrations, table/RLS surface, policies, function grants and advisors;
- Product architecture, UI structure, accessibility, bundle/runtime performance and error history;
- repository documentation and the Confluence information architecture, operational Hub, release facts, decisions, risks and stale review controls.

No Production deployment, development/Production Supabase migration/apply, secret change, provider activation, real geometry publication or application Auth activation was performed. All database writes described here were confined to the explicitly authorized Free rehearsal.

## Verified released state

Operational warning: PR #97 containment and PR #106 public-funnel/release-truth corrections are released, but the public demo remains browser-local and fixture-bounded. Use only built-in synthetic/demo fixtures; do not enter or upload confidential, regulated, sensitive or client-protected AOIs, CSV, GeoJSON, filenames, evidence or dynamic report/package data. Protected persistence and real sources remain blocked.

| Control | Evidence | Result |
| --- | --- | --- |
| GitHub release | PR #106, merge `cc8f9ebcf3989fab4a3c4eac9be9dfb8da786a7b` | Released |
| Exact-main quality | Post-merge push Quality Gate `29835520415`; jobs `88650735580` and `88650735754`; artifacts `8497283837` / `8497226028` | Passed |
| Vercel Production | `dpl_6RC2ohEdLBjiV82k758tFMkaDB9X`, https://geoai-mvp.vercel.app, exact merge SHA | READY |
| Rollback | `dpl_ERVqZPD5GAGDLjAVhMcPF2HT5Br7` | Previous PR #97 deployment retained as rollback |
| Product stage | `public_demo_prototype` | Released public-demo prototype; protected operation blocked |
| Production data plane | `demo_only`, `local_fallback`, soft access; no Production Supabase | Public demo only |
| Production source pack | HTTP 503, activation false, zero sources | Fail-closed |
| Development Supabase | Separate ref `pphdqkurxneyagvnnjdt`; 20 public tables, RLS on 19; 10 applied migrations; zero Auth users; candidate containment ledger count zero | Live Data API exposure remains; not security certification |
| Product version | Product SemVer is not established; `package.json` and historical UX/milestone labels are not release authority | Git SHA + deployment ID are authoritative |

## Released, live-development and candidate boundaries

| Plane | Verified truth | What must not be inferred |
| --- | --- | --- |
| Released Production | PR #106 exact SHA/deployment above; no Production Supabase; source pack 503/disabled/zero | Containment, sanitized routes, public-funnel separation and browser isolation are released; protected operation is not active |
| Live development Supabase | Direct Data API exposure described below; all seven candidate migrations unapplied | Development schema/RLS is not Auth/RBAC/Storage certification and is not Production |
| Isolated Free rehearsal | Ref `bkmfcjzalcvdsdvyxpgi`; first six candidate migrations and API-only operator applied; hosted `183/183`; positive/negative PostgREST HTTP evidence; zero uncovered domain FKs; rollback-only two-backend table-level invitation concurrency. Seventh no-MFA permanent-identity migration unapplied | Does not prove authenticated RPC/HTTP concurrency, real email/phone/Admin, Storage, development upgrade/drift or Production |
| Unreleased audit candidate | Head `e999c5a07d3ced6c95f2eb44f6a5f03a9c17caea`, tree `73b7c198813d6aede795b8b186bd4d58e741b181`; run `29500488408` success; DB clean/rehearsal/second 71/71; Preview `dpl_CY7oNavQwu5ddkhRRLaR3FWTd3d9` READY | Live-derived upgrade/drift, apply/Data API containment, credential evacuation, live JWT/Storage/source personas and browser quality remain required |

All previously published candidate receipts are superseded and must not be reused. Exact volatile receipts are maintained in [Current Release State](CURRENT_RELEASE_STATE.md); this audit records their scope and residual risk.

### Live development Supabase exposure

The 2026-07-16 11:31 UTC read-only audit of `pphdqkurxneyagvnnjdt` found `ACTIVE_HEALTHY` on PostgreSQL `17.6.1.141`, 20 public tables with RLS on 19 (`spatial_ref_sys` remains the exception), zero Auth users, four buckets and zero `storage.objects` policies. A later read-only migration-ledger check still shows exactly ten historical entries and none of the six current candidates. `anon` and `authenticated` each retained 22 public-table `TRUNCATE` grants, which RLS cannot constrain. Advisors returned 14 security findings (one ERROR, 13 WARN) and 71 performance findings (53 INFO, 18 WARN). This confirms that the development boundary is unchanged; no development write was performed.

Before Auth, real sources, protected files or durable user data, the owner must either disable the development Data API or expose a dedicated minimal `api` schema with minimum grants/RLS. See the [operator runbook](SUPABASE_DATA_API_CONTAINMENT_RUNBOOK_2026_07_16.md); its owner path is executed on rehearsal only and remains a draft/not apply-ready for development.

## Critical findings

### S0 — block protected/real-data activation

1. **The migration/identity/source-custody chain has exact-head clean and synthetic prefix-rehearsal receipts but is not upgrade/live certified.** Head `e999c5a07d3ced6c95f2eb44f6a5f03a9c17caea` passed clean 71/71, a synthetic exact-ten-ledger-prefix/pre-ledger-repair/three-pending-migration/security-surface rehearsal and a second 71/71 in job `87627894968`. This is not a current-development clone, live-derived upgrade replay, drift, live apply or DB-01 certification. Live Data API/ACL containment, advisor parity and real JWT/HTTP/Storage/source personas remain mandatory.
2. **Permanent-user identity and AUTH-01B are implemented locally but not activated or persona-certified.** Before profile RPC, UUID `claims.sub` must equal canonical `auth.getUser().id`, and claims/user anonymous markers must both be explicitly false; mismatch is 401, anonymous identity 403 and ambiguity fails closed. Exact-target SSR/PKCE/session/logout, existing-user-only email and phone OTP, automatically staged invitation links and permanent-identity Admin RPC routes are present and pass static/build/local HTTP smoke. MFA is deliberately absent from the current product flow. The mock demo is browser-only and cannot satisfy protected API authorization. The exact-project Product facade remains disconnected, readiness false, Product repositories disabled and live hosted HTTP/JWT/RLS/IDOR personas absent.
3. **Protected Storage is incomplete.** Live Storage has four private buckets and zero `storage.objects` policies, so it is correctly unusable rather than exposed. Current upload foundations also trust caller-supplied organization/project/evidence IDs and declared type too far; server-resolved canonical scope, magic-byte detection, checksum, quarantine/AV state, safe download disposition and user-context signed-URL evidence are incomplete. No client binary may enter the system before [STORAGE-01](CODEX_BACKLOG_2026_07_16.md#storage-01--protected-evidence-pipeline).
4. **Real snapshot visibility/custody is unsafe live, with fail-closed SOURCE-01/SOURCE-02 foundations staged.** SOURCE-01 is applied and SQL-tested on the isolated rehearsal only; it remains unapplied to development/Production and no provider is connected. SOURCE-02 now produces only an unsigned `reserve_or_replay` correlation claim whose execution/idempotency hashes bind exact environment, tenant, connector/provider/parser, rights, broker, endpoint/network/body/window; actor is omitted only from the shared acquisition key. It grants authorization `none` and requires external registry/plan/hash revalidation, trusted execution, transactional writing and a still-absent atomic pre-fetch reservation writer. The registry is empty, Production denied and there is no fetch/env/secrets/persistence. Provider writes and activation remain blocked.
5. **The live development Data API is overexposed.** RLS alone is insufficient while broad grants/functions remain reachable, and the application still lacks a caller-JWT Supabase repository client. The separate operator choice—disable the Data API or expose a minimal `api` schema—must close with before/after anon/RPC/Storage persona evidence. The runbook authorizes no apply.
6. **Historical public Previews violated least privilege; owner evacuation is complete but fresh-deployment evidence is pending.** Read-only evidence confirmed a privileged development Supabase credential in the application runtime. On 2026-07-16 the owner confirmed Vercel service-role/legacy-anon removal, Shared-scope review, development legacy-key disablement and Preview-only rehearsal configuration with a modern publishable key. No value was recorded. Because the available connectors cannot independently enumerate Vercel values or legacy-key state, ENV-01 remains open only for a fresh exact-head Preview plus hosted negative/Auth evidence; historical deployments are not evidence.

AI-01 is a conditional S0/P0 only before protected or upstream AI use; it remains S1/P1 for the deterministic public demo.

### S1 — block Production-quality claim

1. AI upstream routes need distributed rate limiting, per-project quotas, privacy classification/redaction and cost telemetry even after the new request bounds and activation gate.
2. AOI APIs still need authenticated server-boundary byte/feature/ring limits and durable-write evidence. The shared validator now rejects non-finite/out-of-WGS84 coordinates, wrong tuple arity, unsupported antimeridian crossings, duplicate/self-intersecting and over-complex polygons and recomputes bbox, centroid and area; an 11-persona adversarial contract covers one representative Dubai polygon plus ten negative cases. The audit branch keeps public-demo AOIs browser-local and no longer mirrors their geometry through the server, so GEO-01 is only partially closed.
3. The audit branch disables Vercel/server `/tmp` fallback and public-demo server mutations. Uploads, AOIs, analyses, report summaries and comparisons are project-scoped browser-local; explicit Data Room/report/API lookups fail closed for unknown projects, while Workspace clears an invalid URL key and visibly resets to the default demo. Protected controls are disabled before fetch. Legacy uploads without `projectKey` are intentionally not migrated. Multi-user durable state still requires Auth/RLS; local-development fallback remains non-durable and must never be treated as evidence.
4. Audit events are non-blocking and commonly lack durable actor, request ID, IP/user-agent and failure evidence.
5. The released mobile map dialog did not trap focus, move initial focus into the dialog or close on Escape; two criteria controls also lacked accessible names. The audit branch contains a focused remediation, pending exact-head browser regression evidence.
6. The released analysis PDF did not carry machine-visible source/attribution metadata for its seeded basemap, and live report previews disabled native Mapbox attribution. The audit branch now supplies captured-map provenance and restores native live-preview attribution, pending browser/print verification.
7. Multi-thousand-line Workspace/Project/Map coordinators increase regression risk. Home imported roughly 489 KB transferred / 1.77 MB decoded Mapbox code even in a no-WebGL run; feature detection and broader budgets remain open. The candidate now lazy-loads Workspace comparison, express-result and report-preview surfaces; on the same local production-build basis First Load JS fell from 252 kB to 218 kB (34 kB, approximately 13.5% gzip). Exact Preview source-route sizes are 5,164/4,411/18,284/5,164/8,221/4,292 B for data-sources/readiness/manifest/sources/status/lineage, replacing the old 133–158 KB responses. This remains HTTP/bundle evidence, not browser or Core Web Vitals certification. The legacy seven-request `AnalysisPanel` server fanout is disabled, roughly 500 lines of dead state/effects/handlers remain, and Project Hub still begins with six public requests.
8. Mobile primary navigation hides Workspace/Projects, Project Hub becomes a roughly 5,020 px technical page, and printable packs have weak pagination/footers. These are product-quality backlog, not security blockers.
9. Canonical report/package raw-ID validation and bounded seed lookup are fixed. Caller-supplied report JSON cannot establish evidence use: report POST currently returns 403 before body parsing; after AUTH eligibility is implemented it remains gated with 503 until server-authoritative analysis/evidence receipts exist. Unverified source assertions remain candidates. Durable report/comparison create/list/fetch/print/delete round trips and immutable receipt custody remain incomplete; comparison Supabase CRUD is not yet one coherent contract.
10. Several routes still materialize JSON/multipart bodies before a global limit; operator diagnostics need a separate authenticated control plane. Public Preview privileged credential evacuation is the explicit S0 ENV-01 task above.
11. Browser uploads now warn against confidential/personal/regulated data and enforce strict CSV record/header/quote/coordinate rules, GeoJSON geometry/property quotas, AOI 1,000-vertex pre-topology bounds, per-project retention and read-time revalidation. Browser persistence is restricted to the versioned `geoai-public-demo-v2` namespace, is unreadable outside `demo_public`, and is purged with exact legacy keys plus the legacy dynamic print prefix on Auth startup/sign-out. It remains unencrypted, has no TTL or verified subject/organization namespace, and parsing is still main-thread work; CSP can be tightened. These are containment residuals, not permission for client data.
12. Head `e999c5a07d3ced6c95f2eb44f6a5f03a9c17caea` passed run `29500488408`: app job `87627894974` and DB job `87627894968` succeeded. Quality artifact `8376235675` and database artifact `8376300064` preserve separate receipts. Live-derived upgrade/drift, live HTTP/JWT/Auth/source/Storage personas, adversarial uploads and browser accessibility/performance remain missing.
13. `/demo` is a 307 redirect to `/workspace`, not the three-card narrative launcher described by old QA/release prose. Current documentation and smoke tests must assert the redirect; narrative records remain historical/prepared context.

### S2 — governance and maintainability

1. The generated repository [lifecycle manifest](DOCUMENT_LIFECYCLE_MANIFEST.json) classifies all 131 in-scope Markdown documents: 12 active authorities and 119 non-active/generated records, including `docs/artifacts`. The generated [archive index](DOCUMENT_ARCHIVE_INDEX.md) gives every file a clickable lifecycle and successor without rewriting historical evidence. Its CI gate passes with no unclassified document. The earlier hand scan that found 80 files without inline lifecycle language is superseded; counts must be derived, not copied. [DOCS-01](CODEX_BACKLOG_2026_07_16.md#docs-01--documentation-lifecycle-and-confluence-ia) still owns Confluence historical-page cleanup.
2. Several open PRs/issues describe completed or superseded work and need individual disposition. They must not be silently closed or relabelled as current.
3. `lint` is TypeScript-only; the codebase lacks a conventional lint/unit/integration stack proportional to its surface.
4. Historical runtime telemetry showed a report-print `.map` failure on an older deployment. It is not reproducible on the current exact-SHA Production routes, so it is retained as regression evidence rather than called an active defect.
5. Confluence Hub page `98425` is the canonical space root at `/spaces/PH/overview`. Depth-10 paginated traversal found 253 unique current descendants plus the Hub (254 pages total), maximum hierarchy depth eight and no demonstrated root islands/orphans. Depth counts are `1=5, 2=16, 3=143, 4=66, 5=8, 6=9, 7=3, 8=3`; CQL returned only 251 because its index omitted descendant IDs `131408`, `5341818`, `5440327`.
6. Confluence sibling-number collisions exist at `06.02`×2, `06.03`×2, `06.42`×3, `06.46`×2, `06.56`×2, `06.57`×2, `06.58`×2, `06.59`×3, `07.07.11`×2, `09.10.04`×3 and `09.13`×2. Verified stubs include Demo Narrative (81 chars), Construction Monitoring (112), Asset Portfolio (80), Quality Requirements (96) and Entity Model (140). Hub labels also mismatch their targets: `03 UX, UI & Design System` points to a page titled `06...`, and `08 Go-to-Market & Pilot` points to `08 GTM, Pilots & Fundraising`. No exact full-title duplicates were found.
7. Read-only Figma verification found 61 pages in `TAzDqOvRCw1mQGMU3Y4S9H`: `169:2` is still Current Master; `217:3` is WIP/Not Current and `217:19` still says `Current Production after PR #54`; `465:5` is Identity Gate 04 / Founder Approved but remains legal/public-release blocked; `413:2` is the older Founder Review gate. FigJam root `0:1` is empty. Confluence UX/UI still foregrounded Gate 02 and obsolete code/deployment facts, so it requires synchronization; no design mutation or parity/release promotion is justified.

## Remediation implemented on the audit branch

The branch contains risk-reduction controls, not a readiness promotion:

- a complete 88-handler access manifest with 51 project-scoped decisions, two permanent-identity organization-admin handlers, three identity-mutation handlers and explicit public-demo classifications;
- a seven-key demo-project allowlist, strict profile/membership status checks, fail-closed Supabase Auth misconfiguration handling and six identity-gated handlers with visible pre-repository denial;
- authoritative access decisions before affected mutations, explicit public-demo server-mutation denial and object-first project resolution for affected ID routes;
- separate screening-review, client-attestation and official-attestation capabilities, with attestation persistence disabled until server authority exists;
- removal of service-role credential fallback from request-facing Supabase repositories;
- readiness evidence that cannot be promoted by three boolean environment flags;
- explicit fail-closed Auth, protected-Storage and durable-audit evidence kernels; bucket reachability is not treated as Storage authorization evidence;
- bounded AI JSON, array/string limits, timeout/token caps and an upstream gate requiring explicit activation plus hard Supabase-auth mode;
- browser-local public analysis/decision scoring; both server generation POSTs deny before body parsing until AUTH-01, and private upload/AOI-derived coordinates skip market/climate requests;
- explicit allowlisted public source DTOs that cannot inherit future manifest fields and omit internal filesystem/storage path fields;
- project-scoped browser-only public-demo uploads/AOIs plus report summaries, analysis-run and comparison state under a versioned demo namespace; non-demo modes cannot read/write it and Auth startup/sign-out purges namespaced records, exact legacy keys and the legacy dynamic print prefix. Explicit data lookups fail closed, invalid Workspace URLs reset only after clear/user notice, protected controls stop before fetch and Vercel server-local `/tmp` persistence is disabled across repositories;
- server-resolved source environment on both `/workspace` and `/explore`, with no client-side development fallback capable of bypassing the Production spatial-source gate;
- flag + server-only operator token + matching request authorization for Preview/local provider execution, with fixed HTTPS hosts and redirects rejected; Production always fails closed;
- static/sanitized anonymous database, Storage, platform, pilot, RLS and limitations routes; infrastructure diagnostics are withheld for an operator-authenticated plane;
- bundled-only public source projection with source contract 1.3, manifest 1.6, no live registry query/count and private lineage redaction; public functions import only the reviewed manifest plus three aggregate-quality records, not deep snapshots;
- per-source DLD/OSM/Overture status/count/use contracts, group-total separation, compact response budgets and Vercel output-file trace budgets, now backed by exact-content-SHA Preview HTTP/size evidence;
- strict NASA aligned/in-period/value, Copernicus collection/datetime/cloud and Overpass exact-count parser contracts plus cancellation of non-success/oversized response bodies;
- canonical report/package ID validation, bounded direct seed lookup and a 16 KB summary-only public package-list projection without dynamic/browser state;
- report lineage that separates explicitly acquired/used evidence from zero/manual/planned validation candidates, refuses unrelated explicit report/analysis/comparison substitution and includes only linked acquired Data Room evidence; caller JSON cannot mint evidence authority and report persistence is hard-disabled until a server receipt exists;
- a compact five-project public report-package summary fast path that performs no full package/source-manifest construction, plus corrected home-buyer/family seed mappings;
- animation-frame-coalesced single-query map hover, deduplicated hover GeoJSON writes and one active WebGL map during the mobile picker; `preserveDrawingBuffer` remains always-on in the current capture path and must become on-demand under PERF-01;
- a shared protected-GET response boundary with `private, no-store, max-age=0` and `Vary: Authorization, Cookie`, enforced from the access manifest while immutable public seed responses remain explicit allowlists;
- CSP, HSTS, frame, MIME, referrer and permissions headers and removal of `X-Powered-By`;
- keyboard-modal containment and explicit labels/value text for the confirmed critical accessibility defects;
- explicit source/attribution rendering for seeded/captured report map images and native attribution for live report maps;
- map failure handling that does not monkeypatch global logging, detects stalled readiness and exposes a keyboard fallback action;
- dependency upgrades/override that reduce the audited npm advisory count to zero;
- seven Supabase candidate migrations: the first six are applied only on rehearsal and unapplied to development/Production, while the seventh no-MFA permanent-identity compatibility migration is unapplied everywhere. Together they retire detected anonymous/authenticated domain grants and policies, close direct health/base-table access, add account-state-aware private helpers, stage the Auth/Admin/client/project model, harden foreign-key coverage and lifecycle concurrency, and define immutable tenant/actor-bound custody records without provider write access;
- a narrow `SECURITY DEFINER geoai_private.has_storage_project_role()` predicate so review-only Storage policies do not join protected base/Auth tables as the caller; object fetch/signing remains operation-aware with listing and `client_viewer` raw access denied;
- a permanent-user identity gate requiring matching UUID claims/user subjects and explicit non-anonymous evidence before profile RPC; effective-mode-gated exact-target SSR/PKCE/session/logout, one existing-user-only email-or-phone login screen, automatic short-lived HttpOnly invitation handoff and permanent-identity Admin RPC routes; plus a browser-only mock demo and a disconnected exact-project AUTH-01B Product facade whose persona-readiness flags remain false;
- a pure SOURCE-02 `reserve_or_replay` correlation claim with authorization `none`, exact execution/idempotency hashes, empty registry/no fetch/env/secrets/persistence/Production, and external revalidation/trusted-executor/transactional-writer/atomic-reservation requirements;
- an AOI integrity validator and 11-persona adversarial contract covering finite WGS84 exact-arity coordinates, supported longitude span, topology and authoritative measurements;
- candidate containment constraints for missing `profiles.status`, a partial unique Auth-user mapping and removal of the legacy AOI authenticated `FOR ALL` policy; canonical identity/role semantics and live apply remain open;
- active documentation reset, current-truth regression check and explicit Codex backlog.
- safe dynamic imports for Workspace result-only dashboards/report preview, reducing the same local production-build First Load JS measure from 252 kB to 218 kB (approximately 13.5% gzip), with exact-Preview/Core Web Vitals evidence still required.

These changes implement the local request-scoped email/phone Auth, Admin and simplified Onboarding candidate but do not activate it on a hosted target or certify its real-user personas. They also do not certify SMS delivery, upgrade/live replay, make the prepared migration safe to apply, connect a provider or complete report/comparison persistence. Their purpose is to narrow exposure and make remaining work measurable.

## Hold disposition

| Previous hold | Disposition | Current control |
| --- | --- | --- |
| Independent reviewer approvals | Removed for the current phase by owner decision | Codex/owner critical review is recorded honestly; no independent approval is claimed |
| PR #87 source-pack merge | Completed | Exact-main CI and Production evidence; Production upstream remains disabled |
| Canonical migration chain / GitHub #85 | Remains | Ephemeral clean replay passed; upgrade replay, drift, live Data API containment and RLS personas remain |
| Spatial geometry/distribution / GitHub #80 | Remains | Rights, attribution, geometry QA and separate activation decision |
| Auth/RBAC/Admin activation | Remains | ENV-01 is closed for the exact rehearsal Preview; AUTH-01 + DB-01 + real user-context runtime evidence remain |
| Client file upload | Remains | STORAGE-01 |
| Real sources or Production activation | Remains | SOURCE-01 migration execution/real personas/trusted worker, provider rights/custody, Preview evidence and explicit owner action |
| Browser/print visual evidence | Not an approval hold | Unclaimed P1 verification under UX-01/PRINT-01; local production-server HTTP smoke does not imply rendered browser approval |

## Release decision

- **GO** for continued public-demo development and the evidenced non-Production Auth-rehearsal Preview on head `8e0039260f4cf201b230288b6b02c48d2955600e`; this does not authorize Production or external activation.
- **NO-GO** for protected client data, real Auth/RBAC/Admin, durable user writes, real source snapshots, source geometry/assets, Production upstream execution or pilot-readiness claims.
- **No independent reviewer approval is required** at this phase; every NO-GO above is evidence-based and can be retired only by its acceptance criteria.

## Audit-branch verification

The original audit worktree passed a clean dependency install (using an isolated npm cache), all then-current repository gates, `npm audit`, the Next.js production build, built-runtime API/guard probes, the security-header probe and critical route smoke checks. That point-in-time evidence is retained only for chronology.

Historical head `e999c5a07d3ced6c95f2eb44f6a5f03a9c17caea` (tree `73b7c198813d6aede795b8b186bd4d58e741b181`) passed run `29500488408`; app and DB jobs succeeded and two evidence artifacts preserve quality/database receipts. Preview `dpl_CY7oNavQwu5ddkhRRLaR3FWTd3d9` was READY on the exact head. Its matrix returned expected 200 routes, 503 disabled/zero source pack, 400 invalid climate and CSP/HSTS/nosniff/frame-DENY headers; body sizes were 5,164/4,411/18,284/5,164/8,221/4,292 B. Current Production authority is the machine receipt above. None of these GitHub/Vercel receipts applies Supabase, rotates credentials or activates Auth, Storage or providers; rehearsal database evidence is recorded separately.

Exact pre-simplification Auth-rehearsal head `8e0039260f4cf201b230288b6b02c48d2955600e` (tree `4c4f007e74f189bf5acdb5de66f352cf9cd59edb`) passed Quality Gate run `29534323096`: application job `87741880884` and database job `87741880992` succeeded, with artifacts `8389906783` and `8389970353`. Preview `dpl_66rk4tVny9TmPjo7BKona5Xo1p1b` was READY. Hosted session/status evidence proved requested/effective `supabase_auth`, hard enforcement, `allowDemoPublic:false`, no anonymous demo identity and private/no-store responses; the Auth client bundles contained no legacy anon/service-role runtime names, and no Auth-route runtime error cluster was observed. This closed ENV-01 for that non-Production Preview integration, but it predates the simplified email/phone/demo decision. Real email/phone, Admin/onboarding and rendered-browser personas remain unclaimed AUTH-01 evidence.

Required caveat: **Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.**
