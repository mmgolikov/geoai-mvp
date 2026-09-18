# S1 integration and independent review — 18 September 2026

Status: LOCAL WORK IN PROGRESS; NOT ACCEPTED; NOT RELEASED.

## Integrated candidate

Root checkout: `/private/tmp/geoai-four-sprints-20260918`, branch `codex/sprint10-control-20260918`.

- `63b26b3` integrates Auth worker `93638c9` (server page/API identity foundation).
- `ec87ea7` integrates Auth worker `d24b002` (unconfirmed logout transport).
- `289172c` integrates analysis worker `708c2dc` (draft/running/completed state).
- `f68f27c` integrates analysis worker `58340c2` (130-second client deadline and immutable session restore identity).
- `09bffd2` adds the previously missing AI GET/POST identity guard, mutation-origin ordering, manifest/inventory and negative tests.
- `5d39b0c` records the analysis handoff, including its unclosed quality/provenance gates.

Integration is not acceptance. The initial Auth findings below are historical; their correction and remaining activation gates are recorded in the September 18 follow-on section. No push, Preview, main or Production modification occurred.

## Independent Auth review

Reviewed clean worker HEAD `d24b0021b83fd4189234c8ce52c827783cb20288`. Reviewer verdict: NO-GO, no P0 found; three implementation P1 findings and one activation P1 gate.

| Severity | Finding | Required correction / acceptance |
|---|---|---|
| P1 | `/onboarding` page guard prevents signed-out `#invitation` staging before login | Public staging shell only; protected acceptance/data APIs; prove fragment removal and continuation |
| P1 | Browser-only mock-demo cannot satisfy SSR guard; local marker can mask a surviving permanent session after failed logout | Explicit safe demo model; permanent verified session must not be hidden; no forgeable marker grants API rights |
| P1 | `isAuthenticated:false` can mean dependency/profile failure, not confirmed logout | Only explicit no-session evidence confirms signout; uncertainty preserves local state and retry |
| P1 activation | Permanent active identity does not establish action entitlement, project membership or per-user cost quota | Keep paid/external runtime activation held until separately implemented and persona-tested |
| P2 | Workspace redirect discards supported `segment` | Preserve allowlisted parameters and verify login return |
| P2 privacy | Fixed demo-user profile PII survives logout | Clear only the owned demo profile on confirmed logout |

All six findings returned to dev_1 in the existing Auth worktree. The AI route integration gap was fixed separately by root; this does not close the four other gates. Existing synthetic/static PASS receipts never constitute hosted Supabase/RLS acceptance.

## Root verification so far

Runtime Node 24.19.0, locked dependencies, no credential copies and no provider requests.

- Integrated lint/type checks: PASS.
- Integrated production build: PASS, 80 routes. Application code corresponds to `09bffd2`; subsequent change was a test-only addition.
- Actual AI handler offline checks: PASS for 401/403/503 identity denial before malformed/oversized body handling, no denied challenge, no evidence/provider execution, origin rejection, existing runtime flags and demo compatibility.
- API access wiring and 76-route inventory: PASS static contracts only.
- Synthetic `supabase_auth` production build on exact `ce94f0f`: PASS after public Google Fonts download retry. Local host URL and a noncredential publishable-format placeholder only; no external Supabase/provider connection.
- Real local HTTP negative suite: 2/2 PASS in 561ms, including AI GET challenge, malformed/oversized POST, other live routes and forged bearer/mixed transport. This verifies anonymous denial, not authenticated authorization.
- Mobile Chrome guarded navigation preserves the exact map `next` path and reaches the login heading, but emits React hydration error #418. Root traced the likely mismatch to `LoginPanel` rendering `getDestination()` as `/workspace` on SSR versus the query-specific destination on the initial client render. Returned to dev_1 with reproduction; NOT PASS. Diagnostic screenshot: `artifacts/sprint10-integrated-auth-denial/login-mobile-hydration.png`.
- Existing complete point-to-object runtime gate: PASS offline.
- Initial combined Chrome run: 10/10 PASS (six analysis lifecycle and four landing/security compatibility cases), one worker, no retries, fail-on-flaky enabled.
- Final combined Chrome: 14/14 PASS in 12.8 seconds; WebKit: 14/14 PASS in 17.5 seconds, one worker, no retries, fail-on-flaky. Includes the six lifecycle cases, four landing cases and four new EN/RU analysis cases at 390/1440px. All external browser URLs blocked in the analysis fixtures.
- Root inspected WebKit mobile EN overview/RU controls and desktop EN overview/RU controls: no horizontal overflow or clipped action; readable enabled refresh at 44px+. This is not physical iPhone or live generated-language quality certification. Fixture report prose remains synthetic English while UI localization is tested.
- Initial visual-test authoring used uppercase accessible names where the product exposes lowercase `en`/`ru`; four authoring failures are retained in `artifacts/sprint10-analysis-visual-chrome`. Corrected fixture locator, not product. Final receipts: `artifacts/sprint10-integrated-chrome-final` and `artifacts/sprint10-integrated-webkit`.
- Analysis role/scenario remain client snapshots, not server/provider provenance; project/cross-device durable request identity is not yet complete.

