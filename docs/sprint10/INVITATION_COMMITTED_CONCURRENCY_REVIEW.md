# GeoAI committed invitation-concurrency review

**Review date:** 2026-09-18
**Repository:** `/private/tmp/geoai-sprint10-invitation-concurrency-20260918`
**Exact reviewed HEAD:** `ae9f9a004056e73133ca8bd3f47cfb8d3526d384`
**Committed-probe script SHA-256:** `3fe0478da647c6871b54b05b03fac9a01e483b2a048bdf67e5c989b8b56c90dd`
**Updated handoff SHA-256:** `57ee9249be18e9d1f51c8f83ffd587137599f84ba5764599ebbc405fefc71603`
**Decision:** **GO for the precise one-shot LOCAL committed invitation-concurrency evidence lane.** This is **not** hosted Supabase, live Auth/PostgREST, Preview, pilot, or Production acceptance.

## Authority boundary

`/private/tmp/geoai-committed-probe-authority.md` records a direct founder reply, exactly `да`, to retaining only fixed synthetic `9600…` fixture/audit evidence in local database `geoai_invitation_commit_probe`, without cleanup/reset/drop. Root verified the source turn metadata. The read-back has no item-level message object or per-message timestamp, so none is inferred.

That authority is sufficient for the already-completed bounded local retained-evidence probe described here. It did not authorize hosted calls, provider Auth/email, secrets/env changes, network access, destructive cleanup, trigger changes, `session_replication_role`, push/PR/merge, or Production.

## Commit-before-waiter proof

The new harness implements the required sequence, rather than merely testing the terminal states separately:

1. A control session takes a per-scenario advisory barrier.
2. Session A begins a transaction, runs the winning business RPC, emits `A_RPC_DONE`, and then waits on that barrier while retaining its business locks.
3. Session B begins the losing RPC. Before the barrier is released, the harness requires both `A ∈ pg_blocking_pids(B)` and at least one ungranted B lock. Thus B is already waiting on A, not started after A finishes.
4. Only after direct blocking is observed does the control session release the barrier.
5. Session A acquires the barrier and executes `COMMIT`; success requires the `A_COMMITTED` marker.
6. The already-blocked B resumes against A's committed state. Its command runs inside an exception subtransaction that catches only the scenario's exact expected SQLSTATE. Unexpected success raises `P0001`; any other SQLSTATE fails the psql session.
7. B commits the otherwise empty outer transaction, and an independent read-back checks winner state, one winner audit row, zero loser audit rows, and no loser membership write.

Because B was directly observed as blocked by A and cannot resume until A releases its database locks at commit, the sequence is an actual **A commit → already-blocked B terminal outcome**. It closes the precise gap left by the rollback-only harness for this local database.

## Four committed outcomes

| Scenario | A's committed result | B's required result | Durable read-back |
| --- | --- | --- | --- |
| accept vs revoke | invitation accepted; recipient org/project memberships created | `40001` | accepted state, memberships present, winner audit 1, loser audit 0 |
| revoke vs accept | invitation revoked | `23514` | revoked state, no recipient memberships, winner audit 1, loser audit 0 |
| accept vs accept | first accept wins; recipient org/project memberships created | `23514` | accepted state, one set of memberships, winner audit 1, loser audit 0 |
| issuer membership change vs accept | issuer project membership disabled | `42501` | invitation remains pending, issuer disabled, no recipient memberships, winner audit 1, loser audit 0 |

The handoff records direct blocker evidence and one waiting lock in each scenario, exact SQLSTATEs `40001 / 23514 / 23514 / 42501`, and deadlock counter `0 → 0`. The code fails if any process exits nonzero, reports `40P01`/`deadlock detected`, misses A's commit, misses B's exact SQLSTATE marker, or fails a per-scenario durable-state assertion.

## Winner/loser audit and retained state

The code checks each scenario's specific random request IDs immediately after completion and requires winner audit count `= 1` and loser audit count `= 0`. Its final aggregate independently requires:

- 4 winner audit rows and 0 loser audit rows;
- 2 accepted, 1 revoked, and 1 pending invitation;
- exactly 2 recipient organization memberships and 2 recipient project memberships, matching the two successful accepts;
- the issuer project membership disabled;
- exactly 6 fixed synthetic Auth users/profiles, 1 organization, 1 project, and 4 invitations in the fixed `9600…` evidence scope.

