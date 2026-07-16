# Supabase Data API Containment — Operator Prerequisite

Status: Draft operator runbook; not executed and not apply-ready
Last verified: 2026-07-16
Owner: GeoAI Database / Security Operations
Authority: Current mandatory operator decision and evidence procedure before DB/Auth/Storage activation
Successor: None; any replacement must update `DOCUMENTATION_INDEX.md`, `CURRENT_RELEASE_STATE.md` and the Confluence Hub
Depends on: DB-01 / GitHub #85
Navigation: [Confluence Hub](https://geoaimvp.atlassian.net/wiki/spaces/PH/overview) · [Documentation Index](DOCUMENTATION_INDEX.md) · [Current Release State](CURRENT_RELEASE_STATE.md) · [Full System Audit](FULL_SYSTEM_AUDIT_2026_07_16.md) · [Codex Backlog](CODEX_BACKLOG_2026_07_16.md#db-01--canonical-migration-replay-and-rls-evidence)

## Why this is a separate operator gate

The development Supabase project `pphdqkurxneyagvnnjdt` currently exposes `public` through the Data API; it is separate from Production, where Supabase is not configured. Live read-only audit found that the containment migration is absent from the 10-entry migration ledger and anonymous rows remain visible across organization/profile/project/membership, analysis/report/comparison, Data Room, validation, pilot, source/external snapshot and audit tables. Source snapshot policies explicitly admit `project_key IS NULL`, making any such row anonymous through PostgREST even when `project_id` is non-null. `anon` also retains `SELECT/INSERT/UPDATE/DELETE` on `public.spatial_ref_sys` and can execute 748 `public` RPCs, including 79 volatile functions and six `SECURITY DEFINER` functions. `geoai_healthcheck` is already SELECT-only. All four Storage buckets are private, but `storage.objects` currently has zero policies; Storage is nonfunctional rather than safe for activation. A final advisor refresh returned 14 security findings (one ERROR for RLS-disabled `spatial_ref_sys`; 13 WARN for public PostGIS and executable `SECURITY DEFINER` functions) and 78 performance findings (60 unused-index INFO; 18 multiple-permissive-policy WARN). The public application uses browser-local state and does not need this Data API surface.

Schema review also found that `profiles.auth_user_id` lacks a proven unique/FK identity contract; the legacy authenticated AOI `FOR ALL` policy checks membership without an explicit role; `projects.organization_id` and security-critical `project_memberships` fields are nullable; and there is no proven `UNIQUE(project_id, user_id)` or composite organization/project consistency constraint. The TypeScript strict matcher currently expects both `profile.organizationId` and an organization membership even though `profiles.organization_id`/`organization_memberships` are absent from the live schema. The owner must choose one identity model before constraints are applied. Recommended baseline: global profile + `organization_memberships` + `project_memberships`, with TS/session DTOs and RLS changed together.

The normal Supabase migration role is not the owner of the managed PostGIS or Storage objects. Plain migration-file `REVOKE` or Storage policy DDL cannot be assumed to work and may abort an otherwise valid transaction. No ACL, API schema, extension or Storage change was made during this audit.

The candidate Storage policy SQL is therefore kept outside the automatic migration chain at [`supabase/operator/20260716_storage_policy_owner_path_review.sql`](../supabase/operator/20260716_storage_policy_owner_path_review.sql). It is review-only and must not be run through the normal domain migration role.

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
- healthcheck, if retained, is SELECT-only and contains no infrastructure inventory;
- the owner records the canonical identity model; profile/Auth uniqueness/FK, organization membership, project membership uniqueness and organization/project consistency constraints match TS/session/RLS semantics;
- the legacy AOI authenticated `FOR ALL` policy is removed; replacement INSERT/UPDATE/DELETE policies enforce an explicit allowed role and pass wrong-role tests;
- application repositories use the caller's validated JWT through a request-scoped Supabase client and never use service-role credentials for user authorization;
- Storage object policies are created through the supported owner path, bind bucket/path/object owner to the validated caller/project and pass no-session, wrong-user and wrong-project negative tests;
- the four-private-bucket/zero-policy baseline is not loosened until canonical server-resolved paths, magic-byte/scan quarantine and safe download headers are verified end to end;
- PostGIS/Storage upgrade procedure re-runs the ACL/API-surface check;
- clean replay and upgrade replay pass before `20260716000000_geoai_pre_auth_security_containment_v1.sql` is promoted from review draft.

This runbook authorizes no live change. Owner-controlled Supabase configuration remains a separate action.
