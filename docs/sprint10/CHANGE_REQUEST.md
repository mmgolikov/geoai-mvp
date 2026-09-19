# Sprint10: authenticated rehearsal and decision-journey recovery

Status: APPROVED CANDIDATE IMPLEMENTATION AND SCOPED DEVELOPMENT REHEARSAL; NOT RELEASED
Approved: 2026-09-18 by founder in control
Owner/integrator: control

## Customer outcome

Prepare a stable, source-backed prototype for controlled testing. A user signs in, opens their project, understands a location, finds and compares candidates, creates A/B concepts, saves, and reopens without accidental extra AI requests. Preserve the accepted light/teal desktop and mobile experience.

This four-sprint cycle targets 19 September. Multi-user cloud operation is conditional on actual authenticated DB/persona, persistent quota, restore and hosted configuration evidence. Successful local login or a build does not establish readiness for confidential client data or a two-month pilot.

### Founder addition: outcome-first MVP, 18 September

Define the MVP backward from useful customer decisions, not mode or feature count. Keep B2B/B2C and Analyse/Find/Create, but distinguish a complete supported journey from a partial demonstration. The unit of value is a recoverable decision record: the right subject, a declared question, comparable source-backed observations/calculations, material gaps, and an actionable next validation step.

Product must reconcile the existing developer-analyst job with the Commercial06 advisory-partner channel hypothesis: operator, decision beneficiary and payer are distinct. Neither prior document proves demand or willingness to pay. Prioritize a small set of complete journeys; do not claim every listed persona, market or scenario is equally ready.

Backcast from provisional outcome horizons **15 February 2027**, **31 December 2026**, and **31 October 2026** into the remaining S2–S4 delivery backlog. Dates are planning targets, not acceptance or commercial forecasts. This addition authorizes product analysis and candidate priorities within the existing cycle, not new external services, outreach or release authority.

## Verified baseline and precedence

GitHub main and Vercel Production were read again on 2026-09-18:

- Base commit: `21b91c43c2fc8dd61b08962e562601b29dd89c76`.
- Production deployment: `dpl_AYePGoJLbHmcie2H7sX1biJbbavo`, READY.
- Immutable URL: `https://geoai-id0xnwco2-geoaidev.vercel.app`.
- Production alias: `https://geoai-mvp.vercel.app`.

Metadata is not a new browser acceptance. September 12 evidence is historical and does not close the founder's later defects. Older source-scope and runtime tuples in AGENTS/index/release documents are historical when contradicted by the externally verified release. They are not permission to activate a new source or change hosted services.

This CR authorizes only the following local candidate work and supersedes older descriptions of its scope, not independent release/security gates.

## Four sprint scope

1. Reproduce analysis lifecycle defects; implement separate draft/running/completed state; local server-side Auth/API foundation; inspect/replay existing persistence; establish a cumulative paid-test ledger.
2. Integrate email login/session/logout, personal project path if DB gate passes, Find reset/selection/compare and Create save/reopen/replacement. Preserve current result after errors and return navigation.
3. Full regression, bounded real-provider evaluation, UAE/Singapore demo packs, portable-server rehearsal and evidence/documentation. Embedded 3D result and variable-size dashboard cards follow P0/P1.
4. Freeze candidate; independently check Chrome/WebKit, EN/RU, desktop/mobile, negative personas, costs and restore. Physical iPhone acceptance is separate. Deliver GO/NO-GO, exact commit, remaining gaps and rollback.

## Acceptance invariants

- Analysis depth, role, scenario, locale, object/evidence and question bind the submitted request, running label and saved result. Settings changed after success/error can launch a new explicit run. Late responses cannot overwrite another object/request. Reopening is free of new model calls.
- Quick/Standard/Deep have meaningful bounded output contracts on the same evidence, not fabricated additional facts. Unknown data is not zero; a viewing preference is not a newly performed analysis.
- Guest UI and direct API access fail closed in the candidate authenticated mode. Server identity, ownership and membership determine access, never presentation role or localStorage. Existing demo-public mode is not silently flipped in Production.
- Find keeps hover, active object and shortlist separate. Trusted geometry is used where known; a POI does not acquire an invented footprint. Reset clears the intended search state. Changed criteria require search; a current shortlist supports comparison, then full dashboard and return.
- Create preserves the last valid result across draft edits/errors; A/B and saved-result reopen do not regenerate. AOI deletion, result deletion and reversible source-building hiding are distinct.
- No regressions in 430px desktop drawer, first-screen action, mobile camera dismissal/panel, EN/RU, keyboard, data recovery or existing map behavior.