## External dependency evidence

The read-only Supabase schema/RLS catalog query to `bkmfcjzalcvdsdvyxpgi` timed out on 18 September: `Connection terminated due to connection timeout`. The connector wraps it as `INVALID_ARGUMENT`; this is not evidence of an invalid SQL statement or empty schema. No hosted mutation attempted. Actual DB replay and permanent/anonymous/cross-project RLS persona validation remain unproven.

### Founder reconnect, 17:44–17:46 Moscow

After the founder reconnected Supabase, fresh reads to **geoai-dev `pphdqkurxneyagvnnjdt` succeed**: table listing, migration history, catalog SQL and security advisors. The catalog confirms public has zero application tables, api/private schemas do not exist, migration history is empty and advisor lints are empty. System auth/vault objects are present. Empty lints on an empty application schema do not prove application security. Management metadata still said COMING_UP while catalog queries already worked.

The separate **geoai-auth-rehearsal `bkmfcjzalcvdsdvyxpgi`** still timed out; advisors specifically reported hibernation, despite ACTIVE_HEALTHY metadata. Do not confuse these two targets. The dev connectivity blocker is removed, but no pilot mapping, migration/apply, auth setting, grants, credentials, data or environment change has been authorized or performed.

## Budget and next gate

Cycle authorization is USD 15 TOTAL. Paid calls: 0; measured spend: USD 0; unknown charges: 0. Canonical ledger has not been initialized. Local fixture tests do not spend the API budget.

Next: review dev corrections; merge test-persona corrections from GenAI; rebuild exact combined commit; verify protected anonymous route denial in a correctly built auth environment, demo compatibility and Chrome/WebKit EN/RU desktop/mobile. No activation or external-readiness claim before the remaining gates.

## September 18 follow-on, through 18:42 Moscow

### Corrected Auth and invitation re-entry

- `2ca25d2` integrates worker correction `de243c6`: permanent-session precedence, explicit no-session vs unknown, demo profile cleanup, public invitation staging, allowlisted continuation and hydration correction.
- `72ac2d0` restores an already-staged invitation after login/navigation/reload using a server-derived presence boolean. The token stays HttpOnly and acceptance remains server-identity/RPC controlled. Independent reviewer: LOCAL PASS, no new P0/P1/P2; no positive hosted persona claim.
- `e219409` integrates the local database packet; no application source changed afterwards through `a2e75e7` except test infrastructure/docs.
- Optimized synthetic-auth HTTPS suite: **20/20 PASS, 12.1 seconds**, Chrome10 + WebKit10, retries0, one worker, fail-on-flaky. Application source `e219409`, harness committed `0e5395c`; artifacts `artifacts/sprint10-auth-https-final`. Covers 390/1440px hydration, exact allowlisted continuation, rejected external continuation, actual anonymous server/API denial, invitation staging/re-entry/no token in HTML/no-store/guest acceptance401.
- Root inspected mobile and desktop login screenshots. EN login copy and existing phone UI remain; no claim of full localized Auth or configured SMS.
- Earlier failures were retained: accessible-label authoring mismatch; HTTP-only WebKit 307/upgrade-insecure-requests transport limitation; initial HTTPS inherited Chrome-channel config. Final HTTPS uses native redirects and unchanged product CSP. The self-signed one-day certificate was confined to one test context, never installed in the OS trust store, and removed when the owned server stopped.

