# GeoAI Sprint 10 — empty development database replay packet

Status: local review packet; not an approval, hosted execution receipt or activation authority

Target: restored non-Production development project `pphdqkurxneyagvnnjdt`

Scope: exact canonical migration inventory, empty-target preconditions, approval effects and post-replay gates

## Decision summary

The 21 canonical SQL files under `supabase/migrations` are the only replay input. The September 4 migration ledger baseline is retained unchanged as historical provenance; it is not the current state of the restored empty project.

The existing `scripts/apply-supabase-migration.mjs` is **inapplicable to this empty target**. It requires a pre-ledger repair receipt for a table that the current empty-target contract says does not exist. No `supabase migration repair` is permitted: migration `20260705100000` must execute normally as migration 1 of 21.

The P0 labels in the source audit describe activation blockers in this packet. They are not evidence of a live incident: the restored database remains empty and no hosted write, Auth mutation, Data API activation or key read was performed here.

## Offline inventory control

Run:

```text
node scripts/database-clean-target-packet.mjs --self-test
```

The helper only reads repository files, hashes the canonical migrations and emits JSON. It does not invoke Supabase, PostgreSQL, HTTP, migration repair or any write path. At this revision it must report:

- `canonicalMigrationCount: 21`;
- first migration `20260705100000_geoai_preledger_healthcheck_bootstrap_v1.sql`;
- last migration `20260904065018_point_object_analysis_persistence_v1.sql`;
- migration-tree SHA-256 `ef22daea39a65b4d23666956fc51573647306ee3077f1ee99f201c5ce37687be`;
- `offline_inventory_only_not_apply_ready` until a fresh, separately hash-bound readback is supplied.

The generated JSON is the authoritative per-file filename/version/byte/SHA-256 inventory. Do not manually retype that list into an operator command.

### Fresh readback contract

Immediately before an approval packet is finalized, a read-only catalog process must create a JSON receipt with this non-secret shape:

```json
{
  "schemaVersion": "geoai-empty-target-readback-v1",
  "observedAt": "<ISO-8601 timestamp>",
  "projectRef": "pphdqkurxneyagvnnjdt",
  "environment": "development",
  "productionProject": false,
  "publicTableCount": 0,
  "migrationVersions": [],
  "applicationSchemas": {
    "api": false,
    "geoai_private": false,
    "geoai_dld_private": false,
    "geoai_dld_feature": false
  },
  "advisors": [],
  "authInspection": "managed_catalog_only_no_user_data"
}
```

Do not add Auth users, user rows, email addresses, keys, tokens, passwords or secrets to the receipt. Bind the exact receipt bytes separately with SHA-256, then verify locally:

```text
node scripts/database-clean-target-packet.mjs \
  --readback <approved-readback.json> \
  --expected-readback-sha256 <64-lowercase-hex> \
  --max-age-minutes 30
```

The helper fails closed on the wrong project, Production, stale/future evidence, any public table, any ledger version, any required application schema already present, non-empty advisors, forbidden Auth-user/secret fields, or a hash mismatch. A passing result verifies only the supplied receipt against the local contract; it does not independently verify the hosted database.

## Exact effects requiring approval

A full clean replay is not merely restoration of table definitions. Approval must enumerate all of these effects:

1. **Foundation and demo content.** The chain creates the public GeoAI domain model, source-registry metadata, one non-Auth system profile, one demo organization, five demo projects, memberships, workflows, validation items, inputs, deliverables, ten sample analyses, comparisons, reports, data-room rows and an audit event.
2. **Temporary legacy exposure during the chain.** Early migrations grant demo reads to `anon`/`authenticated`; the later containment migration retires those policies and grants. The hosted Data API must remain disabled throughout replay so no intermediate state is externally reachable.
3. **Four private Storage buckets.** The chain creates `geoai-data-room-assets`, `geoai-validation-evidence`, `geoai-report-exports` and `geoai-aoi-imports`. It does not activate the separate review-only `storage.objects` policies.
4. **Identity/Admin database surface.** The chain creates `geoai_private`, the `api` RPC facade, profile provisioning on managed `auth.users`, invitations, tenant administration, last-owner protection and audit functions. No Auth provider or user is created by the migration chain.
5. **No-MFA product decision.** `20260716213214` changes the legacy `require_aal2()` boundary to a permanent non-anonymous identity check. It does not prove verified email or phone ownership.
6. **DLD demo surface and outbound HTTP extension.** The chain creates restricted DLD demo schemas/tables and installs the PostgreSQL `http` extension in `extensions`. The comment “operator-only” is not an ACL proof; extension-function privileges require post-replay inspection.
7. **Point-object persistence.** The final migration adds caller-owned analysis persistence and two authenticated RPCs. The canonical Data API inventory is therefore 16, not the historical 14.
8. **Legacy `service_role` grants.** Historical migrations explicitly grant `service_role` SELECT on the original public model and INSERT on `audit_events`. Later containment removes direct `anon`/`authenticated` access but does not retire all of those existing `service_role` grants. Approval must either accept the exact post-replay ACL inventory or require a separate forward migration; do not rewrite historical migration files.

