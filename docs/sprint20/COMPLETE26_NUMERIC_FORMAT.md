# COMPLETE26: exact numeric presentation and RU metre/metro boundary

Date: 2026-09-26. Baseline: `61d333ed210e3b6ffb8ed5448a67ebe78bfab0f9`. Narrow continuation of COMPLETE25; not a new acceptance cycle or release claim.

## Confirmed defect and correction

The A01 source contains mapped footprint area 2029 m². The old focused-answer guard treated `2029`, `2,029`, `2 029` and `2029.0` as different numeric strings. A correct formatted source value could therefore trigger `focused_answer_novel_number` and deterministic recovery.

The guard now compares canonical decimal strings (not floating-point rounded values):

- EN accepts conventional comma/space grouping and a decimal point. RU accepts space grouping and decimal comma or point. NBSP/narrow NBSP are normalized consistently with the existing NFKC statement parser. RU `2,029` is 2.029, **not** 2029.
- Group widths are validated before separators are removed. Malformed grouping, exponent fragments, unsupported precision, changed signs, values embedded in identifiers and actual novel values fail closed. No epsilon, approximate rounding or unit conversion is added.
- Only square-metre notation `m²`/`м²`, normalized `m2`/`м2`, and `m^2`/`м^2` can omit its exponent as notation, and only when the number equals the bound footprint area and the answer cites its metrics receipt. Other scales (`cm²`, `km²`, `ft²`, Russian equivalents), cubic units and a perimeter borrowed as area are rejected. A standalone `2` is not made permissible by this rule.
- Numeric evidence comes from bound projection values, excluding source IDs, hashes and schema/version metadata. Exact source names such as `25hours Hotel` remain usable as names, not as arbitrary numeric substrings. Exact mapped dates and their source year remain usable; changing the date does not pass by borrowing its components.
- Separately known endpoints do not authorize a new measured range. The existing 1–3-year planning-horizon allowance is retained.

Root also authorized one adjacent, reproduced collision: the common nearby-language check interpreted Russian `метров` as `метро`. Unicode-aware matching now distinguishes metre inflections from actual `метро`, `метрополитен` and metro-station wording. Real transit claims still require eligible context receipts and matching context terms.

Only the numeric validation/support seam, that specific language collision, a new pure check and this document changed. Provider calls, prompt V13, source acquisition, snapshots/leases, climate scope, missing-field clauses, refs, paid budget, telemetry, Auth and recovery/provenance flow are unchanged.

## Before / after evidence

Use Node 24 from the repository root:

```sh
node scripts/complete26-numeric-format-check.mjs --before
node scripts/complete26-numeric-format-check.mjs --before --metro-repro
node scripts/complete26-numeric-format-check.mjs --before-units
node scripts/complete26-numeric-format-check.mjs
```

`--before` reads the immutable baseline core using `git show` into memory; it does not change the checkout. It intentionally exits 1:

- numeric case: `en/quick … 2 029 square metres … focused_answer_novel_number`, expected true / actual false;
- metre case: `ru/quick … 2029 квадратных метров … focused_answer_context_without_context_receipt`, expected true / actual false.

Independent review of the initial correction `b9f7042` caught an over-broad dimensional suffix rule before publication: source 2029 m² incorrectly allowed 2029 cm²/km²/ft². `--before-units` loads that exact commit and fails on the new negative assertion (actual true, expected false). The follow-up limits notation normalization to the cited exact square-metre footprint value; it is not a general unit reasoner.

After correction: **716 PASS**, `networkCalls: 0`. The script uses a synthetic source-bound pack carrying the observed public A01 numbers, not private batch files or a reconstructed acceptance lease. It invokes the real focused validator and full content validator, including valid depthPlan selection and rendered depth Q/S/D. It asserts immutable input evidence and unchanged authored statements after the existing normalization. Separate direct-attribute checks preserve canonical source rendering. Unsupported caret forms (`m^3`, `ft^2`) are also negative controls so their exponents cannot borrow a known count.

Covered negatives include changed 2030/202.9; signed and separated-sign changes; malformed groups; exponents; 200–223 despite separately known endpoints; scalar substring/precision changes; arbitrary source-ID digits; wrong date; unsupported number-bearing name; real RU metro without context. Positive controls include both locales, three depths, decimal trailing zeros, negative source value retaining its sign, exact dates/names, square-metre notation and genuinely cited transit context.

Unchanged adjacent suites passed on Node 24:

| Check | Result |
|---|---|
| `quality20-analysis-content-check.ts` | 114 PASS |
| `quality20-ai-failure-check.ts` | PASS; recovery and usage failure gates |
| `complete25-climate-answer-check.mjs` | 141 PASS |
| `point-to-object-climate-check.mjs` | 37 PASS |
| `complete26-missing-attribute-review-check.mjs` | 250 PASS |
| `complete26-screening-depth-check.mjs` | 42 PASS |
| `point-to-object-analysis-depth-contract-check.ts` | PASS; Q/S/D, sparse and legacy |
| `point-to-object-semantic-v6-check.ts` | PASS as unchanged imported suite |
| TypeScript / `npm run lint` | PASS |

Local `npm run build` was attempted in this isolated worktree and **blocked** by `next/font` fetching Geist: `getaddrinfo ENOTFOUND fonts.googleapis.com`. No bypass, environment change or rerun was performed. This is not a completed build or browser check; root must perform its integrated build/CI verification before acceptance.

## Limits and handoff

- The original rejected A01 provider prose was not captured. This fixes a proven local false-positive; it does **not** prove that formatting caused all three historical live recoveries. Historical provenance remains unchanged.
- This is numeric-presentation normalization, not a new general fact/field/units reasoner. Existing exact direct-attribute matching, mixed-physical clause grammar and citation/claim gates remain mandatory. It does not authorize newly paraphrased missing physical values or conversions; those stricter paths may still require their canonical spelling.
- Climate stays in its existing typed regional-climate scope. A NASA number cannot become an object-profile fact through this guard.
- No live provider/Auth/source request, ledger mutation, secret access, deployment or new paid acceptance occurred. Offline fixtures and a successful validator are not full58 acceptance or proof of useful model-authored synthesis.
- Revert this narrow commit to restore the baseline behavior; root alone integrates and verifies the next candidate.
