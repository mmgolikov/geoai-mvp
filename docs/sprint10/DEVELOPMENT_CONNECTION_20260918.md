# Development database and protected Preview connection

18 September 2026, 23:05 Moscow. Development evidence only; not Production or full live acceptance.

## Executed scope

Root applied the nine canonical pending migrations to the founder-approved `geoai-dev` project `pphdqkurxneyagvnnjdt` using the normal linked CLI. The fresh pre-apply catalog and exact nine-version dry-run were checked separately. No reset or replay of the pre-ledger bootstrap occurred. The SQL tree SHA-256 remained `901ed67623d63632c4e37beecbd543975966b8ea0c13cb272ae02c6d55f5d412`.

Actual read-back at 19:54 UTC confirmed **22 migration entries**, **16 API routines**, no API tables/views/sequences, zero waiting locks and zero Auth users. Root then applied the reviewed owner-only `20260716_data_api_api_only_owner_path.sql` operator. Its actual receipt at 19:57 UTC confirmed `currentUser=postgres`, `authenticatorDbSchemas=[api]` and 16 API routines.

The independent invitation-concurrency review allowed this bounded development upgrade. Its rollback serialization and terminal-state checks were not incorrectly labelled as committed-waiter acceptance. A later separately authorized retained-fixture committed probe is under separate review.

## Actual Data API checks

Root used the existing enabled publishable key only in process memory. No private key or OpenAI key was written or printed.

| Check | Actual result |
| --- | --- |
| Anonymous `api.healthcheck` | HTTP 200 |
| Request to `public`, zero-row query | HTTP 406 / `PGRST106` |
| Request to `geoai_private`, zero-row query | HTTP 406 / `PGRST106` |
| Anonymous executable API routines | Only `healthcheck` |
| Authenticated executable API routines | 16 |
| Anonymous executable private routines | 0 |
| Anonymous/authenticated direct base-table privileges | None in the inspected application tables |

Some historical `service_role` base-table privileges and authenticated private helper execution remain in the canonical schema. These are not publicly exposed REST tables/routines: the actual API-only schema boundary above was tested. This report does not claim all PostgreSQL privileges are zero or that actual authenticated tenant isolation has already passed.

Security advisors still report extension-related public PostGIS/RLS/function warnings and 19 RLS-enabled/no-policy information findings. The actual public REST-schema rejection is evidence for the operator boundary, not a claim that all advisor findings disappeared. Do not modify managed extension ownership simply to suppress the report. References: [RLS linter](https://supabase.com/docs/guides/database/database-linter?lint=0013_rls_disabled_in_public), [extension placement](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public).

## Preservation evidence boundary

The pre-apply backup was restored and 31 original table counts/digests matched. The populated local upgrade preserved the 355 original rows on their original columns, with only the documented profile timestamp backfill excluded from comparison.

After the hosted upgrade, read-only counts reconfirmed 5 projects, 10 analysis runs, 5 comparison sets, 242 audit events and zero Auth users. A proposed full original-column checksum comparison was blocked by the platform because hashes would derive from private fields. Root stopped that lane and asked the founder for explicit approval of checksum-only verification. **Post-upgrade complete content preservation remains unverified until that check is authorized and passes.** Counts alone are not byte/content equivalence. No restriction was bypassed.

## Exact Preview branch settings

Root added, without overwriting existing branch variables, seven settings only for `codex/sprint10-control-20260918` in project `prj_LE41wkaiRUgZgOynkkeixGbesJvp`, team `geoaidev`:

- Auth mode `supabase_auth`.
- Access enforcement `hard`; public demo disabled.
- Exact development URL and existing publishable key.
- Preview-only analysis and persistence enabled for authorized tests.

Read-back classified the exact development URL and all five non-key settings correctly and confirmed a publishable key was available. The existing OpenAI key was not changed or copied. Sensitive Vercel values cannot be pulled; their absence in the local classifier does not prove absence from hosted runtime. Production and global Preview settings were not changed. Settings take effect only in a new deployment; deployment/readiness and actual Auth/provider acceptance remain separate checks.

The root-only operator is `scripts/sprint10-preview-connection.mjs`; its default mode performs only the three Data API checks. Mutation requires the exact `--apply-approved-preview` opt-in, exact linked database and branch, and never uses `--force` to replace variables. It deliberately fails on collision; do not rerun the apply mode after success.

## Remaining live gates

- Exact refreshed protected deployment and anonymous protection check.
- Real non-email synthetic password Auth, session/logout and cross-persona isolation.
- Root-reserved real provider runs and save/reopen; local fixture tests are not substitutes.
- Full content preservation checksum, pending explicit privacy approval.
- Transactional email remains deferred. No domain/server purchase, main, Production or DNS changes.

The single USD15 cycle ledger remains authoritative across commits and retries. At this checkpoint paid usage and reservations are both USD0.
