# Sprint 10 Invitation Concurrency Handoff

Status: PASS — deterministic serialization and committed terminal outcomes proven locally; hosted and Production evidence remain out of scope

## Authority and target

- Owned branch: `codex/sprint10-invitation-concurrency-20260918`
- Candidate base: `10d994d5864d96f22f2f829e747f1919e04f0fa8`
- Local Docker context: `colima-geoai-sprint10`
- Container: `geoai-sprint10-restore`
- Container network: `none`
- Published ports: `0`
- Rollback-only database: `geoai_invitation_concurrency`
- Committed-evidence database: `geoai_invitation_commit_probe`
- PostgreSQL: `17.6`
- Transport: local Unix socket `/var/run/postgresql`
- Database role: `supabase_admin`
- Business calls: `authenticated` plus synthetic AAL1 JWT claims through the public `api` wrappers
- Hosted systems, external APIs, Auth providers, email providers and customer data: not used

## Harness

File: `scripts/sprint10-invitation-concurrency-check.mjs`

SHA-256: `c7b372948684ff76ccb6ff2441d53837ceab300073047c1ccd6c5e1dd94dc52e`

The rollback-only harness:

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

The committed terminal-state harness is `scripts/sprint10-invitation-committed-concurrency-check.mjs` (SHA-256 `3fe0478da647c6871b54b05b03fac9a01e483b2a048bdf67e5c989b8b56c90dd`). It is a one-shot local evidence probe: it fails unless the fixed `9600…` scope is absent, performs no cleanup/reset/drop, and intentionally retains only the approved synthetic fixtures and append-only audit evidence in `geoai_invitation_commit_probe`. It must not be rerun against that database.

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

## Committed two-session terminal-state receipt

Direct user authority approved a separate local database that intentionally retains the synthetic evidence. The one-shot run passed from `2026-09-18T19:55:28.202Z` to `2026-09-18T19:55:29.848Z`.

| Scenario | Session A committed | Session B terminal SQLSTATE | A PID | B PID | Direct blocker | Waiting locks | Winner audit | Loser audit |
| --- | --- | --- | ---: | ---: | --- | ---: | ---: | ---: |
| accept vs revoke | accept | `40001` | 19302 | 19303 | true | 1 | 1 | 0 |
| revoke vs accept | revoke | `23514` | 19343 | 19342 | true | 1 | 1 | 0 |
| accept vs accept | first accept | `23514` | 19378 | 19377 | true | 1 | 1 | 0 |
| issuer membership change vs accept | issuer membership disabled | `42501` | 19414 | 19412 | true | 1 | 1 | 0 |

Every losing command ran inside an exception subtransaction. After session A committed, session B observed the committed terminal state, caught only the expected SQLSTATE, and committed an empty outer transaction. Per-scenario read-back proved the exact invitation/membership state, one winner audit event, zero loser audit events and no partial loser membership.

Final retained evidence in `geoai_invitation_commit_probe`:

- 6 synthetic Auth users and 6 provisioned profiles;
- 1 organization, 1 project and 4 invitations;
- invitation states: 2 accepted, 1 revoked and 1 pending;
- 2 recipient organization memberships and 2 recipient project memberships, matching only the two accepted invitations;
- the issuer project membership disabled in the fourth scenario;
- 4 winner audit rows and 0 loser audit rows;
- deadlock counter `0 → 0`;
- trigger definitions unchanged and 0 disabled non-internal triggers;
- Docker network `none`, 0 published ports and local Unix-socket transport only.

Winner request IDs:

- accept vs revoke: `e990f78d-a24b-4375-bc08-2c4bebfc986c`;
- revoke vs accept: `fb75ca47-040a-4d9e-b3bf-a28f2593b101`;
- accept vs accept: `a84246f8-b246-4fbd-b617-281c65c078c1`;
- issuer change vs accept: `f4c1aa46-3ed8-4085-ae8b-1c25107f3a50`.

Loser request IDs, each with zero audit rows:

- `4e51dafb-1be7-4d8f-84eb-0af79acd7a84`;
- `fba0be0c-2649-4e85-bf2f-d07cb3e994a0`;
- `970ebfc3-0f3b-4d8a-aec3-ed0b52168ea7`;
- `a88bd5cb-94cb-4d93-b4e1-e2200b3480e9`.

The retained rows are synthetic local evidence, not application data, hosted Supabase evidence or a cleanup precedent. The probe contains no `session_replication_role`, trigger alteration, delete, truncate, reset or database-drop operation.

## Development recovery disclosure

An early commit-based prototype exposed the append-only/FK cleanup conflict. It created only the fixed synthetic `9500…` scope. A one-time local operator recovery used transaction-local `session_replication_role=replica` to remove exactly 4 synthetic audit rows, 4 invitations, 1 project, 1 organization, 6 profiles and 6 Auth users. Read-back before the final harness showed `0|0|0|0|0` mutable residue. No unrelated rows were selected, no trigger definition/configuration was changed, and this recovery path is absent from the final harness.

This recovery is a test-development limitation and must not be copied into production, hosted or ordinary CI execution.

## Decision

- Organization → project → invitation serialization: PASS.
- Both accept/revoke acquisition orderings: PASS for rollback isolation and committed terminal outcomes.
- Accept/accept serialization and committed terminal outcome: PASS.
- Issuer-membership-change/accept serialization and committed terminal outcome: PASS.
- Expected conflict SQLSTATE matrix: PASS.
- Winner durability / loser atomicity / no deadlocks / bounded timeouts: PASS.
- Scope cleanup with active triggers: PASS for final rollback-only harness.
- Combined committed two-session terminal outcome: PASS in the separately approved local retained-evidence database.
- Automatic cleanup/reset/drop of committed evidence: intentionally not performed.
- Hosted Supabase, network APIs, provider Auth/email and Production: not touched.

GO for local invitation-concurrency evidence closure. NO-GO for upgrading this receipt to hosted Supabase, pilot or Production evidence. The safest next step is independent review of the two scripts and retained read-back; do not weaken append-only audit enforcement or use the retained fixture database as an application environment.
