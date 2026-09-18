# Sprint 10 Analysis Role/Scenario Provenance Handoff

Date: 2026-09-18

Worktree: `/private/tmp/geoai-sprint10-analysis-provenance-20260918`

Branch: `codex/sprint10-analysis-provenance-20260918`

Exact base: `c9be8fa6350098072d69c91992e63b97ca0d44ed`

## Bounded result

The Analyse path now carries one validated role/scenario context from the browser request through the server and model input into the immutable result receipt and saved-session restore.

- The existing Explore role/scenario registry is the only compatibility authority. No parallel product taxonomy was added.
- A current request submits `role` and `scenario`; the server validates the exact pair before evidence acquisition, rate consumption or provider execution.
- A role with no scenario is allowed as a bounded role lens (`scenario: "unspecified"`). A scenario without a valid role, an unknown token, or a registry-incompatible pair fails closed.
- Pre-provenance requests and stored results remain readable as `role: "unspecified"`, `scenario: "unspecified"`. The client does not reconstruct historical provenance from the current profile or Find state.
- Prompt V10 receives the validated identifiers and the fixed policy `decision_lens_only_not_permission_or_evidence`. Role/scenario cannot grant access, establish source authority or create facts.
- The provider result receipt echoes the exact submitted role/scenario. The browser rejects a mismatched receipt.
- If the validated role/scenario changes while a request is in flight, the late result is discarded instead of replacing the result for the newer context.
- Save/reopen reads the stored receipt and causes zero challenge, provider or evidence-acquisition calls.

Quick, Standard and Deep routing, auth, origin, bounded-body, one-time challenge, rate, source-acquisition, timeout and model-budget controls remain in place.

## Product/application files

- `components/point-to-object/analysis-client.tsx`
- `app/api/prototype/point-to-object/ai/route.ts`
- `components/point-to-object/live-types.ts`
- `components/point-to-object/live-session.ts`
- `src/lib/prototype/point-to-object-ai-provenance.ts`
- `src/lib/prototype/point-to-object-ai-core.ts`
- `src/lib/prototype/point-to-object-ai.ts`
- `src/lib/prototype/point-to-object-analysis-request-state.ts`

Application diff SHA-256: `293c0239cc5186e047cb250e02ff787f62928f015489af1b958b154a37c06da1`

## Dedicated tests and fixture compatibility

- `scripts/point-to-object-analysis-provenance-check.ts` — registry pairs, untrusted strings, invalid pairs before evidence/provider, prompt input, exact receipt, legacy unspecified handling and actual route execution with an offline provider fixture.
- `tests/e2e/sprint10-analysis-provenance.spec.ts` — exact submit/save/reopen with zero replay and late-response rejection after an in-flight context change.
- `scripts/point-to-object-analysis-session-v6-check.ts` — narrowly updated data-URL loader fixture for the new provenance import and V10/V9/V8 prompt chain.
- `scripts/point-to-object-analysis-state-sprint10-check.ts` — narrowly updated loader and valid registry fixture; receipt checks now include role/scenario.

Test diff SHA-256: `e1de32cfade79939a2ef561767669879c0c6b628ce0d362e98b35dcf9cd901cd`

No product fixture claims live observations. All provider behavior in this slice is mocked/offline.

## Exact validation

Runtime: Node.js `24.19.0`; Next.js `15.5.25`; Playwright Chrome channel; localhost only.

```sh
PATH=/Users/mmgolikov/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH \
  npm run lint
```

Result: PASS.

```sh
PATH=/Users/mmgolikov/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH \
  node --experimental-transform-types scripts/point-to-object-analysis-provenance-check.ts
```

Result: PASS.

```sh
PATH=/Users/mmgolikov/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH \
  npm run test:api-access-guards

PATH=/Users/mmgolikov/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH \
  node --experimental-strip-types scripts/point-to-object-ai-route-runtime-check.ts
```

Result: PASS; the existing identity/origin/runtime/body/challenge/rate ordering remains accepted and denied requests perform zero evidence/provider work.

```sh
PATH=/Users/mmgolikov/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH \
  npm run test:point-to-object-geocontext

PATH=/Users/mmgolikov/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH \
  node --experimental-strip-types scripts/point-to-object-analysis-state-sprint10-check.ts
```

Result: PASS.

```sh
PATH=/Users/mmgolikov/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH \
  npm run build
```

Result: PASS; 80/80 static pages generated.

```sh
PATH=/Users/mmgolikov/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH \
  npx next start -H 127.0.0.1 -p 3116

PATH=/Users/mmgolikov/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH \
  GEOAI_E2E_BASE_URL=http://127.0.0.1:3116 \
  npx playwright test tests/e2e/sprint10-analysis-provenance.spec.ts
```

Result: 2/2 PASS in 2.7 seconds. The owned server was stopped after the run.

## Remaining gaps

- No network model call was made, so live provider output quality for different role/scenario lenses remains unverified.
- No hosted Auth, Supabase, Preview, Production, customer workflow or external acceptance was tested.
- Legacy results correctly preserve unknown provenance as `unspecified`; they cannot support a historical role-specific claim.
- This slice establishes submitted provenance and stale-context protection. It does not prove that each role produces a commercially useful differentiated decision brief; that requires approved evaluation cases and reviewer evidence.
- No new translated visible role/scenario label was added to the dashboard because shared i18n/UI scope was excluded. The receipt is machine-verifiable, saved and exposed in the existing request-state contract.

No paid/provider call, secret access, dependency mutation, push, deployment, main/Production change, Supabase change or external write occurred.

“Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.”
