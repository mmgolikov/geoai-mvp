# COMPLETE26 — depth-aware screening recovery

## Change request and boundary

Under the current founder-approved COMPLETE25 plan, the real A03 Q/S/D results
on frozen `c039fab32cfed370761a2849c89725f614f03e63` had byte-identical focused
answers matching the broad-screening deterministic recovery template. The three
paid depths still had different structured depth reviews. The sanitized old
results cannot establish which guard rejected the original provider answer.

This isolated change is not accepted, deployed, released or live-tested. It does
not change the running frozen batch, its ledger, credentials, retries, source
acquisition, permissions or historical receipts. Existing key reuse was already
approved; this implementation reads no key and makes no provider call.

## Smallest product correction

- Preserve a valid provider focused answer unchanged.
- For recovered broad object-profile, custom development review and development
  screening only: Quick anchors facts and the identity gap; Standard compares
  conditional options; Deep compares retention/adaptation/replacement and states
  when to stop, reject an option, or rebind parcel conclusions.
- Only an evidence-bound mapped building enables building alternatives. A
  land-use polygon gets site-use alternatives and explicitly does not establish
  a building inventory, reuse capacity or demolition justification.
- EN/RU use the same evidence/decision boundaries. All existing source identity,
  ref, number, unsupported-claim, missing-source, length and access guards remain.
  No new retry or request is introduced. No generated invalid prose is salvaged.

## Bounded diagnostic compatibility

Optional top-level `answerProvenance` applies only to focused answers:

- `{kind: "model_validated", rejectionCode: null}` means the focused model output
  passed validation without the deterministic recovery path. It does not claim
  that server-rendered source cards or canonical field/selector wording were
  authored by the model.
- `{kind: "deterministic_recovery", rejectionCode: <one of four fixed codes>}`
  records context-value mismatch, context-without-receipt, novel-number or
  scenario-depth rejection. Never raw rejected prose, secrets or provider IDs.

Historical absence stays absent/unknown; initial non-focused results omit the
field. The live saved-response parser and sanitized evidence builder preserve
valid diagnostics and reject invalid shape, extra keys, arbitrary values, or
non-null rejection codes paired with `model_validated`. Financial telemetry is
unchanged. The wire schema/prompt versions are unchanged: the field is optional,
and the new parser retains every old absent-field result.

## Deterministic proof

New command (Node 24): `node scripts/complete26-screening-depth-check.mjs`.
Against the original core, the first parity assertion failed `1 !== 3` before
product edits. After the change: 42 test groups PASS, zero network calls. The
test covers three goals × two languages × building/nonbuilding, sparse and
unbound attributes, maximum supported names, valid synthesis preservation,
existing rejection gates, historical parser/sanitizer compatibility, malformed
provenance, all four actual service recovery branches, and one attempt per
successful recovery. Service upstream/status/env access is replaced by synthetic
in-memory fixtures; no operational environment or credentials are read.

Adjacent PASS: focused shape (9 groups), semantic-v6, analysis-depth contract,
quality20 content (114 cases), climate answers (141), legacy analysis-evidence
export, quality20 capture (43 IDs), A09 capture (58), cloud-artifact input (44),
TypeScript with no incremental output, and `git diff --check`.
The repository's `lint` command is TypeScript; no ESLint configuration was added.

### CI loader follow-up

Independent review found that the mandatory `quality20-ai-failure-check.ts`
loader's unrestricted import regex swallowed the newly preceding provenance
import. Reproduced on `5e07904`: Node 24 exited 1 with
`ERR_INVALID_TYPESCRIPT_SYNTAX: Expected 'from', got '='`, before its service
assertions ran. This was a test-loader failure, not a provider/product failure.

The loader now matches exactly one brace-bounded core import and binds the real
lightweight provenance module separately. Assertions cover provenance before or
after the core import, exact import cardinality, the recovered fixed diagnostic,
rejection of an arbitrary code, and absence of provenance on initial results.
Existing failure-usage, repair, retry-count and unknown-cost assertions remain.

