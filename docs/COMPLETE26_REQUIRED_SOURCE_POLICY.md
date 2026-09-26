# COMPLETE26 — explicit required-source policy (V14)

## Approved bounded change

Base `9a1a60d218075afe11a1f2c0a87ef2739310750a` retains the held point-validation copy fix. Add the already computed `requiredMissingEvidenceCodes` and one status/inclusion instruction to `buildPointObjectResponsesRequest().validationPolicy`, for both the first request and repair. Use `POINT_OBJECT_AI_PROMPT_V14_2026_09_26`. Initial no-question requests receive an empty list; narrow available-height requests keep their empty list and canonical response.

The instruction requires every code, prohibits `answered` when the list is nonempty, and preserves useful source-bound custom prose. It does not insert codes into a model answer after generation or replace that answer with a generic fallback. No classifier, validator, recovery eligibility, source, schema, Auth, rate, provider attempt or budget logic changes. V13 and all historical evidence remain historical; they are not relabelled V14.

## Observed reason and uncertainty

Root's hosted A10 logs on `ebf7c348` identify two `EVIDENCE_INSUFFICIENT / focused_answer_missing_source_gate` rejects. Raw rejected prose/codes were not retained, so the exact omitted codes and model reasoning are unknown. Local synthetic reproduction shows the exact English A10 question requires `title_rights`, `official_identity`, `current_market`, `cost_financials`, including when those domains occur in “Do not infer …”. The existing classifier is conservative and remains unchanged. Previously the request did not explicitly transmit this computed list.

This change makes the existing requirement explicit to the model; it is not proof that future provider output will comply or that A10 will pass. Negation-aware classification is deliberately not attempted: naively removing the excluded domains could activate the separate direct-height canonical branch and lose the broad custom question's purpose.

## Offline regression

```sh
node --experimental-transform-types scripts/complete26-required-source-policy-check.mjs
```

Node 24.19; synthetic evidence only. English question is exact A10 text; Russian is a synthetic translation, not a claimed live request. EN/RU × Q/S/D × broad custom / narrow height / no question × first / repair covers 36 requests.

- Actual pre-core-edit run: exit 1, 36 missing-policy failures; all full-validator assertions ran successfully first. This is distinct from later reconstructed-baseline comparisons.
- After edit: PASS, 139 counted checks, 36 baseline absent policies, no desired-policy failures, network calls 0.
- Full provider request is deeply equal to the reconstructed V13 baseline after removing only the two new fields and normalizing the version. System prompt, schema, evidence projection, selection policy, model/options and repair task remain unchanged.
- Honest partial authored custom answers remain verbatim. Omitting each required code fails; `answered` with required sources, fabricated numbers and unbound refs fail. Initial and narrow-height full-validator results remain equal to baseline.
- Unchanged adjacent semantic-v6, analysis-depth-contract, point-to-object-contract and point-validation-copy (481) checks PASS.
- TypeScript `--noEmit --incremental false`, `git diff --check`, request-limit (80k UTF-8 cap), quality20 AI failure/usage and climate-answer (141) checks PASS.
- Existing focused-shape check stops at its literal V13 version assertion (line 46); screening-depth check stops at the client parser rejecting V14 (line 104). These are integration prerequisites, not green tests. Main owns current-version/legacy-V13 client wiring and test repins outside this change's three files.

No hosted calls, credentials, ledger reads/writes, builds, servers, paid tests, deployment or push. Main must finish version compatibility, rerun adjacent/CI/runtime gates and review useful actual answers; offline request parity is not provider or full-matrix acceptance.

## Main integration — 26 September, after the terminal A10 failure

The worker blockers above are historical. Main integrated the held recovery-origin UI and point-aware validation copy, added current V14 parsing with immutable V13 read compatibility, and retained the V9–V12 restore paths. A new synthetic EN/RU × Q/S/D × V9–V14 check passed1190 assertions including saved-artifact parsing and provenance; a reconstructed old parser rejects18 V14 cases while its earlier-version outputs equal the new parser. This is parsing proof, not a cloud write or real model result.

The ledger helper accepts V13 only as historical input; new reservations/telemetry require V14. The extended error-telemetry suite passed57 assertions, including immutable settled V13 HTTP502 cost evidence and denial of historical dispatch/pending-reservation bypass. No operational ledger was changed. The exact root ledger's newer operational transition remains separately reviewed; generic synthetic tests do not certify that transition.

Root reran required-source139, client1190, shape9groups, missing-attribute250, screening-depth42, point-copy481, semantic, point contract, analysis provenance, V6/V5 session restore, global budget, cloud-input44 and capture58 checks successfully. Existing assertions were retained; only current-version literal pins were advanced. The new regressions are scheduled in the existing quality job. Final build, browser, CI, hosted A10 and complete release acceptance remain pending.
