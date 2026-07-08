# Auth Hard Access v1 Plan

Date: 2026-07-08
Branch context: `supabase-storage-readiness-v1`
Status: planning only

Required caveat: **Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.**

This plan prepares the next controlled branch after Supabase Storage Readiness v1. It does not enable hard access, configure Production environment variables, apply migrations, add secrets, seed users, enforce Supabase Auth, or authorize protected client-file usage.

## Current Baseline

- PR #49 verifies Supabase Storage readiness in Preview only.
- Private storage buckets exist for data-room assets, validation evidence, report exports and AOI imports.
- Signed URL marker verification and storage health audit marker verification are complete in Preview.
- `/api/pilot-backend/status` can report `status=storage_ready`.
- Demo workflows can run in soft public-demo mode.
- Confidential client use remains blocked until Auth, memberships, RLS and hard access are verified.
- Production Supabase env remains disabled unless a separate approved task configures it.

## Supabase Auth Mode Requirements

Hard access may be tested only in a Preview branch/runtime where:

- `NEXT_PUBLIC_AUTH_MODE=supabase_auth` is set for Preview only.
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are configured for the Preview Supabase project.
- `SUPABASE_SERVICE_ROLE_KEY` remains server-only and is never exposed to client code.
- `GEOAI_ACCESS_ENFORCEMENT_MODE=hard` is tested only after Preview Auth and memberships are verified.
- `GEOAI_ALLOW_DEMO_PUBLIC` is reviewed so demo workflows remain explicitly separated from protected project access.
- Production hard access remains disabled until explicit approval.

## User And Profile Mapping

The next branch should verify the user identity chain before enforcing route access:

1. Supabase Auth user exists in the Preview project.
2. `profiles.auth_user_id` maps to the Supabase Auth user id.
3. Profile status is active for access tests.
4. User identity is read server-side from Supabase Auth, not from user-editable metadata.
5. Route responses expose only safe user/profile fields.
6. Audit events record access checks without logging secrets, JWTs or raw env values.

## Organization And Project Membership Checks

Hard access requires project membership checks that prove:

- profile belongs to the expected organization through active membership data;
- project belongs to the expected organization;
- project membership exists for the active profile and project;
- role is sufficient for the requested action:
  - `read`: client viewer or higher;
  - `export`: client viewer/viewer or higher;
  - `write`, `upload`, `review`, `validate`: analyst or higher;
  - `manage`: admin/owner only;
- opposite-organization and no-membership users receive 401/403 responses;
- demo project access remains explicit and cannot imply tenant security.

## RLS Policy Verification Strategy

RLS verification must prove database behavior independently from API helper behavior:

- Run Preview-only positive tests with a user who has project membership.
- Run Preview-only negative tests with:
  - no session;
  - authenticated user without profile;
  - profile without project membership;
  - member of another organization/project;
  - insufficient role for write/upload/export.
- Verify RLS on core tables used by protected routes, including projects, AOIs, analysis runs, reports, comparison sets, data-room assets, validation evidence, evidence reviews, uploaded datasets, report packages and audit events where applicable.
- Verify Storage object path and metadata access align with project and organization membership.
- Confirm service-role-only operations stay server-side and are not treated as client authorization.
- Record results in docs before any Production configuration request.

## Hard Access Rollout Gates

Do not enable hard access beyond Preview until all gates pass:

| Gate | Required Result |
| --- | --- |
| Auth mode | `/api/auth/session` returns Supabase Auth mode with a real authenticated Preview user. |
| Profiles | Auth user maps to exactly one active profile used by access checks. |
| Memberships | Positive and negative membership checks are verified. |
| RLS | Table-level positive and negative tests pass for protected data. |
| Storage | Private bucket upload/download is scoped to allowed project paths only. |
| Audit | Access checks and storage actions record non-secret audit events. |
| Route enforcement | Protected routes return 401/403 for blocked sessions and 200 for allowed sessions. |
| Rollback | Soft mode can be restored quickly without schema changes. |
| Approval | Production hard access has explicit approval. |

## Preview-Only Test Users

Create test users only in the approved Preview Supabase project:

- `owner`: organization owner/admin for allowed project.
- `analyst`: can read/write/upload/review within allowed project.
- `client_viewer`: can read/export but cannot write/upload/manage.
- `no_membership`: authenticated user with no project membership.
- `other_org_member`: authenticated user in a different organization/project.

Do not seed real client identities or confidential files for hard-access validation.

## Routes To Test

Required Preview route checks:

- `/api/auth/session`
- `/api/pilot-backend/status`
- `/api/platform/activation-status`
- `/api/projects`
- `/api/data-room`
- `/api/storage/health`

Additional protected-route checks should include:

- `/api/aois`
- `/api/analysis-runs`
- `/api/reports`
- `/api/comparison-sets`
- `/api/validation`
- `/api/validation/evidence`
- `/api/storage/evidence-files`
- `/api/storage/evidence-files/upload-intent`

## Rollback Plan

If hard-access Preview validation fails:

1. Reset `GEOAI_ACCESS_ENFORCEMENT_MODE=soft` in Preview.
2. Keep `NEXT_PUBLIC_AUTH_MODE` in the safest previously verified mode.
3. Confirm `/api/pilot-backend/status` reports confidential pilot blocked.
4. Confirm `/workspace` and `/projects` remain usable as public demo workflows if demo public access is allowed.
5. Do not promote Preview env to Production.
6. Document failing route, user fixture, expected status and actual status.

## Out Of Scope

- No Production hard access until explicit approval.
- No Production Supabase env configuration.
- No Supabase Auth enforcement in this PR.
- No new migrations in this planning note.
- No secrets, client file uploads, live official integrations or certified evidence claims.
- No production-ready or pilot-ready claims.
