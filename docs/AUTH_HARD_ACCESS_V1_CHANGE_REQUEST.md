# Auth / Hard Access v1 Preview Scaffold Change Request

Date: 2026-07-08

Status: Preview scaffold only

Required caveat: **Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.**

## Problem

GeoAI now has Supabase Preview database and storage readiness, but protected-route access is still demo-safe and advisory. Future confidential workflows need a documented and testable Auth / project membership decision path before any hard access rollout.

## Business Reason

The product needs a controlled bridge from public demo workflows to Preview-only authenticated project access checks. This reduces ambiguity around what is ready now, what remains gated, and what evidence is required before any protected client data path can be considered.

## Users

- GeoAI operator validating Preview runtime readiness.
- Preview test users mapped to Supabase Auth profiles and project memberships.
- Internal reviewers checking that demo access remains available while confidential use remains blocked.

## Affected Screens And Routes

- `/api/auth/session`
- `/api/pilot-backend/status`
- `/api/platform/activation-status`
- `/api/projects`
- `/api/data-room`
- `/api/storage/health`
- Future protected route candidates: `/api/aois`, `/api/analysis-runs`, `/api/reports`, `/api/comparison-sets`, `/api/validation`, `/api/storage/evidence-files`.

No visual redesign is included.

## Data Impact

- No Supabase migrations are added.
- No Supabase data writes are performed by this change.
- No users, profiles, memberships, storage files, buckets or secrets are created in code.
- Access decisions use server-verified inputs only and do not trust client-editable user metadata for authorization.

## Design Impact

- None. Existing public demo and workspace/project UI remain unchanged.
- No Figma or design-system implementation is included.

## Engineering Impact

- `/api/auth/session` returns a safer public-demo and Supabase Auth response shape without exposing JWTs, raw environment values or service keys.
- A central access decision helper models project access states and role/action requirements.
- A route-guard utility provides a future soft/hard enforcement wrapper without enabling global hard enforcement.
- Platform readiness remains conservative: Auth, memberships, RLS and hard enforcement stay unverified until explicit Preview evidence exists.

## Risks

- Supabase Auth session verification currently supports server-side bearer tokens only. Browser cookie/session integration remains future work.
- Project profile and membership lookups are not globally enforced yet.
- RLS policy correctness must be verified directly in Supabase Preview before any confidential workflow is enabled.
- Existing demo clients may still see compatibility fields, but those fields must not be interpreted as tenant security.

## Acceptance Criteria

- Preview-only scaffold is implemented.
- Hard access is disabled by default.
- Production environment is not touched.
- Demo workflow remains available.
- Confidential pilot remains blocked until Auth sessions, profile mapping, project memberships, RLS policies and hard access enforcement are verified.
- `/api/auth/session` returns `authMode=demo_public`, `hardAccessEnabled=false` and no authenticated Supabase user in public demo mode.
- Supabase Auth mode returns only safe user/profile summaries and never raw tokens, JWTs, service keys or raw env values.
- Access helper supports these statuses: `unauthenticated`, `demo_public`, `authenticated_without_profile`, `profile_without_project_membership`, `allowed_project_member`, `wrong_organization`, `insufficient_role`, `hard_access_disabled`.
- Role/action mapping is test-covered for read, export, write/upload/review/validate and manage.

## Rollback

1. Keep or reset `GEOAI_ACCESS_ENFORCEMENT_MODE=soft`.
2. Keep Production Supabase/Auth env disabled unless separately approved.
3. Revert this branch if session or status responses regress demo workflows.
4. Confirm `/api/pilot-backend/status` reports `canRunDemoWorkflow=true` and `canRunConfidentialPilot=false`.
5. Confirm `/workspace`, `/projects`, `/api/projects` and `/api/data-room` remain available as public demo/local fallback where configured.

## Out Of Scope

- No Production environment configuration.
- No hard access enforcement rollout.
- No Supabase Auth users, profiles or memberships created in code.
- No Supabase migrations, bucket changes, storage writes or secrets.
- No design/Figma implementation.
- No live official DLD or GeoDubai integration.
- No official parcel, official zoning, cadastral validation, ownership verification, certified valuation, approved site, guaranteed best use, production-ready or pilot-ready claim.