### Integrated demo/persona regression

- `6175425` + `c9be8fa` integrate worker test-persona correction against the new SSR guards. The old-branch protected 4/4 is explicitly not acceptance.
- Independent test review rejected the omission of Create failed-update/market-reset assertions. Root `a2e75e7` restores forced502 → last-good B and saved project bytes retained → reload/explicit project reopen without another Create API call → Singapore clears active concept/session without deleting saved project. Reviewer subsequently GO for this bounded test correction.
- Fresh optimized **demo_public build on `c9be8fa`: PASS80 routes**. The first attempt failed fetching public Google Fonts in the restricted network; authorized retry succeeded. No source/dependency change concealed that failure.
- **Chrome50/50 PASS, 1.9 minutes**, application and tests `c9be8fa`, artifacts `artifacts/sprint10-integrated-demo-c9be8fa-chrome-authorized`. First restricted launch produced three browser-launch failures; those remain separate infrastructure failures, with no application execution.
- Root-restored Create case **Chrome1/1 PASS, 4.2 seconds**, tests committed `a2e75e7`, application `c9be8fa`; artifacts `artifacts/sprint10-create-retained-regression-chrome`.
- **WebKit50/50 PASS, 2.3 minutes**, tests `a2e75e7`, optimized application `c9be8fa`; artifacts `artifacts/sprint10-integrated-demo-retained-webkit`. Includes restored Create failure/reset, analysis lifecycle/depth, EN/RU controls, saved-result reopen, comparison, identity matching, source timeout/recovery, responsive map and landing.
- Root inspected current WebKit RU mobile analysis controls and desktop Create-B screenshot: action remains visible, no clipping/overflow in those views. Report text is synthetic English and map tiles are deliberately offline; not live-data visual acceptance or complete RU translation.
- **Protected anonymous persona suite4/4 PASS, 21.8 seconds**, root test/application `a2e75e7`, dedicated synthetic localhost dev server. Real server redirects/denials, no guest project entry, owned bytes unchanged, optional SDK failure fails closed; artifacts `artifacts/sprint10-integrated-protected-personas`. Not successful login, membership, hosted RLS or tenant-isolation proof.
- Fresh lint/types and exact16-RPC operator contract PASS. Root-owned optimized/demo servers were stopped; protected test server stops with its config. `.next` is now a synthetic-auth dev build and must be rebuilt before optimized/demo tests.

### Fresh database correction supersedes the empty-target assumption

At 18:36–18:39 Moscow the reconnected development target is ACTIVE_HEALTHY and contains its historical schema: public20 (19 RLS GeoAI plus managed spatial_ref_sys), DLD7, migrations12. All12 stored migration statement byte counts/hashes match the unchanged September4 manifest. The earlier COMING_UP/empty readback is superseded, not deleted from history. No hosted writes were performed by this cycle.

The empty-target replay packet is INAPPLICABLE. Existing data must be preserved. Current catalog grants and 21 advisor findings require a scoped containment/upgrade plan; actual external exposure and exploitability were not tested. Full detail: [restored readback](SUPABASE_RESTORED_READBACK_20260918.md). Hosted activation is still unapproved and unaccepted.

### Current ownership / next slice

Two bounded70-minute worker assignments from clean `c9be8fa` are running: GenAI in `/private/tmp/geoai-sprint10-analysis-provenance-20260918` owns role/scenario request-to-provider/result provenance; Dev in `/private/tmp/geoai-sprint10-find-state-20260918` owns Find reset/active/shortlist/geometry state. Their new work is not included in the PASS results above. Root owns integration/shared tests/database/docs. No paid provider request yet; budget USD15 unchanged, measured cycle spendUSD0, unknown charges0.
