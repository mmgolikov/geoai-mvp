# Sprint 10 S1 Analysis Handoff

Date: 2026-09-18

Worktree: `/private/tmp/geoai-sprint10-analysis`

Branch: `codex/sprint10-analysis-20260918`

Verified base: `21b91c43c2fc8dd61b08962e562601b29dd89c76`

## Commits

Apply in this order:

1. `708c2dccd0573f77207e86fbbf9a3cde834b6d89` — separates draft, in-flight and completed analysis state; adds request identity, explicit blank refresh, cancellation, failure preservation and mocked regression coverage.
2. `58340c2caba3261098e9fa04a2141eb3f06041bc` — corrects the client deadline and persists immutable completed-request identity for browser-session restore.

## Reproduced causes and corrections

- The former UI used the completed Standard result depth while a new Deep request was running.
- The former submit button used `disabled={!question.trim() || loading}`, preventing a blank grounded rerun after depth or scenario-setting changes.
- Draft, in-flight and completed configurations were not separate snapshots.
- The first S1 commit introduced an incorrect 45-second client timeout. This was shorter than valid Standard/Deep provider profiles and was corrected before handoff.
- The corrected client deadline is 130 seconds: the verified route `maxDuration=120s` plus a bounded 10-second challenge/response transport margin. The route itself retains a 115-second safe budget and the provider orchestration retains a 108-second generation budget, including the bounded repair path.
- New successful browser-session results persist their immutable request identity and bind it to the result/evidence-pack receipt. Restore no longer reconstructs historical role, scenario or evidence scope from the current profile/find state.
- Older or project-restored results without this snapshot remain readable, but completed request identity is reported as unknown rather than invented.

## Actual validation evidence

Runtime: Node.js `24.19.0`. Browser runs used Playwright `1.61.1`, Chrome channel, headless, one worker, localhost port `3112`, deterministic mocked AI responses and no external/provider calls.

- `npm run lint` — PASS.
- `npm run build` — PASS; Next.js production build generated 80/80 static pages.
- `node --experimental-strip-types scripts/point-to-object-analysis-state-sprint10-check.ts` — PASS. Confirms all directed Quick/Standard/Deep request-identity transitions, route/generation/client deadline relationship, receipt matching and non-reconstruction on restore.
- `node --experimental-strip-types scripts/point-to-object-analysis-depth-contract-check.ts` — PASS. Synthetic evidence-bound checks confirm Quick identity/evidence focus, Standard criteria review, Deep decision challenge, distinct Deep alternatives, expanded uncertainty/triggers, valid evidence references, sparse fallback and legacy compatibility.
- `node --experimental-strip-types scripts/point-to-object-analysis-session-v6-check.ts` — PASS. Current/legacy restore and zero-call draft behavior remain compatible.
- Production-build Playwright command:

  `GEOAI_E2E_BASE_URL=http://127.0.0.1:3112 npx playwright test tests/e2e/sprint10-analysis-state.spec.ts tests/e2e/point-to-object-geocontext-v6.spec.ts -g 'S1|V9 Standard renders'`

  Result: 7/7 PASS. Coverage includes Standard→Deep, Standard→Quick, blank/custom/preset requests, double-submit suppression, 429 and malformed responses, a simulated Deep request still valid after 50 seconds, timeout only after the 130-second contract, explicit retry, cancellation, late response rejection, last-good preservation, immutable identity restore under changed current role/scenario, and reopen without another AI POST.

The original default-environment `fresh guest` test remains a separate fixture/environment mismatch: `demo_public` intentionally synthesizes `demo:demo-user-geoai`, while that test expects a null anonymous identity. No assertion was weakened in this lane.

## Outstanding gaps — do not overclaim

- Role and scenario are part of the client request identity but are not transmitted in the AI POST and are not part of the server/provider receipt. They must not be described as server-verified analysis provenance.
- The request evidence key is an input-scope fingerprint. The returned result separately carries the evidence-pack ID/hash. Together they improve lifecycle integrity, but they are not authoritative cadastral/planning provenance.
- Meaningful Quick/Standard/Deep differences are verified with deterministic synthetic evidence and structural contracts. No live-provider quality evaluation was run; groundedness, repair frequency, latency and useful decision delta on the reserved live set remain control-lane gates.
- Browser-session identity persistence is not cross-device or durable project persistence. Legacy/project artifacts without a snapshot intentionally remain `unknown`.
- Durable quota, authenticated authorization, tenant policy and server-side role/scenario provenance remain outside S1 and must be completed before any external readiness claim.

## AI route and file-lock release

`app/api/prototype/point-to-object/ai/route.ts` was not changed by either S1 commit. It remains available to root/control for Auth guard, durable quota and policy integration.

The S1 implementation files are now released from this lane's lock. Root/control may edit or integrate them:

- `components/point-to-object/analysis-client.tsx`
- `src/lib/prototype/point-to-object-analysis-request-state.ts`
- `src/lib/prototype/point-to-object-i18n.ts`
- `scripts/point-to-object-analysis-state-sprint10-check.ts`
- `tests/e2e/helpers/sprint10-analysis-fixture.ts`
- `tests/e2e/sprint10-analysis-state.spec.ts`

No paid API call, secret access, push, deployment, Production/main change or Supabase change occurred.

“Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.”
