# Populated development database: non-writing preflight

18 September 2026 · candidate only · hosted activation remains held

Exact target: `geoai-dev` / `pphdqkurxneyagvnnjdt`. Do not substitute the separate rehearsal project. The current target is populated; `DATABASE_CLEAN_TARGET_PACKET.md` is inapplicable.

## What is implemented

`scripts/database-upgrade-preflight.mjs` only reads local files. It does not read credentials, start a child process, call HTTP/SQL, invoke Supabase CLI, repair the ledger or apply a migration. It checks the 21-file canonical inventory and immutable historical file hashes, then optionally validates supplied readback and dry-run JSON attestations. It never returns hostedApplyReady=true, even for a valid plan.

The separate hashes are explicit: `sqlTreeSha256` hashes SQL filenames and bytes with NUL separators; `manifestSha256` hashes the historical manifest. This differs from the older operator guard's combined SQL-plus-manifest digest. They must not be substituted.

```sh
node scripts/database-upgrade-preflight.mjs
node scripts/database-upgrade-preflight-check.mjs
node scripts/check-supabase-migration.mjs
```

The first command is an inventory, not a remote dry-run. The second uses synthetic fixtures. The third now derives **eight**, not seven, pending migrations from the canonical manifest. Historical rehearsal/CI evidence is explicitly not current runtime acceptance.

## Supplied evidence contract

For a readback use `--readback PATH --expected-readback-sha256 DIGEST`. The receipt must have schemaVersion `geoai-populated-target-readback-v1`, the exact target, development/non-Production flags, an observedAt timestamp no more than 30 minutes old and not in the future, both current local hashes, the restricted collection marker, the full healthcheck fingerprint and an ordered ledger. The fingerprint and field shape are exported by the checker; do not copy the synthetic fixture and call it live evidence. Collect every field from the target and retain the read-only query provenance.

Only two ledger shapes are accepted: the exact 12 historical rows with matching name, statement count, bytes and MD5; or the same rows plus the separately repaired pre-ledger version `20260705100000` (13 rows). The repair-created row is used for its version only; the existing object must still match the full pre-containment fingerprint. No repair is performed by this checker.

A later dry-run attestation uses `--plan PATH --expected-plan-sha256 DIGEST`. It must bind the fresh **13-entry** readback SHA, both local hashes, resolved target, observation time, zero exit code, retained raw-output digest, exact argv `db push --linked --dry-run --include-all`, and exactly these versions in order:

1. `20260716000000`
2. `20260716085854`
3. `20260716113000`
4. `20260716164451`
5. `20260716172000`
6. `20260716175210`
7. `20260716213214`
8. `20260904065018`

The typed attestation is **not** a parser or independent verification of raw CLI output, CLI credentials, linked configuration, a backup or founder approval. A human/root operator must compare and preserve raw output under a separately authorized exact-ref plan. A checksum establishes binding, not authenticity. No live dry-run was run in this slice.

## Strict stage boundaries

1. Fresh read-only catalog/ledger/fingerprint; exact clean Git commit and migration hashes; backup and tested restore; confirm actual Data API exposure.
2. Ask for exact-target **ledger repair only** approval. Never replay the pre-ledger CREATE over the existing table. Read back 13 entries afterwards.
3. Separately authorize the **dry-run only** with include-all. Bind and inspect the exact eight-version order, then stop.
4. Obtain new exact **apply** approval after fresh replay/drift evidence. Do not invoke `scripts/apply-supabase-migration.mjs`: it remains NO-GO for this target because it omits include-all/exact order checks and automatically advances from dry-run to apply.
5. After any future approved apply, verify 21 ledger entries, schema drift, 16-RPC allowlist/grants, advisors and real JWT owner/analyst/viewer/anonymous/cross-tenant access. Authenticated identity is not project membership or source access.

Backups must cover the existing database and required Auth/Storage state with a tested restore path; an environment string or default schema-only CLI dump is not sufficient evidence. A fresh local replay is currently blocked by unavailable Docker/Postgres runtimes; historical CI replay does not waive this gate. No runtime installation was performed.

## Verification in this slice

- 47 pure offline cases: valid 12/13-entry receipts; wrong target/Production; stale/future data; hash/ledger/column/policy/grant drift; no include-all; apply/seed/role flags; missing/extra/reordered migration; nonzero dry-run; unbound evidence. Every output remains non-apply-ready.
- Static aggregate and canonical chain: PASS; canonical SQL and historical manifest unchanged.
- Supabase full service-table fingerprint rechecked read-only at 18:53:42 Moscow, including a boolean predicate for the known public health seed. The 12 ledger metadata rows were re-read immediately afterwards and still match. No customer/Auth rows or secrets retrieved.
- No hosted repair, dry-run, apply, Data API change, grants, auth settings, environment, deployment or paid API call.

## Official documentation checked

[CLI db push](https://supabase.com/docs/reference/cli/supabase-db-push) defines dry-run and include-all separately. The latter includes pending older versions, which matters for this noncontiguous ledger. [Supabase changelog](https://supabase.com/changelog) was checked on September 18: extension version pinning changed August 5, and logs.all is scheduled for removal September 23; this offline checker uses neither extension DDL nor that endpoint. No provider implementation was inferred from older memory.
