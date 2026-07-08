# Auth Test Users / Membership Verification v1 QA Checklist

Date: 2026-07-08

Status: Preview-only QA checklist.

Required caveat: **Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.**

## Preview Environment Checklist

- [ ] Production environment variables are unchanged.
- [ ] `GEOAI_ACCESS_ENFORCEMENT_MODE=soft` remains the default.
- [ ] `NEXT_PUBLIC_AUTH_MODE=supabase_auth` is used only in approved Preview testing.
- [ ] Supabase public config points to the approved Preview project only.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` remains server-only.
- [ ] No secrets, JWTs, passwords or raw env values are added to code or docs.

## Test Persona Creation Checklist

- [ ] `owner` persona exists only in Preview.
- [ ] `admin` persona exists only in Preview.
- [ ] `analyst` persona exists only in Preview.
- [ ] `client_viewer` persona exists only in Preview.
- [ ] `no_membership` persona exists only in Preview.
- [ ] `other_org_member` persona exists only in Preview.
- [ ] `inactive_member` persona exists only in Preview.
- [ ] `insufficient_role` persona exists only in Preview.
- [ ] No real client emails or confidential identities are used.

## Profile Mapping Checklist

- [ ] Each positive persona maps from Supabase Auth user id to `profiles.auth_user_id`.
- [ ] Active personas have active server-verified profiles.
- [ ] Inactive profile negative case returns denial in hard-mode checks.
- [ ] Client-editable `user_metadata` is not used for authorization.

## Project Membership Checklist

- [ ] Allowed project belongs to expected organization.
- [ ] Positive personas have active organization membership.
- [ ] Positive personas have active project membership.
- [ ] Project membership role is one of `owner`, `admin`, `analyst`, `viewer`, `client_viewer`.
- [ ] Disabled/invited membership is denied in hard-mode checks.
- [ ] Other-organization membership is denied in hard-mode checks.

## Negative Tests

- [ ] No session -> 401 in future hard mode.
- [ ] No profile -> 403 in future hard mode.
- [ ] Inactive profile -> 403 in future hard mode.
- [ ] No organization membership -> 403 in future hard mode.
- [ ] No project membership -> 403 in future hard mode.
- [ ] Inactive membership -> 403 in future hard mode.
- [ ] Wrong organization -> 403 in future hard mode.
- [ ] Insufficient role -> 403 in future hard mode.
- [ ] Soft mode remains advisory and does not break demo flow.

## Role / Action Matrix Tests

- [ ] read allowed for `client_viewer`, `viewer`, `analyst`, `admin`, `owner`.
- [ ] export allowed for `client_viewer`, `viewer`, `analyst`, `admin`, `owner`.
- [ ] write allowed for `analyst`, `admin`, `owner` only.
- [ ] upload allowed for `analyst`, `admin`, `owner` only.
- [ ] review allowed for `analyst`, `admin`, `owner` only.
- [ ] validate allowed for `analyst`, `admin`, `owner` only.
- [ ] manage allowed for `admin`, `owner` only.

## API Route Smoke

- [ ] `/api/health` returns 200.
- [ ] `/api/auth/session` returns 200 and safe JSON.
- [ ] `/api/pilot-backend/status` returns 200.
- [ ] `/api/platform/activation-status` returns 200.
- [ ] `/api/projects` returns 200.
- [ ] `/api/storage/health` returns 200.
- [ ] `/workspace` returns 200.
- [ ] `/projects` returns 200.
- [ ] No route response exposes JWTs, service-role keys, passwords or raw env values.

## Rollback

- [ ] Reset Preview `GEOAI_ACCESS_ENFORCEMENT_MODE=soft`.
- [ ] Remove any Preview-only test users if the validation run is abandoned.
- [ ] Confirm `/api/pilot-backend/status` keeps `canRunDemoWorkflow=true`.
- [ ] Confirm `/api/pilot-backend/status` keeps `canRunConfidentialPilot=false`.
- [ ] Do not copy Preview env to Production.

## Production Approval Gate

Do not request Production hard access until:

- [ ] Preview Auth sessions are verified with approved test users.
- [ ] Profile mapping positive and negative tests are recorded.
- [ ] Membership positive and negative tests are recorded.
- [ ] RLS positive and negative tests are recorded.
- [ ] Storage scope tests are recorded.
- [ ] Audit evidence is recorded without secrets.
- [ ] Rollback to soft mode is tested.
- [ ] Explicit Production approval exists.

This checklist does not claim live official integrations, official parcel, official zoning, cadastral validation, ownership verification, certified valuation, approved site, guaranteed best use, production-ready status or pilot-ready status.
