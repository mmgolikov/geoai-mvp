# COMPLETE25 accounting recovery and acceptance epoch

Founder explicitly approved on 25 September 2026: “Да, восстановить учёт и повторить тесты в пределах $15”. The approval covers loss recovery and a fresh full-matrix rerun, within the existing USD15 total. It is not additional money or automatic retries.

The raw historical journal was lost with temporary storage. The checkpoint carries forward USD7.3097465, generation185 and90 historical receipts. Its five previously approved full-reserve unknown charges remain included; their actual provider costs are still unknown. No historical receipt, telemetry, request-key index or old raw audit has been reconstructed. The state/HANDOFF and freshly retrieved Confluence26574901v32 envelope hashes are pinned in the checkpoint and helper.

Checkpoint identity is SHA-256 of `JSON.stringify(JSON.parse(checkpointBytes))`, preserving the checked-in key order: `0a1ddb486bb4a1c99ded5e4e0ec9f5d056d61359158c8837b33f82fa5f8adfbf`. Both the constant hash and separate artifact must match. Source artifact hashes are of their original bytes, not canonical JSON. Missing or changed evidence blocks initialization.

## Root-only initialization after review

No operational ledger is created by importing the helper or running the offline checks. `createComplete25RecoveryLedgerFile` requires the exact approval reference, all four evidence paths, a recovery time and the final frozen candidate commit/Preview host. Root must use one durable private directory outside Git: project `operations/complete25-private` (0700), with `cycle-ledger.json` (0600). Existing path, link, lock and file validation remain enforced. Existing ledger or `.complete25-recovery-initialized.json` blocks initialization. The marker deliberately survives a failed initialization: do not delete it or start a second ledger to repair an interrupted write; root must inspect/recover the exact first initialization.

Root must preserve durable private backups after changes, keep the canonical path unique across all workers and never switch to a stale temporary journal. A subsequently discovered historical journal is read-only evidence until explicitly reconciled. The helper cannot defend against a user deleting the entire ledger directory, replacing code/constants or arbitrarily rewriting all private files; this is controlled local accounting, not tamper-proof external storage.

## Accounting and replay rules

- Same cycle ID/ledger UUID; total charge = opening USD7.3097465 + new settled estimates/full reserves. Ceiling remains USD15. Next receipt is91 and reservation advances spend generation185→186. Settlement advances it→187.
- Total receipt capacity includes the historical90:160 maximum,70 available. The unchanged54-case catalogue has49 paid cases; one pass reaches139 receipts, before any other approved scopes. Remaining monetary headroom USD7.6902535 is not a guarantee the whole acceptance matrix can finish.
- One COMPLETE25 epoch is bound to the final commit and host before paid dispatch. There is no epoch reset, new-candidate override or automatic retry mechanism. A future revision requires a separately reviewed explicit decision, preserving this journal and all failures.
- All54 catalogue case IDs retain their denominator. The runner appends an attempt before each actual browser run after successful discovery, including zero-paid Find. The record survives failure, early source failure or a crash. Its current execution token permits only that browser execution's pre-reservation check; a second runner cannot re-register the case. New paid Q20 reservations require a matching registered attempt, and a second receipt for the case is rejected atomically even with a different manifest.
- Attempt registration has its own `acceptanceRevision`; it does not create a fictional financial event or increment spend generation. PASS/FAIL evidence remains in the actual run receipt. A registered attempt alone never proves PASS.
- Every paid request atomically reserves before dispatch. New unknown or outstanding reserved receipts block further paid requests. Conservative accounting for a new unknown requires its own exact founder approval and cannot alter the opening balance.
- Runner baseline records raw new-array length separately from global last receipt ID, prefix hash, generation and opening hash. Reports include only actual new receipts. The historical90 are never projected as current acceptance evidence.

Regression validation: run `scripts/complete25-ledger-recovery-check.mjs` and existing budget, conservative accounting, frozen-case and live-runner offline checks with Node24. These are local guard tests, not live API acceptance or evidence that the paid lane has resumed.
