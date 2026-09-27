# COMPLETE27 — near-limit answer completion

## Change request and observed defect

Base: `8918a937b1925e5b75656c948d202e77b3b7a204`. The saved public A02 Deep answer contained exactly 900 UTF-16 code units and ended `hold redevelopment selection until identity, land`, yet carried `model_validated` provenance. The raw provider response is unavailable; its original truncation cause is not established. Inspection of the provider service, core normalizer, route, client parser and evidence sanitizer found no statement slicing to 900: normalization rejects oversize text rather than truncating it. Other slices concern identifiers, questions, arrays or numeric-context windows.

Scope: a validator-only rejection for ordinary non-null prose of normalized length 880–900 without terminal sentence punctuation (optionally followed by closing quotes/brackets/backticks). Shorter unpunctuated statements, canonical direct attributes and typed climate answers keep their previous contracts. No text is completed, trimmed to fit, or guessed. Prompt/schema/version V14, source validation, provider settings and attempts, recovery allowlist and financial limits are unchanged.

`focused_answer_statement_incomplete` follows the existing repairable evidence-validation error path: one original response and at most one repair. Two incomplete responses produce measured HTTP 502 `AI_OUTPUT_INVALID`, not `model_validated`. This new rejection is not eligible for deterministic substitution. Existing recovery reasons retain explicit deterministic provenance.

## Offline evidence

- Actual RED before editing core: the new checker on untouched 8918 failed `length:900, expected:false`, actual `true`, using the recorded public statement in synthetic bound evidence. This is not a replay of private source data or raw provider output.
- GREEN: `node --experimental-transform-types scripts/complete27-answer-completion-check.mjs` — **254 checks**, zero network. Focused and full-content validators; EN/RU × Quick/Standard/Deep; 879/880 and exact-900 boundaries; punctuation and closing marks; decimal/abbreviation controls; real-service mocked repair, maximum two attempts, unchanged recovery provenance; old stored answer/artifact read-back without rewriting. A separate reconstructed baseline comparison confirms both old validators accepted the cutoff and all six full provider request bodies remain deeply equal; this comparison is additional evidence, not the original RED run.
- `complete26-focused-shape-check.mjs` — 9 groups PASS. Existing exact-900 positive now ends a complete sentence; prior unterminated-900, NFKC and UTF-16 negatives remain explicit. Direct-attribute and typed-climate compatibility retained.
- Adjacent PASS: required-source policy 139; screening depth 42; source-policy client compatibility 1190; `quality20-ai-failure-check.ts`; semantic-v6 (imported by adjacent checks); analysis-depth contract.
- Typecheck (`tsc --noEmit --incremental false`, the repository lint contract) PASS. New checker wired directly after focused-shape in the existing pipefail CI step with its own artifact log; no existing command removed. A preliminary `next lint` attempt found no ESLint configuration and exited without changes; no package/config installation was attempted.

## Limits / handoff

This is a conservative near-limit heuristic, not semantic grammar proof: punctuation can end an incomplete thought, and a valid unpunctuated long paragraph will require repair. Short unfinished prose is outside this narrow fix. It does not claim the provider latency, all scenarios, browser, hosted or release acceptance. Historical saved responses remain byte-content-compatible, including the old incomplete text; they are not silently reclassified as corrected. No real API/Auth/cloud/ledger actions were performed. Root owns build, browser/CI verification and integration.
