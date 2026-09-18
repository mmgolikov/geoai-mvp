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

Integration is not acceptance: Auth review corrections are still pending. No push, Preview, main or Production modification occurred.

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
- Existing complete point-to-object runtime gate: PASS offline.
- Initial combined Chrome run: 10/10 PASS (six analysis lifecycle and four landing/security compatibility cases), one worker, no retries, fail-on-flaky enabled.
- Final combined Chrome: 14/14 PASS in 12.8 seconds; WebKit: 14/14 PASS in 17.5 seconds, one worker, no retries, fail-on-flaky. Includes the six lifecycle cases, four landing cases and four new EN/RU analysis cases at 390/1440px. All external browser URLs blocked in the analysis fixtures.
- Root inspected WebKit mobile EN overview/RU controls and desktop EN overview/RU controls: no horizontal overflow or clipped action; readable enabled refresh at 44px+. This is not physical iPhone or live generated-language quality certification. Fixture report prose remains synthetic English while UI localization is tested.
- Initial visual-test authoring used uppercase accessible names where the product exposes lowercase `en`/`ru`; four authoring failures are retained in `artifacts/sprint10-analysis-visual-chrome`. Corrected fixture locator, not product. Final receipts: `artifacts/sprint10-integrated-chrome-final` and `artifacts/sprint10-integrated-webkit`.
- Analysis role/scenario remain client snapshots, not server/provider provenance; project/cross-device durable request identity is not yet complete.

## External dependency evidence

The read-only Supabase schema/RLS catalog query to `bkmfcjzalcvdsdvyxpgi` timed out on 18 September: `Connection terminated due to connection timeout`. The connector wraps it as `INVALID_ARGUMENT`; this is not evidence of an invalid SQL statement or empty schema. No hosted mutation attempted. Actual DB replay and permanent/anonymous/cross-project RLS persona validation remain unproven.

## Budget and next gate

Cycle authorization is USD 15 TOTAL. Paid calls: 0; measured spend: USD 0; unknown charges: 0. Canonical ledger has not been initialized. Local fixture tests do not spend the API budget.

Next: review dev corrections; merge test-persona corrections from GenAI; rebuild exact combined commit; verify protected anonymous route denial in a correctly built auth environment, demo compatibility and Chrome/WebKit EN/RU desktop/mobile. No activation or external-readiness claim before the remaining gates.
