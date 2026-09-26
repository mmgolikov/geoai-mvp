# COMPLETE26 — cited context vocabulary correction

Status: isolated candidate on exact `7da5b006c20d0762fe858280d557882609e3890d` baseline. This corrects two synthetic-proven false rejections in the focused-answer context validator. It does **not** identify the unrecoverable model wording behind A01-S/D in the terminal 7da batch and is not hosted, paid, Preview or Production acceptance.

## Bounded change

The validator still requires an eligible context citation and at least one supporting term in the model's focused statement. A positive, cited aggregate `transport` group—or its non-null measured nearest-transit value—now supplies the narrow English synonym `transit`. No unavailable/zero group with a null metric supplies it. A cited, rule-derived district profile supplies its bilingual character-label terms only when coverage is available, the character is not `low_signal`, and every driver group has a positive count in the bound summary. The commercial/business district additionally accepts the Russian adjective stems `делов` and `коммерч` to cover grammatical inflection. Citing only the aggregate cannot borrow district-only `tourism` wording.

Generic label words (`mapped`, `features`, `public`, `uses`, `other`, `картографические`, `объекты`) no longer satisfy a context claim on their own. Bound named nearby feature names/classes continue through the existing path. No plan, source, numeric, unit, forbidden-claim, scope, depth, evidence-ref or deterministic-recovery rule was changed. The existing public rejection code `focused_answer_context_value_mismatch` is retained, so no provenance/telemetry contract changes are needed. The code never records or emits rejected model prose.

## Reproducible local proof

Run with the existing Node 24 runtime; the new script intercepts network fetch and uses only synthetic evidence:

```sh
node scripts/complete26-context-binding-check.mjs
node scripts/complete26-context-binding-check.mjs --baseline
```

The `--baseline` mode loads the exact frozen core from the local Git object at `7da5b00` (without changing the worktree) and reproduces `focused_answer_context_value_mismatch` for three full-validator positives (English transit and EN/RU district), while the existing Russian transport wording already passed. With the correction, the full-validator check passes 22 synthetic assertions with `networkCalls: 0`: EN/RU cited positives; metric-only transit; district-only tourism with positive driver; unavailable/zero transport, low-signal or unbacked district, uncited district wording, generic `public`, unbound/uncited refs, novel numbers, forbidden claims, wrong scope and shallow Deep answer all remain rejected. Successful statements remain byte-identical; evidence packs are not mutated.

In this isolated worktree, the existing screening-depth (42), missing-attribute review (250), access-summary scope (336) and numeric-format (716) synthetic checks passed with zero network calls. TypeScript `--noEmit` also passed using the existing shared dependency tree; no packages were installed. The task owner must still review the diff and run integration checks. A fresh exact Preview and bounded non-paid evidence are required before any claim about real A01 model behavior. Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.