## Ownership for S1

- dev_1: isolated auth worktree; Auth/Supabase/project repositories, middleware, declared auth guards and dedicated tests. AI route changes are proposed to control, not edited concurrently.
- gen_ai_1: isolated analysis worktree; analysis client/session/depth/prompts, AI route, dedicated tests and analysis translations.
- control: sole integrator, shared configs, baseline QA, budget/test harness, release truth.
- Temporary budget worker: new Sprint10 test-budget helper/test/contract only in control checkout. No application quota claim.
- product_1: docs-only MVP/value definition, role/scenario contracts and roadmap/backcast in the assigned mirror deliverables/product directory; no code or shared-file edits. Control integrates the recommendation with actual engineering/test evidence.

No worker modifies another lane's files without a new lock. No old candidate is cherry-picked by assumption.

## Financial and external boundaries

Founder approved **USD15 total for this entire four-sprint cycle**, all candidates, repair attempts and retries included, and reuse of the existing OpenAI key. No secret value belongs in code, logs, browser, receipts or documentation. No secret copy is authorized by this CR.

Only control dispatches paid tests after atomic reservation in one root ledger. New SHA/date does not reset expenditure. Unknown charges halt the paid lane until reconciled. Offline/fixture coverage is not evidence of provider functionality. Model changes require current model/price validation and measurable quality acceptance.

The founder's later 18 September approvals supersede the original blanket hosted-development hold: root may perform necessary data-preserving database work only in existing `geoai-dev` (`pphdqkurxneyagvnnjdt`), publish/refresh protected candidate Previews only on `codex/sprint10-control-20260918` in `geoai-mvp`, and configure the exact protected test contour using existing keys, callback URLs and isolated synthetic non-email accounts. Each action retains exact-target, recovery, compatibility, security and read-back gates. Prior tool-denied private-content/hash/upload/concurrency operations remain held without their own renewed exact approval; the general development permission is not a bypass.

No main/Production mutation, database reset, deletion of customer data, domain/server purchase, DNS cutover, new paid service, key rotation, unrelated project/Auth/environment change or security weakening is authorized. Transactional email is explicitly deferred until the founder has the domain and corporate email. No external outreach or redemption of Codex reset credits.

## 19 September regional blocker-only correction

Base `4677291c7b61eccccb0cd21c4c4dc74d6da1a65c` passed zero-retry CI and a live Dubai depth cycle, but real Singapore Find/Analyse and Singapore/Dubai Create did not complete. All four regional attempts stopped before paid calls and all eight synthetic personas were retired. Historical successes do not close these failures.

Scope: establish a bounded shared route-entry/Auth/source deadline for Find and area-context; retain single upstream attempts, last-good state and fail-closed identity; split regional browser failures into privacy-safe fixed substages without weakening request, market or subject correlation. Middleware status alone is not proof of Route Handler completion. A static timeout mismatch is confirmed; it is not yet a proven explanation for the live failures.

Auth cancellation is opt-in for those two source routes only. The existing request-scoped Supabase factory may accept an optional signal and bind it to that client's fetch, retaining any caller-provided cancellation and every existing cookie/identity/profile rule. No global fetch patch or change to ordinary callers, hosted Auth policy or secrets is included. A response deadline alone must not be reported as transport cancellation.

Two isolated workers own the source deadline and regional harness respectively. Root owns shared wiring and integration. Fresh focused negative tests, lint/build, exact-candidate zero-retry browser/CI, protected Preview read-back and a bounded real retest are required before acceptance. No automatic retries or expanded feature work. Original cycle deadline remains 19 September 14:30 Moscow.

## Delivery truth

Candidate code, integrated local verification, protected Preview verification and Production release are separate states. Report actual tests, failures, blocked checks, model/source costs and unresolved requirements. Never certify legal/IP/source rights, PMF, enterprise readiness or confidential-pilot readiness from this engineering sprint alone.

Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.
