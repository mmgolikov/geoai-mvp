# GeoAI Full System Audit — 2026-07-16

Status: Active audit record; remediation branch is unreleased
Last verified: 2026-07-16
Owner: GeoAI Engineering / Governance
Authority: Current full-system findings, remediation and residual risk
Successor: None; any replacement must update `DOCUMENTATION_INDEX.md`
Audit mode: critical, multi-agent, evidence-led; no independent-reviewer approval claim
Released baseline: PR #87 / `2999e7e857989baf53ce58ecfed63550b5896be0`
Navigation: [Confluence Hub](https://geoaimvp.atlassian.net/wiki/spaces/PH/overview) · [Documentation Index](DOCUMENTATION_INDEX.md) · [Current Release State](CURRENT_RELEASE_STATE.md) · [Codex Backlog](CODEX_BACKLOG_2026_07_16.md) · [Supabase containment runbook](SUPABASE_DATA_API_CONTAINMENT_RUNBOOK_2026_07_16.md)
Confluence authority: [09.13 Full System Audit — 2026-07-16](https://geoaimvp.atlassian.net/wiki/spaces/PH/pages/12320972) · GitHub execution: [#96](https://github.com/mmgolikov/geoai-mvp/issues/96)

## Executive verdict

The prototype is a credible public-demo foundation, but it is not ready for protected client data, real Auth/RBAC/Admin activation, durable user writes or Production real-source activation. The architecture direction is recoverable without a rewrite. The correct next move is canonical database replay followed by request-scoped identity integration before expanding protected capability; both may be developed against an ephemeral environment in parallel.

The audit removed the organisational dependency on unavailable independent reviewer approvals. It did **not** remove objective technical gates. Six boundaries remain release-blocking for any confidential or real-data mode: development Data API/identity-model containment, clean database replay with RLS persona evidence, public-runtime credential evacuation, request-scoped identity/membership, protected file handling and explicit source visibility/custody.

## Evidence scope

The audit covered:

- every repository API handler, data repository boundary, readiness signal and current migration;
- GitHub release/CI state, open delivery controls and dependency advisories;
- Vercel Production SHA, mode, routes and logs, plus static/read-only inspection of print flows and responsive critical journeys; browser/print visual evidence remains explicitly unclaimed P1 verification work;
- development Supabase schema, migrations, table/RLS surface, policies, function grants and advisors;
- Product architecture, UI structure, accessibility, bundle/runtime performance and error history;
- repository documentation and the Confluence information architecture, operational Hub, release facts, decisions, risks and stale review controls.

No Production deployment, Supabase migration/apply, secret change, provider activation, real geometry publication or Auth activation was performed.

## Verified released state

Operational warning: the released PR #87 public demo still permits shared server-side user state and the released `/explore` route can present incorrect Preview/open-context source semantics despite the fail-closed source-pack API. Until Draft PR #97 is merged and deployed, use Production only with built-in synthetic/demo fixtures; do not enter or upload user/client AOIs, CSV, GeoJSON, filenames, evidence or dynamic report/package data. The containment described below is candidate behavior, not a live Production fix.

| Control | Evidence | Result |
| --- | --- | --- |
| GitHub release | PR #87, merge `2999e7e857989baf53ce58ecfed63550b5896be0` | Released |
| Exact-main quality | Run `29456624801`, 18/18; artifact `8359607780` | Passed |
| Vercel Production | `dpl_EAXREH31JKznnGbQYEU8bNqTqagN`, exact merge SHA | READY |
| Production data plane | `demo_only`, `local_fallback`, soft access; no Production Supabase | Public demo only |
| Production source pack | HTTP 503, activation false, zero sources | Fail-closed |
| Development Supabase | Separate ref `pphdqkurxneyagvnnjdt`; 20 public tables, RLS on 19; 10 applied migrations; zero Auth users; candidate containment ledger count zero | Live Data API exposure remains; not security certification |
| Product version | Product SemVer is not established; `package.json` and historical UX/milestone labels are not release authority | Git SHA + deployment ID are authoritative |

## Released, live-development and candidate boundaries

| Plane | Verified truth | What must not be inferred |
| --- | --- | --- |
| Released Production | PR #87 exact SHA/deployment above; no Production Supabase; source pack 503/disabled/zero | Candidate containment, sanitized routes and browser isolation are not live |
| Live development Supabase | Direct Data API exposure described below; candidate migration unapplied | Development schema/RLS is not Auth/RBAC/Storage certification and is not Production |
| Unreleased audit candidate | Public diagnostics are static/sanitized; source routes use bounded static compact metadata with per-source truth contracts; user artifacts/analysis/private-target coordinates are project-scoped browser-local; server generation/mutations fail before body parsing; package lists are summary-only; protected controls stop before fetch; `/demo` redirects 307 | No final candidate SHA/CI/Preview or runtime negative evidence is recorded yet; external Preview credential removal/rotation remains ENV-01 |

The previously published candidate evidence is explicitly superseded: head `bb659131f7f4aa9065fc41ba91359a066738e1dd`, GitHub Actions run `29461582699`, artifact `8361356098`, Preview `dpl_3Az4qbfuLDcVDDK21eiAyYn5XPFJ` and its 82/82-file scope. That Preview still reflects the old diagnostic exposure until a new exact-head Preview is deployed and negative-tested; it must not be used as evidence for the remediated candidate.

### Live development Supabase exposure

Read-only audit of `pphdqkurxneyagvnnjdt` found anon-readable rows in `organizations=1`, `profiles=1`, `projects=5`, `project_memberships=5`, `aois=0`, `analysis_runs=10`, `reports=10`, `comparison_sets=5`, `data_room_assets=10`, `validation_evidence=20`, `pilot_client_inputs=15`, `pilot_deliverables=15`, `source_registry_snapshots=5`, `external_data_snapshots=5` and `audit_events=17`. Snapshot policies also admit `project_key IS NULL`, making any such row anonymous through PostgREST even when `project_id` is non-null. `anon` retains `SELECT/INSERT/UPDATE/DELETE` on `public.spatial_ref_sys` and can execute 748 `public` RPCs, including 79 volatile and six `SECURITY DEFINER` functions. `geoai_healthcheck` is SELECT-only. All four Storage buckets are private, but `storage.objects` has zero policies: protected Storage is nonfunctional, not certified. A final read-only Supabase advisor refresh returned 14 security findings (one ERROR: `spatial_ref_sys` has RLS disabled; 13 WARN covering public PostGIS and `SECURITY DEFINER` execution) plus 78 performance findings (60 unused-index INFO, 18 multiple-permissive-policy WARN). The live migration ledger has 10 entries and does not contain the review-only containment migration.

Before Auth, real sources, protected files or durable user data, the owner must either disable the development Data API or expose a dedicated minimal `api` schema with minimum grants/RLS. See the [draft operator runbook](SUPABASE_DATA_API_CONTAINMENT_RUNBOOK_2026_07_16.md); it is not executed and not apply-ready.

## Critical findings

### S0 — block protected/real-data activation

1. **The historical migration/identity chain is not clean-replay certified.** Legacy table shapes collide with later `CREATE TABLE IF NOT EXISTS` definitions; six historical GeoAI tables lacked explicit RLS in source migrations. The filenames also reuse Supabase CLI migration versions: `20260618` appears five times and `20260624` twice, so ordering/history cannot be assumed portable even when the files sort locally. `profiles.auth_user_id` lacks the final unique/FK contract; the strict TypeScript matcher expects profile organization plus organization membership that the live schema does not provide; project membership/org fields and consistency constraints are incomplete; and the legacy authenticated AOI `FOR ALL` policy lacks an explicit role check. The owner must choose and align one profile/organization/project model across schema, session DTO, repositories and RLS. Red-team review also found that the first containment draft failed to retire the full historical anonymous Preview policy/grant surface; the audit branch now retires every detected policy/grant and tests the ordered chain, but the migration remains deliberately unapplied. [DB-01](CODEX_BACKLOG_2026_07_16.md#db-01--canonical-migration-replay-and-rls-evidence) is mandatory.
2. **Request identity is not implemented.** `requireProjectAccess` still cannot validate the caller JWT and real project membership. Red-team review found an environment-driven hard-mode fail-open where synthetic membership overrode a denied lower decision; the audit branch now makes the lower decision authoritative, blocks public-demo server mutations and covers the configuration matrix. Screening review, client attestation and official attestation now have separate code capabilities, but the latter two remain hard-disabled until a server-verified subject/membership/authority exists. This is containment, not Auth. [AUTH-01](CODEX_BACKLOG_2026_07_16.md#auth-01--request-scoped-auth-and-rbac-kernel) still requires real negative personas.
3. **Protected Storage is incomplete.** Live Storage has four private buckets and zero `storage.objects` policies, so it is correctly unusable rather than exposed. Current upload foundations also trust caller-supplied organization/project/evidence IDs and declared type too far; server-resolved canonical scope, magic-byte detection, checksum, quarantine/AV state, safe download disposition and user-context signed-URL evidence are incomplete. No client binary may enter the system before [STORAGE-01](CODEX_BACKLOG_2026_07_16.md#storage-01--protected-evidence-pipeline).
4. **Real snapshot visibility/custody is unsafe.** Current source snapshot policies explicitly admit `project_key IS NULL`; any such snapshot row is anonymous through the Data API even if `project_id` is populated. Internal paths also appeared in historical source responses. The audit adds an explicit allowlisted public DTO, but explicit visibility/tenant semantics and custody evidence remain required by [SOURCE-01](CODEX_BACKLOG_2026_07_16.md#source-01--real-source-custody-and-visibility).
5. **The live development Data API is overexposed.** RLS alone is insufficient while broad grants/functions remain reachable, and the application still lacks a caller-JWT Supabase repository client. The separate operator choice—disable the Data API or expose a minimal `api` schema—must close with before/after anon/RPC/Storage persona evidence. The runbook authorizes no apply.
6. **The existing public Preview violates least privilege.** Read-only environment inventory confirmed a privileged Supabase credential in the application runtime. Candidate code no longer reads or needs service-role/direct-DB credentials, but code cannot remove or rotate external values. ENV-01 must evacuate/rotate them and redeploy the exact reviewed SHA before Auth, protected persistence or real sources.

AI-01 is a conditional S0/P0 only before protected or upstream AI use; it remains S1/P1 for the deterministic public demo.

### S1 — block Production-quality claim

1. AI upstream routes need distributed rate limiting, per-project quotas, privacy classification/redaction and cost telemetry even after the new request bounds and activation gate.
2. AOI APIs need server-side coordinate/vertex/payload/topology limits and authoritative recomputation of bbox, centroid and area. The audit branch keeps public-demo AOIs browser-local and no longer mirrors their geometry through the server.
3. The audit branch disables Vercel/server `/tmp` fallback and public-demo server mutations. Uploads, AOIs, analyses, report summaries and comparisons are project-scoped browser-local; explicit Data Room/report/API lookups fail closed for unknown projects, while Workspace clears an invalid URL key and visibly resets to the default demo. Protected controls are disabled before fetch. Legacy uploads without `projectKey` are intentionally not migrated. Multi-user durable state still requires Auth/RLS; local-development fallback remains non-durable and must never be treated as evidence.
4. Audit events are non-blocking and commonly lack durable actor, request ID, IP/user-agent and failure evidence.
5. The released mobile map dialog did not trap focus, move initial focus into the dialog or close on Escape; two criteria controls also lacked accessible names. The audit branch contains a focused remediation, pending exact-head browser regression evidence.
6. The released analysis PDF did not carry machine-visible source/attribution metadata for its seeded basemap, and live report previews disabled native Mapbox attribution. The audit branch now supplies captured-map provenance and restores native live-preview attribution, pending browser/print verification.
7. Multi-thousand-line Workspace/Project/Map coordinators increase regression risk. Home imported roughly 489 KB transferred / 1.77 MB decoded Mapbox code even in a no-WebGL run; feature detection, lazy import and measured budgets remain open. The legacy seven-request `AnalysisPanel` server fanout is disabled, but roughly 500 lines of dead state/effects/handlers remain. The Project Hub still begins with six public requests. Old Preview manifest/status responses repeated roughly 133–158 KB; the candidate now isolates anonymous source functions from deep snapshots and enforces output-trace plus 48/64 KB response budgets. Fresh exact-build/Preview measurements and Hub aggregation remain open.
8. Mobile primary navigation hides Workspace/Projects, Project Hub becomes a roughly 5,020 px technical page, and printable packs have weak pagination/footers. These are product-quality backlog, not security blockers.
9. Canonical report/package raw-ID validation and bounded seed lookup are fixed. Caller-supplied report JSON cannot establish evidence use: report POST currently returns 403 before body parsing; after AUTH eligibility is implemented it remains gated with 503 until server-authoritative analysis/evidence receipts exist. Unverified source assertions remain candidates. Durable report/comparison create/list/fetch/print/delete round trips and immutable receipt custody remain incomplete; comparison Supabase CRUD is not yet one coherent contract.
10. Several routes still materialize JSON/multipart bodies before a global limit; operator diagnostics need a separate authenticated control plane. Public Preview privileged credential evacuation is the explicit S0 ENV-01 task above.
11. Browser uploads now warn against confidential/personal/regulated data and enforce strict CSV record/header/quote/coordinate rules, GeoJSON geometry/property quotas, AOI 1,000-vertex pre-topology bounds, per-project retention and read-time revalidation. Browser persistence is restricted to the versioned `geoai-public-demo-v2` namespace, is unreadable outside `demo_public`, and is purged with exact legacy keys plus the legacy dynamic print prefix on Auth startup/sign-out. It remains unencrypted, has no TTL or verified subject/organization namespace, and parsing is still main-thread work; CSP can be tightened. These are containment residuals, not permission for client data.
12. CI needs ephemeral migration replay, live Auth/RLS persona tests, adversarial upload tests, browser accessibility/performance budgets and immutable action pinning.
13. `/demo` is a 307 redirect to `/workspace`, not the three-card narrative launcher described by old QA/release prose. Current documentation and smoke tests must assert the redirect; narrative records remain historical/prepared context.

### S2 — governance and maintainability

1. The generated repository [lifecycle manifest](DOCUMENT_LIFECYCLE_MANIFEST.json) now classifies all 129 in-scope Markdown documents: 12 active authorities and 117 non-active/generated records, including `docs/artifacts`. The generated [archive index](DOCUMENT_ARCHIVE_INDEX.md) gives every file a clickable lifecycle and successor without rewriting historical evidence. Its CI gate passes with no unclassified document. The earlier hand scan that found 80 files without inline lifecycle language is superseded; counts must be derived, not copied. [DOCS-01](CODEX_BACKLOG_2026_07_16.md#docs-01--documentation-lifecycle-and-confluence-ia) still owns Confluence historical-page cleanup.
2. Several open PRs/issues describe completed or superseded work and need individual disposition. They must not be silently closed or relabelled as current.
3. `lint` is TypeScript-only; the codebase lacks a conventional lint/unit/integration stack proportional to its surface.
4. Historical runtime telemetry showed a report-print `.map` failure on an older deployment. It is not reproducible on the current exact-SHA Production routes, so it is retained as regression evidence rather than called an active defect.
5. Confluence Hub page `98425` is the canonical space root at `/spaces/PH/overview`. Depth-10 paginated traversal found 253 unique current descendants plus the Hub (254 pages total), maximum hierarchy depth eight and no demonstrated root islands/orphans. Depth counts are `1=5, 2=16, 3=143, 4=66, 5=8, 6=9, 7=3, 8=3`; CQL returned only 251 because its index omitted descendant IDs `131408`, `5341818`, `5440327`.
6. Confluence sibling-number collisions exist at `06.02`×2, `06.03`×2, `06.42`×3, `06.46`×2, `06.56`×2, `06.57`×2, `06.58`×2, `06.59`×3, `07.07.11`×2, `09.10.04`×3 and `09.13`×2. Verified stubs include Demo Narrative (81 chars), Construction Monitoring (112), Asset Portfolio (80), Quality Requirements (96) and Entity Model (140). Hub labels also mismatch their targets: `03 UX, UI & Design System` points to a page titled `06...`, and `08 Go-to-Market & Pilot` points to `08 GTM, Pilots & Fundraising`. No exact full-title duplicates were found.
7. Read-only Figma verification found 61 pages in `TAzDqOvRCw1mQGMU3Y4S9H`: `169:2` is still Current Master; `217:3` is WIP/Not Current and `217:19` still says `Current Production after PR #54`; `465:5` is Identity Gate 04 / Founder Approved but remains legal/public-release blocked; `413:2` is the older Founder Review gate. FigJam root `0:1` is empty. Confluence UX/UI still foregrounded Gate 02 and obsolete code/deployment facts, so it requires synchronization; no design mutation or parity/release promotion is justified.

## Remediation implemented on the audit branch

The branch contains risk-reduction controls, not a readiness promotion:

- a complete 83-handler access manifest with 51 protected handler decisions and explicit public-demo classifications;
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
- per-source DLD/OSM/Overture status/count/use contracts, group-total separation, compact response budgets and Vercel output-file trace budgets, pending exact-head runtime evidence;
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
- a review-only, unapplied Supabase containment migration that retires the complete detected historical anonymous Preview policy/grant surface, limits explicit demo snapshots to authenticated callers, gives `SECURITY DEFINER` helpers an empty search path, narrows helper grants and corrects Storage membership joins/roles;
- candidate containment constraints for missing `profiles.status`, a partial unique Auth-user mapping and removal of the legacy AOI authenticated `FOR ALL` policy; canonical identity/role semantics and live apply remain open;
- active documentation reset, current-truth regression check and explicit Codex backlog.

These changes do not supply request-scoped Auth, certify canonical replay, make the prepared migration safe to apply or complete report/comparison persistence. Their purpose is to narrow exposure and make remaining work measurable.

## Hold disposition

| Previous hold | Disposition | Current control |
| --- | --- | --- |
| Independent reviewer approvals | Removed for the current phase by owner decision | Codex/owner critical review is recorded honestly; no independent approval is claimed |
| PR #87 source-pack merge | Completed | Exact-main CI and Production evidence; Production upstream remains disabled |
| Canonical migration chain / GitHub #85 | Remains | Clean replay, drift and RLS persona evidence |
| Spatial geometry/distribution / GitHub #80 | Remains | Rights, attribution, geometry QA and separate activation decision |
| Auth/RBAC/Admin activation | Remains | AUTH-01 + DB-01 + user-context runtime evidence |
| Client file upload | Remains | STORAGE-01 |
| Real sources or Production activation | Remains | SOURCE-01, provider rights/custody, Preview evidence and explicit owner action |
| Browser/print visual evidence | Not an approval hold | Unclaimed P1 verification work under UX-01/PRINT-01; inability to obtain browser evidence does not imply approval |

## Release decision

- **GO** for continued public-demo development and a non-Production audit Preview after exact-head checks.
- **NO-GO** for protected client data, real Auth/RBAC/Admin, durable user writes, real source snapshots, source geometry/assets, Production upstream execution or pilot-readiness claims.
- **No independent reviewer approval is required** at this phase; every NO-GO above is evidence-based and can be retired only by its acceptance criteria.

## Audit-branch verification

The original audit worktree passed a clean dependency install (using an isolated npm cache), all then-current repository gates, `npm audit`, the Next.js production build, built-runtime API/guard probes, the security-header probe and critical route smoke checks. That point-in-time evidence is retained only for chronology.

The first published Draft PR head and Preview passed exact-head CI/build, but the final red-team then found route-wiring, hard-mode, anonymous-policy and public-demo state-isolation defects. That evidence is superseded and must not be reused for the remediated head. The final local candidate passed TypeScript plus 20 static/contract commands, `npm audit` with zero known vulnerabilities, a clean Next.js production build with 55 generated static pages, the Vercel output-trace contract, 36 built-runtime API/negative probes, the security-header contract and 11 critical route smoke checks (`/demo` correctly returned 307; the other ten returned 200). The runtime log contained no application error. Compact route sizes remain data-sources 5,063 B, readiness 4,467 B, manifest 19,448 B, sources 5,063 B, status 8,158 B and source-lineage 4,352 B. New exact-head GitHub CI and Vercel Preview evidence remain mandatory. Volatile identifiers belong in Draft PR #97 and the Confluence evidence register rather than in this self-referential branch document.

Required caveat: **Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.**
