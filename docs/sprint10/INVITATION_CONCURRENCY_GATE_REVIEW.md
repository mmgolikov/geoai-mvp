# GeoAI invitation concurrency gate review

**Review date:** 2026-09-18  
**Repository:** `/private/tmp/geoai-sprint10-invitation-concurrency-20260918`  
**Exact reviewed HEAD:** `cd6434078e15ceb6130ddbefa8113258ef4e8128`  
**Files reviewed:** `scripts/sprint10-invitation-concurrency-check.mjs`, `docs/sprint10/INVITATION_CONCURRENCY_HANDOFF.md`, `/private/tmp/geoai-invitation-concurrency-status.md`, and the exact migration functions invoked by the harness.  
**Gate decision:** **GO for the scoped canonical development upgrade; NO-GO for claiming full committed two-session invitation-race acceptance.**

## Independent judgment

The lawful evidence is a genuine **partial concurrency pass**, not a failed test and not a complete committed-race receipt. It proves that the four selected command pairs converge on the intended shared scope locks, that session B is directly blocked by session A, that B completes after A rolls back, and that these executions are bounded and deadlock-free in the isolated local database. A separate rollback-only matrix proves the intended business error branches once the first terminal mutation is visible.

No concrete P1 correctness or safety defect was exposed that should block applying the already-reviewed canonical migration set to the approved development target. The missing commit/waiter lane is an acceptance-evidence gap. It must remain open, but absence of that lane is not itself evidence that the migration is unsafe or that a race is broken.

This judgment does not authorize the upgrade, hosted execution, a new database scope, or any Production action.

## What the four two-session tests prove

All four tests use normal `api` wrappers under the `authenticated` database role with synthetic JWT claims. In each case session A completes its business RPC, remains inside the transaction while held at a test-only advisory barrier, and therefore retains its database locks. Session B starts the competing RPC. The harness then observes both `A ∈ pg_blocking_pids(B)` and an ungranted lock for B; it does not infer blocking from elapsed time. The barrier is released, A rolls back, B succeeds and rolls back.

1. **accept vs revoke:** a successful uncommitted accept retains the organization/project/invitation scope locks; revoke cannot pass concurrently and succeeds after accept is rolled back.
2. **revoke vs accept:** a successful uncommitted revoke retains the same canonical scope locks; accept cannot pass concurrently and succeeds after revoke is rolled back.
3. **accept vs accept:** the first successful uncommitted accept serializes a second accept for the same invitation; the second succeeds after the first is rolled back.
4. **issuer membership change vs accept:** disabling the issuer through `api.set_project_member` retains organization/project/project-membership locks; invitation acceptance is blocked on the shared scope and succeeds after the disablement is rolled back.

For both documented exact-tree runs, the handoff records 4/4 direct blocking observations, one ungranted waiter lock per scenario, bounded completion, and database deadlock counter `0 → 0`. The script also rejects process output containing `deadlock detected`/`40P01`. After both sides roll back, it verifies invitations remain pending, no recipient membership or request-specific audit row remains, and fixture cleanup leaves zero scoped residue with triggers active.

### Precision limits of those tests

- They exercise **rollback/waiter-success ordering only**. They do not show B's outcome after A commits.
- The `pg_locks` relation list proves that A accessed/held locks on the expected relations; it is not a trace of exact row-lock acquisition order. The organization → project → invitation order is separately guarded by static inspection of the exact migration source.
- “No partial write” is established as zero state after the complete rollback-only scenario. It is not a committed atomicity receipt, nor a before/after inspection of every failed terminal branch.
- The JWT is injected as database request claims. This is authenticated-RPC authorization logic exercised inside PostgreSQL, but it is not a real Auth token, PostgREST/HTTP, connection-pool, or browser session.
- The handoff records two run summaries, but raw machine receipts are not committed as separate artifacts. The result is reviewable through the deterministic harness and committed attestation, not independently replayed in this gate review.

## What the separate SQLSTATE matrix proves

Each case runs sequential business commands in one outer transaction. The first mutation remains visible to the second command; the second command must raise the exact SQLSTATE, or the harness fails. The whole transaction is then rolled back.