After correction: mandatory failure check PASS; screening-depth 42 groups,
focused-shape 9 groups, content 114 cases, semantic-v6, depth contract, climate
141 cases and analysis-evidence export PASS; TypeScript and `git diff --check`
PASS. Commands ran in a credential-free child environment (`env -i`) with
synthetic provider responses only. No product file, CI definition, control
checkout, operational ledger, running batch, or credential file changed.
Full CI, browser and live acceptance remain root-owned and not claimed here.

### Validation-path copy follow-up

Root's A05-D review found a separate bounded UX issue: the structured
`depthReview.alternatives` are decision-validation paths, not retain/adapt/replace
asset strategies. The section heading is now `Validation paths` /
`Направления проверки`; its five generated EN/RU titles name the existing-asset,
identity, planning, technical-baseline and evidence-wait paths without an
`Alternative:` prefix. Only those titles and the section heading changed.
Rationale, reversal conditions, source references, hypothesis labels, fallback
opportunities, selection predicates, depth counts, prompt and wire schema remain
unchanged. This does not deliver or imply an asset-strategy comparison feature.

New `node --experimental-transform-types scripts/complete26-validation-path-copy-check.mjs`
failed against the prior heading before the copy edit, then passed 36 checks:
five paths × EN/RU × Q/S/D, non-title output parity against the former labels,
0/1/2 selection counts and old/new persisted-title parser compatibility.
Screening-depth 42, mandatory failure check, content 114, semantic-v6, depth
contract, climate 141, analysis-evidence export, TypeScript and diff-check PASS.
No browser, network, Auth, ledger, running batch or control checkout was touched.
Historical artifacts retain their old titles; no saved data was rewritten.

### Adjacent contract-selector follow-up

The full point-to-object contract test still selected six EN/RU path cards by
their former titles. Reproduced at its Deep identity assertion (line 2020 before
this edit): an empty selected rationale failed the existing mismatch/restart
predicate. Updated those six selectors to the exact reviewed new titles; all
identity-versus-parcel, planning, technical, lifecycle and source predicates
remain unchanged. No product changes were needed.

The Standard whole-review hashes also include the changed display title. The
test now separately asserts exactly one path with `Identity-first review`, then
restores only that title in a cloned comparison value before checking both
original historical hashes. No snapshot hashes were regenerated and no other
field is excluded from the comparison. The only old title left in this script
is that explicit historical-comparison value.

After correction, both commands composing `test:point-to-object` passed with
Node 24: contract check (`--experimental-strip-types`) and analysis-provenance
check (`--experimental-transform-types`). Validation-path copy 36, TypeScript
and diff-check also PASS. Tests used a credential-free child environment; no
browser, provider, Auth or operational actions. Root's concurrent CI wiring,
generated documentation and browser test work were not staged or edited.

### Root browser and permanent-gate verification, 26 September 04:10 UTC

Root ran the four adjacent dashboard/state/provenance specs against the optimized
81-route build through the loopback HTTPS harness, with real Chromium and WebKit,
one worker and zero retries. The final run passed **27/27 in Chromium (21.9s)** and
**27/27 in WebKit (29.5s)**. EN/RU, 390/834/1440px dashboard layouts, actual-core
Quick/Standard/Deep recovery, historical missing provenance, validated-model
provenance, malformed provenance rejection, unchanged saved bytes after reopen,
no extra AI POST on reopen, race/cancel/timeout and retained previous results are
covered. API/source responses are fixtures; this is not live or cloud acceptance.

Two earlier runs in each browser are retained as failures, not hidden retries:
the new test's generic alert selector also matched Next.js's hidden route
announcer; its RU fixture then incorrectly supplied an EN evidence lease. Root
scoped the alert to the exact retained-result message and made the seeded lease
locale-specific, adding assertions on request locale and source locale. The
product's locale guard was correct and was not changed. Targeted RU Chromium
2/2 passed before both full 27-case runs. No assertions were skipped or weakened.

Root visually inspected the final EN1440 Chromium and RU390 WebKit recovery
screenshots: the answer, cards and localized headings are legible and contained,
with no overlapping/clipped content in these captures. Other card prose remains
synthetic fixture text; these images do not certify live content or translation.
Final root TypeScript/lint and diff check passed. Permanent CI now runs the two
new offline checks, and the new browser file is included in both the complete25
script and the product HTTPS suite. Artifacts are retained under
`artifacts/complete26-depth-{chromium,webkit}-r3`, with separate JUnit receipts;
prior r1/r2 failure artifacts are preserved. No external provider, operational
ledger, cloud data, control candidate, deployment or Production was changed.

