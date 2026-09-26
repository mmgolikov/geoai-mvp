# One bounded final-candidate accounting transition

Status: offline implementation only. No operational transition, dispatch, new approval, hosted action or acceptance is asserted.

## Why this exists

The historical-inclusive capacity remains 160 for every legacy/current ledger. The first successor is intentionally one-shot and cannot be reused. After a complete current run the planned count is `90 + 3 + 53 = 146`. One final full catalogue (58 cases / 53 paid application-request receipts), then one Singapore Create extra and one initial Analyse extra would require 201 receipts. Cloud/local reopen checks consume no paid receipt. This arithmetic is not actual spend or a guarantee of USD15 sufficiency; internal provider attempts are not separate application receipts.

## Exact new contract

`Complete26FinalSuccessorContract` in `tests/e2e/helpers/sprint10-live-budget.ts` has schema `geoai.complete26.final-successor-transition.v1`, epoch `COMPLETE26_FINAL_REVALIDATION`, and receipt ceiling exactly 201. It binds:

- The actual previous raw and validated canonical ledger SHA256, generation, receipt count and accounted USD, all captured after terminal cleanup, never restamped/backdated.
- The existing COMPLETE26 candidate `c039fab32cfed370761a2849c89725f614f03e63` / `geoai-1476jrp2s-geoaidev.vercel.app`; one distinct reviewed next candidate/host, not an invented future deployment.
- The terminal batch plan/result, fully retired hosted receipt/persona checkpoint, new batch plan, new protected Preview receipt and green CI receipt hashes.
- Terminal `PASS` or `FAIL`, exact reported completed/attempted case IDs. PASS requires all 58 attempts and 53 current settled HTTP200 receipts. FAIL requires a non-null cause-review proof hash, not an acceptance claim. The operator must read and verify the actual proof contents; hashes alone do not establish retirement, CI or acceptance.

Opening count must be actual, within 93–146; no extras may have run on the predecessor. No active reservation or unresolved charge permits the transition. Receipt93 remains unknown with its existing conservative full-reserve charge. A subsequently failed receipt must likewise remain in history and be explicitly resolved under existing authority before transition, never rewritten as zero. All completed paid cases need their successful settled receipts; an unknown/failed case cannot be claimed completed.

## Append-only accounting and compatibility

The existing `archivedAcceptanceEpoch` is preserved unchanged. Exactly one `finalTransitionArchive` stores the COMPLETE26 epoch, contract and canonical contract hash. All receipts/IDs, source identities, costs, conservative charges, opening90 checkpoint and USD15 ceiling remain unchanged. Generation advances by one. The new active epoch has zero attempts: old PASS is not final-candidate coverage.

The parser reconstructs and validates the exact prior ledger (including its original archive) against its canonical hash. It validates all receipt ownership/date boundaries across three epochs and global request/attempt uniqueness. A second final transition is forbidden. `sprint10LedgerReceiptCapacity` returns 201 only for a fully validated final archive; legacy summaries stay160 and malformed extensions fail. Parser, reservation, frozen-case and runner/batch headroom gates use the same effective capacity. Existing cash reservations and unknown-charge stops are unchanged.

`complete26SuccessorOpening` now returns the *active* validated transition, including the final transition when present. The existing explicit `GEOAI_COMPLETE26_SUCCESSOR_TRANSITION_SHA256` batch opt-in must match that active hash. An old successor hash cannot start the final batch. Initial legacy batch opening remains unchanged. This deliberately does not make an old external operator suitable for the final transition.

## Root-only execution seam still required

This change exports `startComplete26FinalSuccessorEpoch` (pure) and `startComplete26FinalSuccessorEpochFile(root, path, contract, expectedRawSha, exclusiveClaimPath)` (locked CAS). No import executes them. A separately reviewed external operator must, before claiming:

1. Verify the current batch is terminal, both personas fully retired, terminal counts/case IDs/cause review agree with the actual ledger and receipts. Preserve originals. Do not touch a running batch or steal any surviving runner lease.
2. Verify clean exact final HEAD, its green CI, protected Preview deployment/host, actual fresh Preview receipt, and reviewed unchanged 58-case/12-identity plan. Acquire fresh source leases normally; Q/S/D share each frozen source pack. Old candidate evidence cannot be relabelled.
3. Verify actual remaining USD15 headroom, not the historical opening balance. Keep atomic per-request reservation/settlement/unknown accounting. Insufficient money stops; journal space is not spend permission.
4. Create separate private output/review/operator claims and fixed private `.complete26-final-successor-epoch-claim.json` using O_EXCL. Its exact four keys are `schemaVersion: geoai.complete26.final-successor-epoch-claim.v1`, `transitionSha256`, absolute `ledgerPath`, `expectedLedgerSha256`. Hash the contract using SHA256 of JSON.stringify, not sorted JSON. Never reuse/delete old claims.
5. Call the file transition once with the exact original raw SHA under the existing ledger lock. Missing/foreign/symlink runner leases, stale CAS, claim mismatch and repeat transition fail closed. The claim remains on failure; no automatic retry or resume.
6. Explicitly dispatch the complete new 58-case batch once. Defer cloud, Singapore Create and initial Analyse extras until this final candidate; repin/review their external gates separately. Preserve all former attempts and results, including failures. No receipt201 means acceptance automatically; content, visuals, retirement, cloud and release gates remain separate.

The operator is not implemented here; no authority to execute it is inferred. Root review/dispatch remains mandatory. No changes to evidence/Auth controls or the USD15 allowance.

## Offline verification

Run Node24 with `--experimental-transform-types scripts/complete26-final-successor-check.mjs`. All fixtures/proof hashes are synthetic. This checks146→199→201, denial202, legacy160, old-history preservation, PASS/FAIL predicates, archive/hash/generation tampering, duplicate request/case/attempt, backdating, active unknown/reservation, USD15, claim collisions, stale raw CAS and regular/dangling runner leases. Temporary private fixture files are isolated and removed; no operational ledger, secret, network or provider access is used. Existing successor, recovery, batch, budget and runner checks must also remain unchanged and pass.
