# Sprint 10 four-sprint live-evaluation budget contract

Status: candidate control for S1–S4 test execution. This contract does not initialize a real ledger, dispatch a provider request, read an API key, change a provider project, or authorize Production.

## Authority and invariant

The founder-authorized ceiling is one **USD 15 maximum across all four sprints, candidates, retries and repairs**. It is represented by one `GEOAI_FOUR_SPRINTS_2026_09_18` cycle-root ledger. The root has no daily counter and no current-candidate balance. A new date, Preview host, commit SHA, phase or request process therefore cannot reset the total.

Every top-level paid request has one immutable identity:

- unique `requestKey` (a retry is a new paid request and needs a new key);
- phase `S1`–`S4`;
- exact immutable candidate deployment host and 40-character commit SHA;
- route, depth, pinned prompt version and schema version.

The receipt copies that identity and the root `ledgerId`. Settlement must present the identical tuple. A host/SHA/phase mismatch, duplicate settlement or response arriving after an `unknown` settlement is rejected without changing history.

## Reserve-before-dispatch sequence

The caller must use an explicit absolute private directory and an explicit ledger filename; there is no default or environment-derived path.

1. Create the empty root exactly once with `createSprint10SpendLedgerFile`. Creation is exclusive (`O_EXCL`), writes mode `0600`, and fails if any file—including corrupt evidence—already exists at that path.
2. Verify the candidate deployment host and exact SHA outside this helper against immutable health/build evidence.
3. Call `reserveSprint10SpendFile` immediately before dispatch. The operation takes the root lock, re-reads and strictly validates the ledger, reserves USD 1.20 for Analyse or USD 0.30 for Create, atomically persists the new receipt, and only then returns permission to the caller. The reservation includes the route's one permitted internal repair attempt.
4. Dispatch only when step 3 returned a persisted receipt. An external retry/rerun repeats step 3 under a new request identity and consumes another reservation.
5. Settle with `settleSprint10SpendFile` only from a complete provider response and result hash. On timeout, cancellation or unreadable response after possible dispatch, call `markSprint10SpendUnknownFile`.
6. Any `unknown` receipt retains its full reservation and blocks every later reservation across S1–S4 until a separate, explicitly reviewed reconciliation mechanism exists. This candidate intentionally offers no automatic reconciliation or reopening.

Multiple in-flight requests may reserve concurrently. The exclusive cycle lock serializes the persisted reservations, so their combined settled/reserved commitment cannot pass USD 15. Settlement releases only unused reservation headroom; it never creates a new cap. The root keeps at most 64 receipts, which is deliberately above the 12-call matrix but bounded for reviewed retries.

## Telemetry and price validation

Settlement accepts only a complete one- or two-attempt OpenAI trace. Every attempt must include a unique provider request ID and integer ordinary-input aggregate, cached-input, cache-write, output and total token counts. Cached plus cache-write tokens cannot exceed input tokens. Aggregate fields must equal the attempt sums, and the second attempt—when present—must be `repair`.

The guard independently recomputes each attempt and the total at the Standard short-context rates already pinned in the exact candidate code and rechecked in the September 18 cost research:

| Model | Ordinary input / 1M | Cached input / 1M | Cache write / 1M | Output / 1M |
| --- | ---: | ---: | ---: | ---: |
| GPT-5.6 Luna | USD 0.20 | USD 0.02 | USD 0.25 | USD 1.20 |
| GPT-5.6 Terra | USD 2.00 | USD 0.20 | USD 2.50 | USD 12.00 |
| GPT-5.6 Sol | USD 4.00 | USD 0.40 | USD 5.00 | USD 20.00 |

Understated attempt or aggregate cost, missing cache fields, fractional tokens, incomplete attempt traces, duplicate provider request IDs, over-limit tokens, wrong prompt/schema, wrong route/depth profile, unsupported model/reasoning combinations, tools, or `store !== false` all fail closed. The accepted input bounds stay below the documented long-context price tier: 81,000 tokens for Analyse and 17,000 for Create. A valid cost must also remain within its conservative top-level reservation.

The current compatible profiles are enforced, including Luna/Terra/Sol Quick Analyse rules, Sol Deep rules, Create Quick Terra-or-higher, Standard/Deep Create Sol, and the actual Create Quick repair behavior (same Terra-or-higher model with medium reasoning).

## File integrity and concurrency

The private root must be a canonical, non-symlink directory with no group/world permissions (`0700`). The ledger must be its direct child. Path traversal, symlinked roots or ledgers, hard-linked ledgers, non-regular files and non-private ledger permissions are rejected.

The root lock and ledger are `0600`. Reservations and settlements use exclusive lock creation, strict read-back, a private exclusive temporary file, file `fsync`, atomic rename and directory `fsync`. The lock waits for a bounded five seconds; a stale lock is never broken automatically. Concurrent reservation and settlement tests execute in separate Node processes.

The lock is global only for processes sharing this canonical filesystem path. It is not a distributed database lock across different hosts or volumes. A live runner must therefore have one writer location/shared volume. Creating another ledger at another path cannot be prevented by a filesystem helper; the operator must preserve the single canonical path as part of the evidence package. A distributed runtime/customer quota remains separate future scope.

## Verification

Run the free local contract check with Node 24.19:

```text
/Users/mmgolikov/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --experimental-transform-types scripts/sprint10-live-budget-check.ts
```

The check uses only `mkdtemp` fixtures. It covers pinned-rate telemetry, repairs, malformed and understated usage, private creation, corruption, path escape, symlinks, exact USD 15 accumulation across different candidate SHAs and phases, unknown-charge blocking, mismatched SHA settlement, duplicate/late settlement, concurrent reservations at the ceiling, and a two-process settlement race. It does not create the real cycle ledger or call OpenAI.

This guard controls the bounded test-run ledger only. It does not replace application-level multi-user quotas, provider billing read-back, a provider monthly hard limit, product-quality/factuality review, or immutable deployment health verification. Those remain distinct gates.
