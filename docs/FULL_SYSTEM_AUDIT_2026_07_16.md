# GeoAI Full System Audit — 2026-07-16

Status: Active audit record; remediation branch is unreleased
Last verified: 2026-07-16
Audit mode: critical, multi-agent, evidence-led; no independent-reviewer approval claim
Released baseline: PR #87 / `2999e7e857989baf53ce58ecfed63550b5896be0`
Navigation: [Documentation Index](DOCUMENTATION_INDEX.md) · [Current Release State](CURRENT_RELEASE_STATE.md) · [Codex Backlog](CODEX_BACKLOG_2026_07_16.md)
Confluence authority: [09.13 Full System Audit — 2026-07-16](https://geoaimvp.atlassian.net/wiki/spaces/PH/pages/12320972) · GitHub execution: [#96](https://github.com/mmgolikov/geoai-mvp/issues/96)

## Executive verdict

The prototype is a credible public-demo foundation, but it is not ready for protected client data, real Auth/RBAC/Admin activation, durable user writes or Production real-source activation. The architecture direction is recoverable without a rewrite. The correct next move is to finish the request identity and database trust boundary before expanding product capability.

The audit removed the organisational dependency on unavailable independent reviewer approvals. It did **not** remove objective technical gates. Four boundaries remain release-blocking for any confidential or real-data mode: request-scoped identity/membership, clean database replay with RLS persona evidence, protected file handling and explicit source visibility/custody.

## Evidence scope

The audit covered:

- every repository API handler, data repository boundary, readiness signal and current migration;
- GitHub release/CI state, open delivery controls and dependency advisories;
- Vercel Production SHA, mode, routes, logs, print flows and responsive critical journeys;
- development Supabase schema, migrations, table/RLS surface, policies, function grants and advisors;
- Product architecture, UI structure, accessibility, bundle/runtime performance and error history;
- repository documentation and the Confluence information architecture, operational Hub, release facts, decisions, risks and stale review controls.

No Production deployment, Supabase migration/apply, secret change, provider activation, real geometry publication or Auth activation was performed.

## Verified released state

| Control | Evidence | Result |
| --- | --- | --- |
| GitHub release | PR #87, merge `2999e7e857989baf53ce58ecfed63550b5896be0` | Released |
| Exact-main quality | Run `29456624801`, 18/18; artifact `8359607780` | Passed |
| Vercel Production | `dpl_EAXREH31JKznnGbQYEU8bNqTqagN`, exact merge SHA | READY |
| Production data plane | `demo_only`, `local_fallback`, soft access; no Production Supabase | Public demo only |
| Production source pack | HTTP 503, activation false, zero sources | Fail-closed |
| Development Supabase | 20 public tables, RLS on 19 including PostGIS exception context; 10 applied migrations; zero Auth users | Foundation only, not security certification |

## Critical findings

### S0 — block protected/real-data activation

1. **Request identity is not implemented.** `requireProjectAccess` still cannot validate the caller JWT and real project membership. Soft demo scaffolding is not an authorization system. Any hard/protected mode must fail closed until [AUTH-01](CODEX_BACKLOG_2026_07_16.md#auth-01--request-scoped-auth-and-rbac-kernel) passes negative persona tests.
2. **The historical migration chain is not clean-replay certified.** Legacy table shapes collide with later `CREATE TABLE IF NOT EXISTS` definitions; six historical GeoAI tables lacked explicit RLS in source migrations. The filenames also reuse Supabase CLI migration versions: `20260618` appears five times and `20260624` twice, so ordering/history cannot be assumed portable even when the files sort locally. A containment migration is prepared but deliberately unapplied. [DB-01](CODEX_BACKLOG_2026_07_16.md#db-01--canonical-migration-replay-and-rls-evidence) is mandatory.
3. **Protected Storage is incomplete.** Current upload foundations trust caller scope and declared type too far; content magic, checksum, quarantine/AV state and user-context signed-URL evidence are incomplete. No client binary may enter the system before [STORAGE-01](CODEX_BACKLOG_2026_07_16.md#storage-01--protected-evidence-pipeline).
4. **Real snapshot visibility/custody is unsafe.** Nullable project scope has historically implied public/global visibility, and internal paths appeared in source responses. The audit adds a redacted public DTO, but explicit visibility/tenant semantics and custody evidence remain required by [SOURCE-01](CODEX_BACKLOG_2026_07_16.md#source-01--real-source-custody-and-visibility).

### S1 — block Production-quality claim

1. AI upstream routes need distributed rate limiting, per-project quotas, privacy classification/redaction and cost telemetry even after the new request bounds and activation gate.
2. AOI APIs need server-side coordinate/vertex/payload/topology limits and authoritative recomputation of bbox, centroid and area.
3. Local JSON fallback is a shared instance-level `/tmp` store and must be impossible in protected/confidential modes.
4. Audit events are non-blocking and commonly lack durable actor, request ID, IP/user-agent and failure evidence.
5. The released mobile map dialog did not trap focus, move initial focus into the dialog or close on Escape; two criteria controls also lacked accessible names. The audit branch contains a focused remediation, pending exact-head browser regression evidence.
6. The released analysis PDF did not carry machine-visible source/attribution metadata for its seeded basemap. The audit branch now supplies and renders Mapbox/OpenStreetMap plus synthetic-overlay provenance, pending print verification.
7. Multi-thousand-line Workspace/Project/Map coordinators increase regression risk. Home imported roughly 489 KB transferred / 1.77 MB decoded Mapbox code even in a no-WebGL run; feature detection, lazy import and measured budgets remain open.
8. Mobile primary navigation hides Workspace/Projects, Project Hub becomes a roughly 5,020 px technical page, and printable packs have weak pagination/footers. These are product-quality backlog, not security blockers.
9. Report/print pages require the same session and project boundary as APIs before protected reports exist.
10. CI needs ephemeral migration replay, live Auth/RLS persona tests, adversarial upload tests, browser accessibility/performance budgets and immutable action pinning.

### S2 — governance and maintainability

1. The repository held more than one hundred flat versioned documents with no single lifecycle authority. The new [Documentation Index](DOCUMENTATION_INDEX.md) makes current versus historical scope explicit; Confluence still requires ongoing consolidation of duplicate/stub pages.
2. Several open PRs/issues describe completed or superseded work and need individual disposition. They must not be silently closed or relabelled as current.
3. `lint` is TypeScript-only; the codebase lacks a conventional lint/unit/integration stack proportional to its surface.
4. Historical runtime telemetry showed a report-print `.map` failure on an older deployment. It is not reproducible on the current exact-SHA Production routes, so it is retained as regression evidence rather than called an active defect.

## Remediation implemented on the audit branch

The branch contains risk-reduction controls, not a readiness promotion:

- a complete 83-handler access manifest with 51 protected handler decisions and explicit public-demo classifications;
- blocking access decisions before affected mutations and object-first project resolution for affected ID routes;
- removal of service-role credential fallback from request-facing Supabase repositories;
- readiness evidence that cannot be promoted by three boolean environment flags;
- explicit fail-closed Auth, protected-Storage and durable-audit evidence kernels; bucket reachability is not treated as Storage authorization evidence;
- bounded AI JSON, array/string limits, timeout/token caps and an upstream gate requiring explicit activation plus hard Supabase-auth mode;
- public source projection that removes internal filesystem/storage path fields;
- browser-only public-demo report, analysis-run and comparison state; their request-facing server repositories cannot become a cross-user shared `/tmp` store;
- CSP, HSTS, frame, MIME, referrer and permissions headers and removal of `X-Powered-By`;
- keyboard-modal containment and explicit labels/value text for the confirmed critical accessibility defects;
- explicit source/attribution rendering for seeded and captured report map images;
- dependency upgrades/override that reduce the audited npm advisory count to zero;
- a review-only, unapplied Supabase containment migration for historical RLS, helper grants and corrected Storage membership joins/roles;
- active documentation reset, current-truth regression check and explicit Codex backlog.

These changes do not supply request-scoped Auth or make the prepared migration safe to apply. Their purpose is to narrow exposure and make remaining work measurable.

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

## Release decision

- **GO** for continued public-demo development and a non-Production audit Preview after exact-head checks.
- **NO-GO** for protected client data, real Auth/RBAC/Admin, durable user writes, real source snapshots, source geometry/assets, Production upstream execution or pilot-readiness claims.
- **No independent reviewer approval is required** at this phase; every NO-GO above is evidence-based and can be retired only by its acceptance criteria.

## Audit-branch verification

The audit worktree passed a clean dependency install (using an isolated npm cache), all 14 repository static/contract gates, `npm audit` with zero known vulnerabilities, the Next.js production build, 22 built-runtime API/guard probes, the security-header probe, and 11 critical route smoke checks. The production build generated 55 static pages; the runtime log contained no fatal, unhandled or error entries during the probes.

Remote GitHub CI and the Vercel Preview must still be bound to the published audit-branch head before the branch can be proposed as merge-ready. Their volatile run, deployment and commit identifiers belong in the Draft PR and the Confluence evidence register rather than in this self-referential branch document. Until that exact-head evidence exists, the branch remains an unreleased remediation candidate.

Required caveat: **Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.**