## Required gate sequence

### Before any replay approval

- Bind the exact Git commit and the generated 21-file migration-tree SHA-256.
- Attach a fresh empty-target readback (maximum 30 minutes) and its separate SHA-256.
- Keep the Dashboard Data API disabled. Do not enable Auth, Storage object access or application environment variables.
- Obtain actual PostgreSQL 17 clean-replay evidence for the exact migration tree: reset/replay, three pgTAP files and `183/183` assertions.
- Preserve a recoverable project/branch snapshot or equivalent provider-supported rollback receipt. “The database is empty” does not replace a rollback plan.
- Record the exact effects above. In particular, no-MFA, demo seed, buckets, DLD/http and point persistence are separate decisions inside one replay.

### Owner-approved remote dry-run, before apply

The trusted operator environment must perform a Supabase CLI dry-run against the exact project ref and show exactly the 21 versions emitted by the offline helper, in order, with no extra/missing migration and no migration repair. Stop on any catalog drift, extension error, unexpected schema, unexpected ledger row or target mismatch.

This packet intentionally does not provide a bypass command. `scripts/apply-supabase-migration.mjs` remains inapplicable to the empty-target case until a separately reviewed clean-target operator path exists.

### After replay, while activation remains off

Required read-back evidence:

- migration ledger contains exactly the 21 canonical versions;
- `public` has 29 GeoAI tables with RLS; any managed `spatial_ref_sys` relation is identified separately;
- `api` has exactly 16 functions and no tables, views, materialized views, foreign tables or sequences;
- no direct public-table privilege remains for `anon` or `authenticated`;
- actual `service_role` privileges are inventoried and compared with the approved decision;
- `geoai_private`, `geoai_dld_private` and `geoai_dld_feature` are absent from exposed schemas;
- the four buckets are private and no Storage object policy is inferred from bucket creation;
- `pgcrypto`, `postgis`, `http` and their owners/schemas/function ACLs match the approved surface;
- database advisors and uncovered foreign-key checks are captured;
- clean replay pgTAP remains `183/183`.

The SQL suite proves structural, RLS, Admin and lifecycle contracts, but the two point-object RPCs still require real owner/analyst/viewer/anonymous/cross-tenant JWT personas. Keep the Data API disabled until every database read-back above passes. The separately authorized owner path must then fail closed unless its 16-function inventory is exact; immediately after it pins exposure to `api`, activation remains unaccepted until HTTP proves:

- `api.healthcheck()` is the only anonymous RPC;
- the other 15 RPCs require `authenticated`;
- direct `public` access is denied;
- point-object create/list succeeds only for the approved role and owner, and cross-tenant/other-owner access is denied.

The owner action pins PostgREST to `api` before the HTTP checks; successful HTTP checks are the gate for subsequent application activation, not a prerequisite for performing that same pin a second time.

## Owner bootstrap is separate

The migration chain creates no first platform owner. Do not automatically execute `supabase/operator/20260716_first_platform_owner_bootstrap.sql`. It is a separate one-time owner action requiring a confirmed permanent Auth user, an exact approved email, change ticket, operator identity and request UUID. It has no automated rollback because last-owner protections deliberately prevent blind removal.

## Rollback boundaries

- Do not use a blind database reset, blanket `DROP`, history rewrite or ledger repair as rollback.
- Prefer provider-supported restore/recreation from the pre-apply snapshot for a failed clean replay.
- Resetting `authenticator.pgrst.db_schemas` can restore a Dashboard default that exposes `public`; it is not a routine rollback.
- `supabase/operator/point_object_analysis_persistence_v1_deactivation.sql` removes only the two point-object RPC surfaces. It intentionally retains analysis data and restrictive ownership policies; it is not a full database rollback.
- Storage policy, Data API operator setting, first-owner bootstrap and application environment activation each require their own rollback evidence.

## Acceptance record

This local packet is complete when:

- `node scripts/data-api-operator-check.mjs` passes the exact 16-RPC positive contract and built-in missing/extra/incorrect-signature negative fixtures;
- `node scripts/database-clean-target-packet.mjs --self-test` emits the 21-file inventory and remains `not_apply_ready` without a fresh readback;
- repository diff is limited to this document, the offline helper, the Data API owner path and its checker;
- no hosted system, Auth data, key, migration ledger, canonical migration, historical manifest or existing apply wrapper was changed.
