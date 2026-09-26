# COMPLETE26: reviewed continuation, offline contract

Change request: support exactly one reviewed continuation after the terminal pre-AI acquisition failure at A05-Q, without deleting the previous acceptance epochs or resetting money, attempts, receipts or claims. This change implements a contract; it does not apply it to the operational ledger or authorize dispatch.

## Boundaries

- Predecessor: candidate `1723d95fe80541f6d8b03381683b13c895e3751f`, host `geoai-3v5es0af0-geoaidev.vercel.app`, epoch `COMPLETE26_FINAL_REVALIDATION`, generation 268, cumulative receipt count 130. Existing `archivedAcceptanceEpoch` and `finalTransitionArchive` are required; `continuationTransitionArchive` must be absent.
- Terminal proof: exactly A01–A04 in Q/D/S order completed and attempted (12), A05-Q stopped at `acquisition_pre_ai`, `paidDispatchStarted: false`, `fullyRetired: true`, nonzero cause-review hash. Exactly 12 settled HTTP-200 AI receipts belong to that predecessor epoch; an additional reserved, unknown or settled A05 dispatch cannot fit this boundary.
- The new exact candidate must differ from every archived candidate. Seven nonzero evidence hashes bind the terminal batch, retirement, new batch plan, CI and Preview. Root must validate the actual evidence contents, candidate identity, freshness, retirement and reviewed cause before making the exclusive claim. Hash-shaped values alone do not prove any of those facts.
- Global USD 15 ceiling and cumulative capacity 201 remain unchanged. Estimated/reserved cost and original historical 93 unknown accounting are retained. Capacity is not permission to spend or run additional cases. Every request still passes the existing monetary reserve and unresolved-charge gates.

## API and persistence

`startComplete26ContinuationEpoch(ledger, contract)` validates the complete predecessor, returns a clone with generation +1, and stores its exact previous epoch plus the reviewed contract in `continuationTransitionArchive`. Earlier archives, receipts, conservative charges and opening checkpoint remain identical. The new epoch is `COMPLETE26_REVIEWED_CONTINUATION`, exported as `COMPLETE26_CONTINUATION_EPOCH_ID`.

Contract schema: `geoai.complete26.reviewed-continuation.v1`. `terminal` has exactly `status`, `completedCaseIds`, `attemptedCaseIds`, `stoppedCaseId`, `failureStage`, `paidDispatchStarted`, `fullyRetired`, `causeReviewSha256`. Existing successor-opening and batch validation consume the new archive without a batch-coordinator change.

`startComplete26ContinuationEpochFile(privateRoot, ledgerPath, contract, expectedLedgerSha256, exclusiveClaimPath)` only accepts `cycle-ledger.json` under the validated private root and `.complete26-continuation-epoch-claim.json` alongside it. Root's operator creates that claim once with exclusive creation. Claim schema `geoai.complete26.reviewed-continuation-epoch-claim.v1` binds `transitionSha256`, `ledgerPath`, and `expectedLedgerSha256`. Existing or unverifiable runner leases, including dangling links, block application. Under the existing ledger lock, exact raw-byte CAS and canonical predecessor validation precede atomic replacement/read-back. The claim is retained, and repeat application fails; this helper never removes an old claim or resurrects a retired account.

The original ledger's byte hash is retained in the contract; the ledger file is necessarily reserialized when the append-only logical transition is atomically written. The previous canonical object and every historical record remain bound and unchanged. Raw snapshots/evidence retention is the external operator's responsibility, not a new secret-copy operation here.

## Offline verification

Run with Node 24: `node --experimental-transform-types scripts/complete26-continuation-ledger-check.mjs`.

The new check exports `syntheticContinuationPredecessor`, `syntheticContinuationTransition`, and `syntheticContinuationOpening` for offline operator tests. They reproduce the 130 / 268 / 12-case structural boundary with deliberately synthetic costs and hashes; they do not reproduce or read actual private spending or proof contents. Import also executes the existing 73-check synthetic successor suite.

New suite: 112 checks. Full unchanged 58-case matrix consumes 53 receipts, reaching 183; synthetic Singapore Create and initial Analyse reach 185, below 201. Separate negatives cover 202nd receipt, USD exhaustion independent of capacity, replay, duplicate identities, timestamps, malformed/tampered historical archives, terminal/cause/retirement evidence, new unresolved spending, private-file permissions, claim mismatch, exact raw-byte CAS, ordinary/dangling runner leases and unchanged file bytes on denial.

Adjacent unchanged checks passed: original live-budget contract; conservative accounting; COMPLETE25 recovery/concurrent reservations; standing-authority 56; successor 73; final successor 97; successor batch 34; batch coordinator 58 cases/53 receipts with 7 stop faults and 28 shape negatives; lifecycle 12 cases/170 strict environment checks; retirement 15 cases. TypeScript validation is a separate repository gate.

No operational ledger read/write, network, Auth, provider, browser, cloud, deployment, or paid call is part of this work. No actual new epoch has been opened. Root reviews/integrates this code and independently validates new exact-candidate CI/Preview and the external one-shot operator before any operational action.
