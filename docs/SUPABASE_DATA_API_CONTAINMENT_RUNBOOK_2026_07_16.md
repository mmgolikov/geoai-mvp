# Supabase Data API Containment — Operator Prerequisite

Status: Draft operator runbook; not executed and not apply-ready
Last verified: 2026-07-16
Owner: GeoAI Database / Security Operations
Authority: Current mandatory operator decision and evidence procedure before DB/Auth/Storage activation
Successor: None; any replacement must update `DOCUMENTATION_INDEX.md`, `CURRENT_RELEASE_STATE.md` and the Confluence Hub
Depends on: DB-01 / GitHub #85
Navigation: [Confluence Hub](https://geoaimvp.atlassian.net/wiki/spaces/PH/overview) · [Documentation Index](DOCUMENTATION_INDEX.md) · [Current Release State](CURRENT_RELEASE_STATE.md) · [Full System Audit](FULL_SYSTEM_AUDIT_2026_07_16.md) · [Codex Backlog](CODEX_BACKLOG_2026_07_16.md#db-01--canonical-migration-replay-and-rls-evidence)

## Why this is a separate operator gate

The development Supabase project `pphdqkurxneyagvnnjdt` currently exposes `public` through the Data API; it is separate from Production, where Supabase is not configured. Live read-only audit found that the three pending containment/identity/source-custody migrations are absent from the 10-entry migration ledger and anonymous rows remain visible across organization/profile/project/membership, analysis/report/comparison, Data Room, validation, pilot, source/external snapshot and audit tables. Source snapshot policies explicitly admit `project_key IS NULL`, making any such row anonymous through PostgREST even when `project_id` is non-null. `anon` also retains `SELECT/INSERT/UPDATE/DELETE` on `public.spatial_ref_sys`; both `anon` and `authenticated` retain dangerous relation privileges including `TRUNCATE`, which RLS cannot constrain. `anon` can execute 748 `public` RPCs, including 79 volatile functions and six `SECURITY DEFINER` functions. All four Storage buckets are private, but `storage.objects` currently has zero policies; Storage is nonfunctional rather than safe for activation. The read-only advisor snapshot at 2026-07-16 09:55 UTC returned 14 security findings (one ERROR for RLS-disabled `spatial_ref_sys`; 13 WARN for public PostGIS and executable `SECURITY DEFINER` functions) and 71 performance findings (53 unused-index INFO; 18 multiple-permissive-policy WARN). The public application uses browser-local state and does not need this Data API surface.

Live schema review found that `profiles.auth_user_id` lacks a proven unique/FK identity contract; the legacy authenticated AOI `FOR ALL` policy checks membership without an explicit role; `projects.organization_id` and security-critical `project_memberships` fields are nullable; and there is no proven `UNIQUE(project_id, user_id)` or composite organization/project consistency constraint. The repository draft selects global profiles plus `organization_memberships` and `project_memberships`, with capabilities and matching TS/RLS semantics. That model is not live or execution-certified until replay and personas pass.

The normal Supabase migration role is not the owner of the managed PostGIS or Storage objects. Plain migration-file `REVOKE` or Storage policy DDL cannot be assumed to work and may abort an otherwise valid transaction. No ACL, API schema, extension or Storage change was made during this audit.

The repository now contains an exact ledger manifest, a pre-ledger healthcheck bootstrap/reconciliation and three fail-closed review-only migrations for containment, identity and source custody. The identity draft implements the selected global-profile + organization-membership + project-membership model, account-state checks, exact policy templates and `api.healthcheck()`, `api.current_profile()`, `api.current_organization_memberships()` and `api.current_project_access(text)` RPCs. AUTH-01B stages a cookie-only exact-project read facade around the latter RPC and the shared role kernel, but all readiness flags are false and no route/base-table/service-role/cache path is active. Because authenticated callers have no direct protected base/Auth-table `SELECT`, review-only Storage policies delegate one exact organization/project/role decision to narrow `SECURITY DEFINER geoai_private.has_storage_project_role()`; object fetch/signing remains operation-aware so listing and `client_viewer` raw-object access are denied. SOURCE-01 migration `20260716113000_geoai_source_custody_foundation_v1.sql` adds five RLS-enabled/direct-grant-closed custody tables, immutable releases/artifacts/status events/receipts, composite tenant/release and actor organization/project-membership FKs, fail-closed `restricted`/`registered_unverified` legacy backfill, and approved-only bounded `api.current_source_releases()` metadata for owner/admin/analyst/viewer without arbitrary quality/lineage summary JSON, Storage paths, source URIs, secrets or `client_viewer`. SOURCE-02 is pure provider-neutral planning/receipt code with an empty registry, no fetch/env/secrets/persistence and Production denied; it is not an apply or provider-execution step in this runbook. Direct `public` table grants remain closed. None of these artifacts or Storage policies has been executed against Supabase.

Repository-local replay infrastructure is staged: `supabase/config.toml` selects Postgres 17 and exposes only `api`, Supabase CLI `2.109.1` is pinned, the guarded operator migration check enumerates all three pending migrations and requires the source-custody checker, and CI `database-replay` is configured to start/reset and run the 57-assertion pgTAP database/source/Storage-helper persona suite, including negative source actor-membership and artifact/release tenant-scope FK cases. This does not establish clean replay. Docker is unavailable in the current workspace and the controls still need an exact-SHA GitHub CI result; upgrade replay, advisor parity, real HTTP/JWT/source personas and trusted-worker write evidence remain separate requirements.

The candidate Storage policy SQL is kept outside the automatic migration chain at [`supabase/operator/20260716_storage_policy_owner_path_review.sql`](../supabase/operator/20260716_storage_policy_owner_path_review.sql). It is review-only and must not be run through the normal domain migration role.

## Required operator decision

Before Auth, real sources, protected files or durable user data, choose and evidence one supported boundary:

1. Disable the Data API for the development/public-demo project while the application is browser-local; or
2. expose a dedicated minimal `api` schema instead of `public`, with explicit views/RPCs only, and keep PostGIS in a non-exposed extension schema on the clean project.

Do not solve the current surface with a brittle allow/deny list of hundreds of extension functions.

This decision follows Supabase's current security model: Data API reachability is controlled by both minimum Postgres grants and RLS; functions need explicit `EXECUTE` control because RLS does not protect them. Supabase explicitly supports either a dedicated API schema or disabling the Data API when it is unused. See [Securing your API](https://supabase.com/docs/guides/api/securing-your-api). Storage must be authorized with RLS policies on `storage.objects`, scoped to authenticated ownership/project paths; a service key bypasses RLS and is never a caller authorization mechanism. See [Storage access control](https://supabase.com/docs/guides/storage/security/access-control). Next.js repositories must use a request/cookie-scoped server client and validate the JWT/user for authorization, not trust an unverified session object; see [Creating a Supabase client for SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client).

## Acceptance evidence

- exact Supabase project ref, operator identity, timestamp and rollback procedure;
- exposed-schema configuration screenshot/export before and after;
- `anon` cannot select any domain/source/audit table directly;
- an inserted test snapshot with `project_key IS NULL` is not visible to `anon`; nullable scope never establishes public visibility;
- `anon` cannot mutate `spatial_ref_sys` or execute non-allowlisted RPCs;
- direct `public.geoai_healthcheck` access is denied; anonymous liveness uses only `api.healthcheck()` and returns one boolean without infrastructure inventory;
- the owner records the canonical identity model; profile/Auth uniqueness/FK, organization membership, project membership uniqueness and organization/project consistency constraints match TS/session/RLS semantics;
- the legacy AOI authenticated `FOR ALL` policy is removed; replacement INSERT/UPDATE/DELETE policies enforce an explicit allowed role and pass wrong-role tests;
- the SSR request context uses the caller cookie/JWT and `api.current_profile()`; bearer/mixed transport, banned/deleted/unconfirmed users, missing/inactive profiles and cross-tenant memberships fail closed;
- Storage object policies are created through the supported owner path, bind bucket/path/object owner to the validated caller/project and pass no-session, wrong-user and wrong-project negative tests;
- the four-private-bucket/zero-policy baseline is not loosened until canonical server-resolved paths, magic-byte/scan quarantine and safe download headers are verified end to end;
- PostGIS/Storage upgrade procedure re-runs the ACL/API-surface check;
- clean replay and upgrade replay pass before `20260716000000_geoai_pre_auth_security_containment_v1.sql`, `20260716085854_geoai_identity_authorization_foundation_v1.sql` or `20260716113000_geoai_source_custody_foundation_v1.sql` is promoted from review draft;
- the exact candidate SHA has a successful GitHub `database-replay` receipt covering local start/reset and all 57 pgTAP assertions; workflow presence alone is not evidence;
- source-provider writes remain blocked until a trusted worker design proves rights checks, idempotent receipts, immutable release/artifact creation, quarantine/revocation, rollback and negative public-application write access.

This runbook authorizes no live change. Owner-controlled Supabase configuration remains a separate action.