This proves durable winner state and loser atomicity for the four tested orderings in the local retained-evidence database. It does not prove request-ID replay/idempotency beyond these single attempts.

## One-shot and no-bypass review

- The harness is fail-closed on target identity: exact database `geoai_invitation_commit_probe`, role `supabase_admin`, PostgreSQL `17.6`, and absence of every fixed `9600…` user/profile/org/project/invitation/audit target before setup.
- A rerun against the retained database fails the pristine-target check. The script has no cleanup path and its failure message explicitly forbids automatic rerun or cleanup.
- Static inspection found no `DELETE`, `TRUNCATE`, reset/drop, `session_replication_role`, trigger disable/enable, or trigger alteration command.
- It snapshots the visible trigger definitions before setup and after all four races and requires byte-equal snapshots. Therefore the script supports “definitions unchanged during the probe” and “no bypass instruction in this harness.”
- The earlier out-of-contract `9500…` development cleanup remains separately disclosed. It is absent from the new `9600…` harness and is neither endorsed nor repeated here.

### Narrow evidence wording limitation

The script's trigger snapshot uses `information_schema.triggers` and does not read `pg_trigger.tgenabled`. It therefore does **not**, by itself, prove the handoff's additional phrase “0 disabled non-internal triggers”; a trigger disabled both before and after would retain the same visible definition. This is a documentation/evidence precision issue, not a defect in the four committed race outcomes. For exact reporting, use:

> The committed-probe script contains no trigger bypass/alteration and proves the visible trigger definitions were unchanged before versus after the probe. Trigger enabled-state count was not captured by the committed script.

Likewise, `network: "none"` and `publishedPorts: 0` are emitted as fixed environment metadata rather than obtained from a Docker inspection inside this script. They remain handoff/operator attestations, not script-derived assertions.

## Review limitations

**Root follow-up, 23:08 Moscow:** after the new direct founder authorization recorded above, a read-only exact-target check independently returned Docker network `none`, no published ports (`{}`), and `geoai_invitation_commit_probe|0|38` for database name / disabled non-internal triggers / total non-internal triggers. This confirms the current enabled state and container isolation; it does not add a before-probe enabled-state snapshot to the original harness. No fixture or trigger was changed.

- No raw JSON machine receipt is committed separately. The exact request IDs, timestamps, PIDs, lock count, and retained totals are preserved in the updated handoff; this review validates that the script would fail unless the described control flow and assertions passed, but did not independently query the retained database.
- JWT claims are injected into PostgreSQL under `SET LOCAL ROLE authenticated`. This tests the database `api` wrappers and authorization functions, not genuine Supabase Auth token validation, PostgREST/HTTP, pooling, browser sessions, or client retry behavior.
- Relation lists from `pg_locks` show expected relations held by A plus a direct A→B blocker; they are not a row-lock acquisition trace. Canonical function lock order remains a source-level property covered by the earlier harness.
- The evidence covers exactly four orderings. Create races, org/project status transitions, expiry crossing, organization/platform authority changes, and request retry/idempotency remain outside this lane.
- The intentionally retained database is evidence only and must not be reused as an application, CI, migration, or hosted environment.

## Gate separation

This review closes only the **precise local committed invitation-concurrency lane** at `ae9f9a004056e73133ca8bd3f47cfb8d3526d384`.

It does not reopen or qualify the already-completed development schema apply/API-only operator work, and it does not close the separate pending post-hash/privacy request. It also does not close live Auth, hosted PostgREST, Preview, real-user, email, Storage, pilot, or Production gates. Those require their own authority and evidence.

## Validation boundary

- Read the applicable `AGENTS.md`, direct-authority receipt, complete 584-line committed harness, updated handoff, exact commit diff, and relevant current Supabase review guidance.
- `node --check scripts/sprint10-invitation-committed-concurrency-check.mjs`: PASS.
- `git diff HEAD^ HEAD --check`: PASS.
- Worktree was clean at review time.
- No harness, Docker, SQL, database connection, Supabase/Vercel API, hosted request, Auth operation, cleanup, paid call, or source edit was executed.
- The only file written is this review.
