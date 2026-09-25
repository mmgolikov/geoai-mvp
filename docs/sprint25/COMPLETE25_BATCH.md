# COMPLETE25 bounded two-persona batch

This is an offline-tested operator seam, not hosted acceptance. Root alone may execute it after reviewing the final candidate, authority, concrete source bindings and private plan. It neither initializes nor repairs the operational ledger. Historical opening remains $7.3097465 / 90 receipts, the global cap $15, receipt limit 160, and the historical raw-journal loss remains explicit.

## Exact operator inputs

Keep the existing `sprint10-hosted-auth-probe.mjs` hosted-Auth and protected-Preview approvals, runtime-only credentials and deployment receipt. Set the old live-journey seam to `disabled`; omit old per-case scope/approval and all `GEOAI_QUALITY20_*`, `GEOAI_SPRINT10_*` and case-attempt-token inputs. The batch creates narrow child settings itself.

Additional settings:

| Name | Required value |
| --- | --- |
| `GEOAI_COMPLETE25_BATCH_MODE` | `run-reviewed-complete25-58-case-two-persona-batch` |
| `GEOAI_COMPLETE25_BATCH_PLAN_PATH` | Canonical private regular 0600 JSON file |
| `GEOAI_COMPLETE25_BATCH_PLAN_SHA256` | SHA256 of those exact bytes |
| `GEOAI_COMPLETE25_BATCH_APPROVAL` | `complete25-batch:<ledger UUID>:<Preview host>:<40-char SHA>:<plan SHA256>` |
| `GEOAI_COMPLETE25_BATCH_OUTPUT_DIR` | Existing canonical private 0700 directory, new for this one run |
| `GEOAI_HOSTED_AUTH_PROBE_ACTIVE_PERSONA_RECEIPT_PATH` | Existing reviewed checkpoint contract: new file in a private directory |
| `GEOAI_HOSTED_AUTH_PROBE_LIVE_LEDGER_ROOT/PATH/EXPECTED_LEDGER_ID` | The existing exact canonical private ledger and UUID |

Run the existing hosted probe with Node 24, no arguments. No new wrapper accepts commands or shell fragments. Do not print runtime inputs. Approval is bound to the frozen plan, not authority to fill missing sources or change a candidate.

The plan's exact top-level fields are `schemaVersion: geoai.complete25.batch-plan.v1`, `execution: {commit, origin, deploymentId}`, `ledgerId`, `groups`. Every group has exactly `{id, acquisition, requests}`. `COMPLETE25_BATCH_GROUPS` exports the sole accepted order: A01–A08 Q/D/S triplets, A09–A12, F01 plus FA01–03 through F05 plus FA13–15, then the ten registered Create rows. Every request has exactly `{caseId, query, locale:"en", question, role, scenario, goal}`. Triplet non-depth inputs must match. Each acquisition is the existing v1 Analyse plan or v2 Find/Create plan described in `COMPLETE25_NONPAID_ACQUISITION.md`; Find requires the explicitly approved bounded viewport envelope. Create `question` is the exact approved generation prompt. No inferred founder AOI or substituted source identity is permitted.

## Lifecycle and evidence

1. Validate all 58 intended rows and acquisitions, the fresh exact COMPLETE25 epoch, ledger identity and budget. The batch requires zero new receipts/attempts at entry: this is not a resume or retry mechanism.
2. Exclusively create `batch-intent.json` before either persona creation. Existing marker/output stops the run. The existing checkpoint records potential creation ambiguity.
3. Provision exactly A/B once, verify sessions/isolation, run the existing protected Preview auth seam once. No other accounts or email delivery are introduced.
4. Wait before each acquisition for route capacity and a usable source window. Initial quiet time is at least 601 seconds; at most four dispatches per route per rolling 601 seconds. Start a source group only in the first four minutes of a 15-minute clock window. Sleeps are chunked to at most 60 seconds; total coordinator deadline is six hours. This does not authorize IP/account rotation or retries after 429.
5. Sequentially run the fixed nonpaid acquisition child, verify its immutable receipt against its approved plan, then write a new immutable full-58-row manifest. Existing bindings cannot change. Future rows remain explicitly unbound until acquired; no denominator is removed. Each group keeps one acquired source snapshot through its dependent Q/D/S or F/FA cases.
6. Run existing per-case children only. The existing runner registers attempts before browser execution, validates request bodies/source hashes before atomic paid reservation, and settles telemetry. Exactly one new receipt is required per paid case, none for Find. Every prior receipt/attempt must remain unchanged; successful new IDs would be 91–143. No whole-batch reservation is made: reserve/settle per case, never relax the $15 cap.
7. Any failure, inconclusive/429, unknown/reserved charge, altered ledger, stale source window, mismatch or reporting error stops later children. Parsed failure receipts are retained when available. No automatic re-acquisition after an attempted case, candidate switch, skip, retry, continuation or new epoch is implemented.
8. The outer `finally` retires both personas even when claiming, creation, authentication, acquisition or batch work throws. Retirement failure produces `FAIL_ACTION_REQUIRED`; it never becomes a batch PASS. Legacy single-child once-only behavior remains available and unchanged. Credentials stay in memory/whitelisted child environment; no Admin or publishable key is forwarded to a browser child or persisted.

Output files are private, bounded, exclusive writes with fsync/read-back: `batch-intent.json`, numbered acquisition plans/receipts/manifests, per-case parsed receipts, and `batch-result.json`. Analyse response captures use the existing validated public-evidence exporter. Final `geoai.complete25.hosted-batch-receipt.v1` includes the batch result and existing retirement proof. `cloudPersistenceAccepted:false` remains explicit: these browser-local checks do not prove saved cloud copies/reopening or grant account-content access.

## Verification and limits

`complete25-batch-check.mjs`: synthetic full 58-case sequencing, 27 acquisitions, 53 settled receipts 91–143 using real in-memory accounting helpers; immutable manifest history; pacing; five fail-stop paths; 28 malformed plan/runtime/source cases. Acquisition payloads in the full sequencing simulation are injected; separate acquisition tests validate actual payload/parser contracts.

`complete25-batch-lifecycle-check.mjs`: 12 injected lifecycle outcomes, including creation/auth/preview/batch/checkpoint/retirement failure; retirement attempted twice on every path; at most two creations and one batch entry; old invocation state cannot be reused; 170 strict fixed-child/environment assertions. Existing hosted-auth live/probe regressions cover legacy behavior and checkpoint ambiguity.

Offline PASS does not establish source availability, complete58 runtime acceptance, sufficient remaining spend for every actual answer, or account cleanup in a real run. Process death/SIGKILL or host loss cannot guarantee in-process `finally`; durable active-persona checkpoint and exclusive intent remain for manual root reconciliation, never automatic restart. Other traffic on the same IP may consume rate capacity: a resulting 429 stops, not retries. A slow source/provider/browser may exhaust a lease; that stops without rebinding. Root must review the exact real inputs before freezing/dispatching.