### Selected building-part scope follow-up

Root's frozen A06 review (Museum Of The Future, `way/1054289435`) identified
`tag.building:part=yes` in the acquired evidence, while deterministic source facts
labelled the selected geometry's measurements as an unqualified footprint.
The model projection already admits this tag only through the exact joined
attribute receipt; this was a display/recovery scope loss, not absent model
evidence or a geometry-calculation defect.

For a positive source-bound `building:part` tag only, EN/RU source identity,
classification/initial brief, metric labels and deterministic focused recovery
now say building part, not the whole building/complex. Scoped identity and metric
claims reference the existing attribute receipt as well as their original
receipt. The part tag is first in the displayed attribute list, so the existing
six-attribute cap cannot hide it. Linked Wikidata remains explicitly complex
context, not selected-part measurements. No acquisition, geometry, numeric value,
classification predicate, source guard, schema, model or retry rule changed.
Already-valid model prose remains untouched; this is not a new guard against
every possible model-authored scope error.

Before product edits on `fcce2d6`, the new synthetic check failed `Source identity
must retain part scope`. After: `complete26-building-part-scope-check.mjs` PASS
131 groups, covering yes/typed roof, Q/S/D, EN/RU, five focused goals, linked
complex and standalone objects, museum parts without a whole-building tag,
six-attribute display cap, metric-value preservation, missing/mismatched receipt
negatives, generic recovery and valid-model-text preservation. One SHA-256
captured before editing proves byte-identical absent/no-tag source facts,
initial briefs and focused Q/S/D output. Rendering leaves source packs unchanged.

Adjacent PASS: full `test:point-to-object`, semantic-v6, content 114, depth
contract, focused-shape 9, screening-depth 42, validation-path copy 36, failure
telemetry check, climate 141, TypeScript and diff-check. Zero network calls.
This proves synthetic contracts, not fresh A06 acceptance. Root must repeat the
candidate browser/CI checks; historical results are not rewritten. Existing
length guards remain fail-closed for unusually long source text. This patch
does not establish what physical portion a mapped part represents or aggregate
it into a whole-building/complex measurement.

### Root building-part browser verification, 26 September 04:40 UTC

Optimized build on `39cc290963fcc0850910e8a7c1b2bcf0105ec424` passed (81 routes).
The new two-case part-scope browser spec uses real core output for identity,
initial brief, metric source facts and all three focused depths; unrelated card
prose and provider responses are synthetic. It verifies EN1440/RU390, unchanged
1,800 square-metre/180-metre values, explicit part-versus-complex scope, four
saved/reopen cycles with byte preservation, no replay, and distinct Q/S/D.

The first full runs failed after 12 passes in each browser because the new test
clicked every nested evidence summary as well as its intended reasoning toggle.
Root corrected only that selector to the direct-child summary and asserts its
unique cardinality. Final five-spec runs: **29/29 Chromium (27.1s)** and **29/29
WebKit (35.4s)**, one worker, zero retries. Both include one pure metric case and
28 browser cases. Prior failed `complete26-part-*-r1` artifacts remain; final
screenshots/JUnit are under `artifacts/complete26-part-*-r2`.

Root visually inspected EN1440 Chromium and RU390 WebKit captures: part scope,
source measurements and controls are contained/readable; synthetic English card
prose in the RU fixture does not certify live localization. CI permanently runs
the 131-group scope check and the new spec. It also runs the independent reviewed
97-group final-successor accounting check, which changes no operational ledger.
This local proof is not A06 live acceptance, full-matrix acceptance or release.

## Remaining limitations / root handoff

Fallback remains an explicitly deterministic evidence-bound decision aid, not
new research or financial feasibility. Depth differentiation alone does not
prove user utility. Unusually long source attributes can still fail the existing
900-character boundary rather than truncate or weaken validation.

Root must independently review/integrate, build the new candidate, rerun CI and
browser EN/RU saved/reopen/capture compatibility, then decide any separately
budgeted live checks. Do not relabel the c039fab A03 receipts or whole-matrix
acceptance as results of this patch. No push/deploy/paid execution occurred here.