| Visible first mutation | Second command | Proven terminal branch |
| --- | --- | --- |
| invitation accepted | revoke with stale version | `40001` stale invitation version |
| invitation revoked | accept | `23514` invitation is not pending |
| invitation accepted | second accept | `23514` invitation is not pending |
| issuer project membership disabled | accept | `42501` issuer no longer has assignment authority |

This matrix proves that the current functions reject the four terminal states with the intended contract and that unexpected success does not pass the test. It does **not** prove that a separately connected waiter, whose top-level call began before A committed, observes exactly the same branch after waiting. Combining the serialization receipt with this matrix makes the intended result well-supported, but it is still an inference rather than full committed-race evidence.

## P1 gate assessment

**No blocking P1 found for the scoped canonical development upgrade.** In particular:

- accept and revoke implement the same canonical organization → project → invitation lock order;
- issuer membership mutation and acceptance share organization/project serialization points;
- the tested inverse acquisition orderings produce direct blocking rather than a deadlock;
- terminal status, optimistic-version, and current-issuer-authority guards exist and return explicit SQLSTATEs;
- no test showed concurrent success past a held conflicting scope, a deadlock, a timeout, a wrong terminal SQLSTATE, or state escaping rollback.

The append-only audit/FK interaction is real: after a committed business mutation, ordinary deletion of referenced synthetic parents attempts `ON DELETE SET NULL` updates that the append-only trigger rejects. This prevented a self-cleaning committed probe. It does not demonstrate invitation corruption and does not affect the forward migration apply itself. It should be tracked separately as a retention/hard-deletion contract question; it becomes release-blocking only if the accepted product/operations contract requires hard deletion of audited organizations, projects, or profiles.

The initial prototype's out-of-contract fixture cleanup bypass is disclosed in the handoff. It is not evidence for the final result, is not endorsed, and must not be repeated in CI, hosted development, or Production. The final harness contains no such bypass.

## Remaining acceptance gaps after the scoped upgrade

1. **Committed winner/waiter outcome:** A commits while B is already blocked; B then returns the expected `40001`, `23514`, or `42501`, with exactly one winner's state and audit event and no loser-side write.
2. **Exact upgraded development target:** repeat only an authorized, non-destructive acceptance lane against the exact canonical dev schema/configuration after upgrade; local PostgreSQL 17.6 evidence is not hosted-dev evidence.
3. **Real request boundary:** valid Supabase Auth JWT through the exposed `api` schema/PostgREST (and browser flow where applicable), not injected SQL claims.
4. **Pool/retry behavior:** verify that connection pooling and the caller's handling of `40001` do not convert a correct database conflict into duplicate mutation, unsafe automatic replay, or misleading success.
5. **Committed audit/idempotency:** prove exactly one durable invitation/membership result and exactly one correctly linked append-only audit event for the winning request; verify request-ID retry semantics separately.
6. **Broader race inventory:** the four scenarios do not cover create-vs-accept/revoke, organization status changes, project status changes, organization/platform authority changes, expiry crossing, or scope deletion. Those remain risk-based follow-up cases, not implied failures.
7. **Evidence artifact:** retain a non-secret machine receipt for future authorized runs so timestamps, blocker PIDs/locks, SQLSTATEs, durable row counts, and audit counts can be independently reviewed.

## Treatment of the denied committed-probe lane

The worker's proposed new committed-probe database was rejected because it expanded beyond the platform-authorized database scope. No query or mutation reached that database and no probe file was created. This review did not retry, reframe, or bypass that denial. Lack of permission for that lane must not be relabeled as a product failure, and the current partial evidence must not be relabeled as the missing committed receipt.

## Validation and boundary

- Confirmed repository HEAD exactly `cd6434078e15ceb6130ddbefa8113258ef4e8128`.
- Confirmed harness SHA-256 matches the handoff: `c7b372948684ff76ccb6ff2441d53837ceab300073047c1ccd6c5e1dd94dc52e`.
- Inspected the complete harness, handoff, status note, acceptance/revocation functions, issuer-authority check, and project-membership mutation lock order.
- Checked the current official Supabase changelog as required by the Supabase review workflow; no current platform breaking change alters this PostgreSQL locking assessment.
- Did not execute the harness, SQL, Docker, a database connection, Supabase/Vercel API, hosted request, Auth action, paid action, or any source edit.
- The only file written is this review.
