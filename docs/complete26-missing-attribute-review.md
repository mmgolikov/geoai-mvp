# COMPLETE26 — mixed evidence review with missing physical attributes

## Change request

This bounded correction continues the approved COMPLETE25 scope. The frozen
`c039fab32cfed370761a2849c89725f614f03e63` A09 request asked for a mapped-evidence
review of Dubai Hills Mall, explicitly requesting missing height/levels as unknown.
Root's sanitized runtime log identifies both rejected attempts as
`focused_answer_unavailable_attribute_tag.height`. The raw provider answers were
not saved: this change does **not** establish what the original answers said or
that they would pass all later factual/context checks.

Before the change, any height mention selected the narrow scalar gate; a partial
evidence review could not report that the field was absent. The new synthetic
test failed first on the unchanged A09 question with exactly that rejection.

## Bounded behavior

- Only a custom evidence overview explicitly requesting missing fields as unknown
  qualifies. Only height and level count are eligible, checked independently.
- Partial answers require `physical_baseline`, a bound object identity receipt,
  a bound attributes receipt, and both citations. Absence of a receipt is not
  evidence that its fields are missing. Existing source joins remain unchanged.
- Each requested scalar must occur in a complete constrained EN/RU clause.
  Missing values use, for example, `Height is unknown.` / `Высота неизвестна.`.
  Present values use `Mapped height: <exact source value>.` or
  `Mapped building levels: <exact source value>.`, with corresponding RU forms.
  No inference, conversion or number borrowed from area/perimeter/context is admitted.
- Mixed clauses cannot declare a present source value unknown. Dates, styles,
  visual properties and other physical fields do not gain this exception.
- Narrow unavailable-attribute requests still fail closed unless unsupported.
  Existing available narrow height/levels retain exact canonical wording.
- Valid mixed synthesis is preserved verbatim after existing ref, source, number,
  prohibited-claim, context and depth checks. No provider retries, model settings,
  recovery allowlist, response schema, stored-answer parser or budget is changed.

The conditional request policy has fixed revision
`MIXED_PHYSICAL_REVIEW_V1_2026_09_26`; it is absent for unrelated questions.
The backward-compatible wire/parser prompt identity remains
`POINT_OBJECT_AI_PROMPT_V13_2026_09_26`. The new candidate commit, not that shared
wire version alone, binds the changed policy. Old candidate evidence is never
relabelled as acceptance of this correction.

## Offline proof

Run with Node 24:

```sh
node --experimental-transform-types scripts/complete26-missing-attribute-review-check.mjs
```

195 assertions: unchanged A09 question and RU analogue, Q/S/D, full validator and
focused gate, independent missing/present height/levels, exact narrow canonical
copy, decimal source values, borrowed numbers, word-number/contradictory clauses,
missing source/code/ref, identity/tag receipt mismatch, malformed receipt, unknown
dates/visual attributes, existing context/numeric/access guards, unsupported,
conditional policy revision and no new recovery dispatch. Synthetic source/context
fixtures are not live observations or a reconstruction of the missing A09 prose.
Network calls: zero.

Independent review of the first, unreleased `2d51b06` found a P2: an honest unknown
clause followed by `The building rises 280 m above ground.` was admitted because
280 was a known perimeter and the clause had no literal height/levels token.
The added regression failed before this correction. Unit-bearing, vertical and
pronoun scalar claims now require exact separately cited metric/context clauses
or fail closed. Positive EN/RU tests retain source-bound footprint area/perimeter
and nearby straight-line distance; wrong values, borrowed numbers, appended
claims and missing refs fail through both the focused and full validators.
Generic `what evidence establishes the height?` / RU height-only and levels-only
requests remain narrow even with an unknown instruction; available narrow values
retain canonical answers. The conditional policy revision remains V1 because
neither implementation has been deployed; the corrected commit binds its content.

Adjacent PASS: main point-to-object contract/provenance, quality20 AI failure,
114 content cases, depth contract, focused-shape 9 groups, screening-depth 42,
validation-copy 36, building-part 131, climate 141, result-evidence sanitizer;
UTF-8 request-size guard, TypeScript no-emit and diff whitespace checks.

## Limitations / next gate

The physical-clause grammar is intentionally conservative; other honest phrasings
may still be rejected and use only the existing bounded provider repair behavior.
This is not general natural-language factual verification or a new guarantee about
floor area, dates, access or commercial feasibility. Root must review the exact
commit, wire the new check into its owned CI, then validate the fresh candidate
and protected Preview before any separately authorized live acceptance. No hosted
call, account action, cloud write, paid retry or operational ledger access occurred.
