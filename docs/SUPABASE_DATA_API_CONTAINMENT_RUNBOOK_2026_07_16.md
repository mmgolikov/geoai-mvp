# Supabase Data API Containment — Operator Prerequisite

Status: Development draft/not apply-ready; owner path executed and evidenced on isolated rehearsal only
Last verified: 2026-07-20
Owner: GeoAI Database / Security Operations
Authority: Current mandatory operator decision and evidence procedure before DB/Auth/Storage activation
Successor: None; any replacement must update `DOCUMENTATION_INDEX.md`, `CURRENT_RELEASE_STATE.md` and the Confluence Hub
Depends on: DB-01 / GitHub #85
Navigation: [Confluence Hub](https://geoaimvp.atlassian.net/wiki/spaces/PH/overview) · [Documentation Index](DOCUMENTATION_INDEX.md) · [Current Release State](CURRENT_RELEASE_STATE.md) · [Full System Audit](FULL_SYSTEM_AUDIT_2026_07_16.md) · [Codex Backlog](CODEX_BACKLOG_2026_07_16.md#db-01--canonical-migration-replay-and-rls-evidence)

Release context: merged PR #97 at `b915a831d5e5b28eab5fd26ac86059820e7e4a32` is the `public_demo_prototype` Production baseline. This operator runbook remains unapplied to development/Production; see [CURRENT_RELEASE_RECEIPT.json](CURRENT_RELEASE_RECEIPT.json).

## Why this is a separate operator gate

The development Supabase project `pphdqkurxneyagvnnjdt` exposes `public` through the Data API; it is separate from Production, where Supabase is not configured. The 2026-07-16 11:31 UTC snapshot found `ACTIVE_HEALTHY` on PostgreSQL `17.6.1.141`, 20 public tables with RLS on 19 (`spatial_ref_sys` is the only exception), zero Auth users, four buckets and zero `storage.objects` policies. A later read-only migration-ledger check still shows exactly ten historical entries and none of the six current candidates. `anon` and `authenticated` each retained 22 public-table `TRUNCATE` grants, which RLS cannot constrain. Advisors returned 14 security findings (one ERROR, 13 WARN) and 71 performance findings (53 INFO, 18 WARN). No development write was performed. The public application uses browser-local state and does not need this Data API surface.

## Executed isolated rehearsal evidence

The owner path was executed only on Free rehearsal `bkmfcjzalcvdsdvyxpgi`, never on development or Production. `authenticator` is pinned to `pgrst.db_schemas=api`; `api` contains 14 reviewed functions and no relations. Positive/negative HTTP proves anonymous health 200, `public` 406/`PGRST106`, and base-table lookup in `api` 404/`PGRST205`. Managed PostGIS ACL and `spatial_ref_sys` RLS were not mutated. Hosted pgTAP passes `183/183` after forward lifecycle remediation; all test users rolled back. See the [machine receipt](SUPABASE_AUTH_REHEARSAL_RECEIPT_2026_07_16.json) and exact [operator SQL](../supabase/operator/20260716_data_api_api_only_owner_path.sql).

Supabase advisors continue to enumerate managed PostGIS/public objects and intentional no-policy deny-all tables even with the manual PostgREST override. Do not hide those findings or “fix” them by changing managed extension objects. The HTTP boundary is the reachability evidence. Storage and Realtime remain outside this control and need separate policies/personas.

Development schema review found that `profiles.auth_user_id` lacks a proven unique/FK identity contract; the legacy authenticated AOI `FOR ALL` policy checks membership without an explicit role; `projects.organization_id` and security-critical `project_memberships` fields are nullable; and there is no proven `UNIQUE(project_id, user_id)` or composite organization/project consistency constraint. The repository model selects global profiles plus `organization_memberships` and `project_memberships`, with capabilities and matching TS/RLS semantics. Hosted SQL replay/personas certify it on rehearsal only; development upgrade/drift and real HTTP/browser personas remain uncertified.

The normal Supabase migration role is not the owner of the managed PostGIS or Storage objects. Plain migration-file `REVOKE` or Storage policy DDL cannot be assumed to work and may abort an otherwise valid transaction. No managed PostGIS ACL/extension/RLS or Storage policy change was made. The only API-schema configuration change was the recorded rehearsal-only `pgrst.db_schemas=api` owner override.

The repository contains an exact ledger manifest, pre-ledger repair and six fail-closed candidate migrations. All six plus the Data API owner operator were executed only on rehearsal; none was applied to development/Production, and Storage policies remain review-only everywhere. Before profile RPC, the application AUTH boundary requires UUID `claims.sub` equal to canonical `auth.getUser().id` and explicit claims/user `is_anonymous === false`; mismatch is 401 and anonymous identity 403. Exact-target SSR/PKCE/session/logout, TOTP MFA, hashed invitation onboarding and AAL2 Admin routes are implemented locally and pass static/build/HTTP-smoke checks. Product repository readiness remains false, and no hosted real-user HTTP/JWT/RLS persona is certified. SOURCE-01 therefore remains a development/Production-unapplied custody contract, not a connected source. SOURCE-02 exposes only an unsigned `reserve_or_replay` correlation claim: exact execution/idempotency hashes bind environment, tenant, connector/provider/parser, rights, broker, endpoint/network/body/window, actor is omitted only from the shared acquisition key and authorization is `none`. External revalidation, trusted execution, transactional writing and an atomic pre-fetch reservation remain absent/required. The registry is empty, there is no fetch/env/secrets/persistence and Production is denied.

The rehearsal additionally passed rollback-only table-level concurrency in two independent backend sessions for the canonical organization→project→invitation lock order, covering invitation create→accept and create→revoke with explicit lock/statement timeouts and zero residual rows/deadlocks. This is not an authenticated RPC/HTTP concurrency persona and must not be promoted as one.

Repository-local evidence head `e999c5a07d3ced6c95f2eb44f6a5f03a9c17caea`, tree `73b7c198813d6aede795b8b186bd4d58e741b181`, passed run `29500488408`. DB job `87627894968` passed clean 71/71, the synthetic exact-ten-ledger-prefix/pre-ledger-repair/three-pending-migration/security-surface rehearsal and a second 71/71. Quality artifact `8376235675` and database artifact `8376300064` preserve the receipts. This rehearsal is not a current-development clone, live-derived upgrade replay, drift, live apply or DB-01 certification. Local Docker remains unavailable; live Data API/ACL containment, advisor parity, real HTTP/JWT/Storage/source personas and trusted-worker write evidence remain separate requirements.

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
- the clean/synthetic-prefix/second-pgTAP sequence is preserved by run `29500488408`, job `87627894968`; a live-derived current-development clone and drift check must still pass before any review draft is promoted;
- the final candidate preserves a successful GitHub `database-replay` receipt covering clean start, deterministic reset and all 71 pgTAP assertions; workflow presence alone is not evidence;
- quality artifact `8376235675` and database artifact `8376300064` bind the exact head; they do not replace live-derived upgrade/drift/persona evidence;
- source-provider writes remain blocked until a trusted worker design proves rights checks, idempotent receipts, immutable release/artifact creation, quarantine/revocation, rollback and negative public-application write access.

This runbook authorizes no live change. Owner-controlled Supabase configuration remains a separate action.
