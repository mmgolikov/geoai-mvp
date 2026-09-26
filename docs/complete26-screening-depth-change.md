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

## Remaining limitations / root handoff

Fallback remains an explicitly deterministic evidence-bound decision aid, not
new research or financial feasibility. Depth differentiation alone does not
prove user utility. Unusually long source attributes can still fail the existing
900-character boundary rather than truncate or weaken validation.

Root must independently review/integrate, build the new candidate, rerun CI and
browser EN/RU saved/reopen/capture compatibility, then decide any separately
budgeted live checks. Do not relabel the c039fab A03 receipts or whole-matrix
acceptance as results of this patch. No push/deploy/paid execution occurred here.
