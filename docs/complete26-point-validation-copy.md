# COMPLETE26: geometry-aware identity validation copy

## Change request and boundary

Base: `ebf7c348b7eefba357630b0c54d0b406ec891dd3`. A point-only analysis must not instruct the user to match an allegedly rendered footprint. This change is limited to the deterministic `nextValidation[0].action` identity/parcel instruction in `point-to-object-ai-core.ts`.

- The existing reverse-nearest indexed-record branch is unchanged.
- A source-bound `geometryRef` with projected `Polygon` or `MultiPolygon` keeps the existing official/client identifier check. Only “rendered footprint” becomes “mapped footprint” (RU: «отображаемый контур» → «картированный контур»).
- Point, null, line, or unbound geometry asks to match the mapped point/location and object identity, and obtain a verified boundary if area or parcel analysis is needed.
- Core cannot inspect retained renderer geometry. This predicate proves only a source-bound mapped geometry type, not successful rendering, cadastral identity, or a parcel boundary.

No prompt, model, validation acceptance, source acquisition/projection, schema, parser, cache, Auth, rate, budget, optional-metrics wording or provider code changed. This is a server-generated presentation delta, **not** a client-only render delta; no earlier render-only compatibility contract is asserted to cover it.

## Reproduction and verification

Run with Node 24:

```sh
node --experimental-transform-types scripts/complete26-point-validation-copy-check.mjs
```

The checker runs the actual focused recovery/full validator and initial no-question full validator using synthetic source-bound fixtures. EN/RU × Quick/Standard/Deep × Point/null/LineString/unbound Polygon/Polygon/MultiPolygon × normal/reverse-nearest = 72 combinations. The baseline is reconstructed in memory by replacing only this exact copy branch; no source files are rewritten.

- Actual pre-edit run: exit 1, 36 desired-copy failures (24 point/null/line/unbound cases and 12 polygon/multipolygon terminology cases), zero network calls. Reverse-nearest cases already pass.
- After edit: PASS, 481 checks, 36 reproduced baseline failures, zero desired-copy failures, zero network calls.
- Full outputs are equal to baseline after normalizing only this action; reverse-nearest outputs are entirely equal. Provider request/prompt, source projection and input evidence remain equal. A mismatched geometry hash projects to null and takes the point/location branch.
- Existing unchanged checks PASS: `point-to-object-semantic-v6-check.ts`; `point-to-object-analysis-depth-contract-check.ts`; `point-to-object-contract-check.ts`; `complete26-screening-depth-check.mjs` (42); `complete26-missing-form-fields-copy-check.mjs` (1333).
- `git diff --check`: PASS.

These are offline synthetic checks, not hosted/browser/source/provider acceptance or completion of the live 58-case matrix. No operational evidence, credentials or ledger were read or written; no API calls, build, server, deployment or paid generation was performed. Main owns independent review, integration and final runtime verification. Previously saved artifacts retain their original generated copy unless separately regenerated; this patch does not rewrite history.
