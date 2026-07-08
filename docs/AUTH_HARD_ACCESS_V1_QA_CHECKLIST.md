# Auth / Hard Access v1 Preview QA Checklist

Date: 2026-07-08

Status: Preview-only checklist. Do not apply to Production without explicit approval.

Required caveat: **Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.**

## Preview Environment Gate

- [ ] `NEXT_PUBLIC_AUTH_MODE=supabase_auth` is configured only for the approved Preview runtime.
- [ ] `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` point to the approved Preview Supabase project.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` remains server-only and is not exposed to client code.
- [ ] `GEOAI_ACCESS_ENFORCEMENT_MODE=soft` remains the default until hard-mode checks pass.
- [ ] Production env remains unchanged.

## Test Users

Create or verify Preview-only test users outside the codebase:

| User | Required Result |
| --- | --- |
| Owner/admin | Can read, export, write, upload, review, validate and manage allowed project after hard mode is approved for testing. |
| Analyst | Can read, export, write, upload, review and validate; cannot manage. |
| Client viewer | Can read/export only. |
| No profile | Authenticated but receives no-profile denial in hard-mode checks. |
| No membership | Authenticated profile receives no-membership denial. |
| Other organization | Receives wrong-organization denial. |

## Profile Mapping

- [ ] Supabase Auth user id maps to `profiles.auth_user_id`.
- [ ] Profile is server-verified; client-editable `user_metadata` is not used for authorization.
- [ ] `/api/auth/session` returns only safe user/profile fields.
- [ ] `/api/auth/session` never returns JWTs, bearer tokens, service keys or raw env values.

## Membership Checks

- [ ] Positive project membership check passes for allowed project.
- [ ] Negative no-membership check fails.
- [ ] Negative other-organization check fails.
- [ ] Negative insufficient-role check fails for write/upload/review/validate/manage.
- [ ] Role/action matrix matches:
  - read: `client_viewer` or higher;
  - export: `client_viewer`/`viewer` or higher;
  - write/upload/review/validate: `analyst` or higher;
  - manage: `admin`/`owner` only.

## RLS Verification

- [ ] RLS is enabled on GeoAI project-scoped tables.
- [ ] Positive allowed-user table reads pass with authenticated Preview user.
- [ ] Negative no-session table reads fail.
- [ ] Negative no-profile table reads fail.
- [ ] Negative no-membership table reads fail.
- [ ] Negative other-organization table reads fail.
- [ ] Write/update policies are separately tested where relevant.
- [ ] Results are recorded before hard access is enabled outside Preview.

## Storage Verification

- [ ] Private buckets remain private.
- [ ] Signed URL marker remains verified.
- [ ] Storage object paths are scoped by project/organization where protected files are tested.
- [ ] Protected client files are not uploaded until Auth, memberships and RLS checks pass.

## Audit Verification

- [ ] `/api/storage/health` audit marker remains recorded.
- [ ] Auth/access checks record only non-secret metadata.
- [ ] No JWT, bearer token, raw env value or service-role key appears in audit payloads.

## Routes To Test

- [ ] `/api/auth/session`
- [ ] `/api/pilot-backend/status`
- [ ] `/api/platform/activation-status`
- [ ] `/api/projects`
- [ ] `/api/data-room`
- [ ] `/api/storage/health`
- [ ] `/api/aois`
- [ ] `/api/analysis-runs`
- [ ] `/api/reports`
- [ ] `/api/comparison-sets`
- [ ] `/api/validation`
- [ ] `/api/validation/evidence`
- [ ] `/api/storage/evidence-files`
- [ ] `/api/storage/evidence-files/upload-intent`

## Rollback

- [ ] Reset Preview `GEOAI_ACCESS_ENFORCEMENT_MODE=soft`.
- [ ] Confirm `/api/pilot-backend/status` reports demo workflow available and confidential workflow blocked.
- [ ] Confirm `/workspace`, `/projects`, `/api/projects` and `/api/data-room` remain usable in public demo/local fallback mode where allowed.
- [ ] Do not promote Preview env to Production.

## Production Approval Gate

Production hard access remains blocked until:

- [ ] Auth sessions are verified with real Preview users.
- [ ] Profile mapping is verified.
- [ ] Project membership positive and negative tests pass.
- [ ] RLS policy positive and negative tests pass.
- [ ] Storage access controls pass.
- [ ] Audit evidence is recorded without secrets.
- [ ] Rollback has been tested.
- [ ] Explicit Production approval is documented.

This checklist does not claim live official integrations, official parcel, official zoning, cadastral validation, ownership verification, certified valuation, approved site, guaranteed best use, production-ready status or pilot-ready status.
