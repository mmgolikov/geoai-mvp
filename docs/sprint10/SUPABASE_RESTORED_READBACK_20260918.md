# Supabase restored development target — 18 September 2026

Status: READ-ONLY OBSERVATION; NOT UPGRADE OR ACTIVATION APPROVAL

Target: `geoai-dev`, `pphdqkurxneyagvnnjdt`; PostgreSQL 17.6.1.141; eu-west-1.

## Superseded observation

At 17:44–17:46 Moscow the connector returned zero public application tables and zero migrations while metadata said COMING_UP. At **18:36–18:39 Moscow** catalog and ledger reads instead returned the populated historical schema and ACTIVE_HEALTHY metadata. Restoration completing is a plausible explanation, not a proven event history. No root or assigned worker performed hosted writes during this interval.

The earlier empty snapshot must not be used for an apply decision. The local clean-target packet is retained only as a conditional artifact and is now explicitly inapplicable to this target. Do not reset, recreate or replay CREATE statements against existing objects.

## Current catalog evidence

- 20 public tables: 19 GeoAI tables with RLS enabled and the PostGIS-managed `spatial_ref_sys` relation without RLS.
- `geoai_dld_private` has four tables and `geoai_dld_feature` has three, all with RLS enabled.
- `api` and `geoai_private` schemas remain absent.
- 12 applied migrations; every version/name/statement byte count/MD5 matches `supabase/migration-ledger-baseline.json` dated September 4. Comparison used stored statement metadata only, not full SQL or user rows.
- `public.geoai_healthcheck` exists, owned by postgres, RLS true, force-RLS false, null comment; primary key `id`; columns `id bigint not null`, `name text not null`, nullable `created_at timestamptz default now()`; SELECT policy for anon/authenticated with predicate true. Seed-row content was not inspected in this readback. This is only a partial pre-ledger fingerprint and does not authorize ledger repair.
- Authenticator role configuration lists preload libraries and 8-second statement/lock timeouts, but no explicit `pgrst.db_schemas` override. That alone does not establish the Dashboard Data API setting or external reachability.

## Security observations, not an exploitation test

Actual `has_table_privilege` catalog checks found SELECT and TRUNCATE on all 20 public tables for both anon and authenticated. INSERT/UPDATE/DELETE each cover one public table. Service role has SELECT/TRUNCATE on 20, INSERT on two, UPDATE/DELETE on one. RLS-enabled status is not proof of an appropriately minimal grant surface. No operation was executed against user data.

Security advisors returned five groups / 21 findings:

| Group | Count | Interpretation |
| --- | ---: | --- |
| RLS enabled without policy | 7 INFO | DLD tables; lack of policy can be intentional default-deny, not automatically a leak |
| RLS disabled in public | 1 ERROR | Managed `spatial_ref_sys`; do not blindly rewrite extension-owned objects |
| Extension in public | 1 WARN | PostGIS; requires planned containment, not an ad-hoc move |
| Anonymous-executable SECURITY DEFINER functions | 6 WARN | Three GeoAI access helpers and three PostGIS overloads |
| Authenticated-executable SECURITY DEFINER functions | 6 WARN | Same six functions; exact intended caller surface must be reviewed |

Official remediation references: [public-table RLS](https://supabase.com/docs/guides/database/database-linter?lint=0013_rls_disabled_in_public), [extension placement](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public), [anonymous SECURITY DEFINER execution](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [signed-in execution](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [RLS without policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

## Next safe gate

1. Reconcile the existing noncontiguous 12-version ledger and partial pre-ledger object against the unchanged canonical 21-file tree; preserve existing data.
2. Verify the full pre-ledger fingerprint and pending migration order. An older version inside the already-applied range requires explicit supported upgrade handling, not an assumed plain push.
3. Establish backup/restore, exact target, Data API exposure and dry-run checks before asking for a concrete hosted upgrade approval.
4. After approved upgrade: verify 16-RPC containment, role grants, advisors, exact schema, and owner/analyst/viewer/anonymous/cross-tenant HTTP/JWT tests. Identity-only application tests do not close these gates.

No keys, Auth users, email addresses, account rows or customer records were read or persisted. No hosted migration, repair, grants, auth settings, environment, bootstrap, Data API setting or Storage mutation was performed.

## Independent local upgrade-path review

The existing `scripts/apply-supabase-migration.mjs` remains **NO-GO for this restored target**. Its plain `db push --dry-run` and subsequent `db push --yes` omit `--include-all`, do not machine-compare the planned version/order, and auto-apply after any successful dry-run. An environment receipt string is not independent proof of the pre-ledger repair. No invocation of that wrapper was performed.

The actual local synthetic-upgrade script already handles noncontiguous history using `migration up --local --include-all`. After an independently verified and separately approved pre-ledger repair to 13 ledger entries, the exact eight pending versions should be:

`20260716000000`, `20260716085854`, `20260716113000`, `20260716164451`, `20260716172000`, `20260716175210`, `20260716213214`, `20260904065018`.

The static aggregate checker still describes only seven pending versions even though the canonical checker counts eight. Next local implementation: non-writing preflight, exact version/order matching, and a stop between dry-run and separately approved apply; repair fingerprint/backup/readback remain independent gates. No blanket `--include-all` execution is authorized. Hosted apply must not be inferred from a successful local checker.
