# Sprint 10 Invitation Concurrency Handoff

Status: PARTIAL PASS — deterministic serialization and conflict semantics proven; combined commit/waiter terminal-state run blocked by append-only cleanup contract

## Authority and target

- Owned branch: `codex/sprint10-invitation-concurrency-20260918`
- Candidate base: `10d994d5864d96f22f2f829e747f1919e04f0fa8`
- Local Docker context: `colima-geoai-sprint10`
- Container: `geoai-sprint10-restore`
- Container network: `none`
- Published ports: `0`
- Sole database: `geoai_invitation_concurrency`
- PostgreSQL: `17.6`
- Transport: local Unix socket `/var/run/postgresql`
- Database role: `supabase_admin`
- Business calls: `authenticated` plus synthetic AAL1 JWT claims through the public `api` wrappers
- Hosted systems, external APIs, Auth providers, email providers and customer data: not used

## Harness

File: `scripts/sprint10-invitation-concurrency-check.mjs`

SHA-256: `c7b372948684ff76ccb6ff2441d53837ceab300073047c1ccd6c5e1dd94dc52e`

The harness:

1. Fails closed unless the exact database/user/version target is present and no prior harness session is active.
2. Uses only fixed `9500…` synthetic identities and scope rows.
3. Verifies the source lock order remains organization → project → invitation for accept/revoke.
4. Uses a third-session advisory gate only as a deterministic test barrier.
5. Polls `pg_blocking_pids()` and `pg_locks`; it does not infer concurrency from sleeps.
6. Applies bounded lock, statement, idle-session and process timeouts.
7. Executes the tested commands through normal authenticated `api` functions.
8. Rolls back both competing transactions, then removes the base fixture through ordinary constraints and triggers.
9. Proves zero mutable fixture residue, zero new append-only audit rows and no trigger disable/alter operation in the final harness.

The manual SQL fixture file was not required and was intentionally not added to the ordinary pgTAP suite.

## Two-session serialization receipt

Two consecutive exact-tree runs passed.

| Run | UTC window | Scenarios | `blockedByA` | Waiting locks | Deadlocks | Mutable residue | New audit rows |
| --- | --- | ---: | --- | ---: | --- | ---: | ---: |
| 1 | `2026-09-18T19:33:10.372Z`–`2026-09-18T19:33:12.186Z` | 4/4 | true in every scenario | 1 in every scenario | `0 → 0` | 0 | 0 |
| 2 | `2026-09-18T19:33:27.909Z`–`2026-09-18T19:33:30.082Z` | 4/4 | true in every scenario | 1 in every scenario | `0 → 0` | 0 | 0 |

Runtime scenarios:

1. Accept transaction holds organization/project/invitation locks; revoke waits, then succeeds only after the accept transaction rolls back.
2. Revoke transaction holds organization/project/invitation locks; accept waits, then succeeds only after the revoke transaction rolls back.
3. First accept holds organization/project/invitation locks; second accept waits, then succeeds only after the first transaction rolls back.
4. Issuer membership change holds organization/project/project-membership locks; accept waits, then succeeds only after the change transaction rolls back.

Every scenario proved the expected held relations, an ungranted waiter lock, direct blocker identity, bounded completion, no deadlock, no partial write and exact cleanup.

## Post-lock conflict semantics

Separate rollback-only business-transaction checks proved the terminal conflict behavior after the first mutation is visible in the same transaction:

| Ordering | Expected/observed SQLSTATE |
| --- | --- |
| accept → revoke with stale version | `40001` |
| revoke → accept | `23514` |
| accept → accept | `23514` |
| issuer membership disabled → accept | `42501` |

All first mutations and audit writes were rolled back after each assertion.

## Evidence limitation / blocker

A single combined test that commits session A, lets blocked session B observe that committed terminal state, and then restores the database cannot satisfy all current constraints simultaneously:

- every successful business mutation writes an append-only `admin_audit_events` row;
- its organization/project/profile foreign keys use `ON DELETE SET NULL`;
- the append-only trigger also rejects those FK-driven updates;
- therefore ordinary cleanup cannot delete the synthetic parent scope after a committed business mutation;
- trigger bypass, trigger alteration, database reset/drop or retained fixture/audit rows are outside the final harness contract.

Accordingly, `COMMITTED_TWO_SESSION_TERMINAL_OUTCOME` is **BLOCKED**. Serialization and terminal conflict semantics are each proven, but in separate rollback-only evidence lanes. Do not relabel this as a full committed end-to-end concurrency receipt.

## Development recovery disclosure

An early commit-based prototype exposed the append-only/FK cleanup conflict. It created only the fixed synthetic `9500…` scope. A one-time local operator recovery used transaction-local `session_replication_role=replica` to remove exactly 4 synthetic audit rows, 4 invitations, 1 project, 1 organization, 6 profiles and 6 Auth users. Read-back before the final harness showed `0|0|0|0|0` mutable residue. No unrelated rows were selected, no trigger definition/configuration was changed, and this recovery path is absent from the final harness.

This recovery is a test-development limitation and must not be copied into production, hosted or ordinary CI execution.

## Decision

- Organization → project → invitation serialization: PASS.
- Both accept/revoke acquisition orderings: PASS for deterministic wait/rollback execution.
- Accept/accept serialization: PASS.
- Issuer-membership-change/accept serialization: PASS.
- Expected conflict SQLSTATE matrix: PASS.
- No partial writes / no deadlocks / bounded timeouts: PASS.
- Scope cleanup with active triggers: PASS for final rollback-only harness.
- Combined committed two-session terminal outcome with full cleanup: BLOCKED by the append-only audit/FK contract.
- Hosted Supabase, network APIs, provider Auth/email and Production: not touched.

Safest next step: Main must decide whether a disposable cloned-database replacement/restore is an acceptable evidence boundary for a future commit-based two-session test. Do not weaken append-only audit enforcement merely to make the test self-cleaning.

