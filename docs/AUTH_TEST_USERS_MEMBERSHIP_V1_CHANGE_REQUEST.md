# Auth Test Users / Membership Verification v1 Change Request

Date: 2026-07-08

Status: Preview-only scaffold

Required caveat: **Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.**

## Problem

GeoAI has a Preview-only Auth / Hard Access scaffold, but the expected test personas and membership verification path are not yet specified or test-covered in enough detail. Without that, future hard-access work could confuse demo compatibility with real project authorization.

## Business Reason

Confidential workflows need clear evidence that Auth sessions, profiles, organization memberships, project memberships, roles and negative access cases behave as expected before any hard enforcement is enabled. This branch creates that verification foundation without creating real users, enabling hard access or touching Production.

## Users

- GeoAI operator preparing Preview Auth test users outside the codebase.
- Engineering reviewer validating role/action behavior with mocked inputs.
- Product/security reviewer checking that confidential access remains blocked until Preview evidence exists.

## Affected Routes And Screens

- `/api/auth/session`
- `/api/pilot-backend/status`
- `/api/platform/activation-status`
- `/api/projects`
- `/api/storage/health`
- `/workspace`
- `/projects`

No UI or design implementation is included.

## Data Impact

- No Supabase migrations are added.
- No Supabase writes are performed.
- No Supabase users, passwords, live auth IDs, secrets or environment values are created in code.
- Fixture personas are documentation-only and use symbolic identifiers.
- Membership verification uses mocked/testable inputs only.

## Engineering Impact

- Adds a pure membership-verification helper for Preview test scaffolding.
- Extends access-decision tests to cover role/action matrix and negative membership cases.
- Preserves public demo/local fallback and existing route behavior.
- Keeps hard access disabled by default and unverified until explicit Preview evidence exists.

## Risks

- The helper verifies decision logic only; it does not prove Supabase Auth, RLS or Storage policy correctness.
- Persona fixtures must still be created manually in the approved Preview Supabase project when that work is authorized.
- Browser Supabase Auth session handling and route-level hard enforcement remain future work.
- Soft mode can return advisory metadata while still allowing demo workflows; reviewers must not interpret that as tenant security.

## Acceptance Criteria

- Preview-only membership verification scaffold is implemented.
- Fixture specification exists for owner, admin, analyst, client viewer, no membership, other org member, inactive member and insufficient role.
- Tests cover:
  - read allowed for `client_viewer` and higher;
  - export allowed for `client_viewer`/`viewer` and higher;
  - write/upload/review/validate allowed for `analyst` and higher;
  - manage allowed for `admin`/`owner` only;
  - no membership denied in hard mode;
  - other org member denied in hard mode;
  - inactive member denied in hard mode;
  - insufficient role denied in hard mode;
  - soft mode returns advisory metadata without breaking demo flow.
- `/api/pilot-backend/status` continues to report `canRunDemoWorkflow=true` and `canRunConfidentialPilot=false` unless all hard-access gates are verified.
- No secrets, JWTs, raw env values, passwords or real auth user ids are introduced.

## Rollback Plan

1. Revert this branch if the helper or tests regress build/API contract validation.
2. Keep `GEOAI_ACCESS_ENFORCEMENT_MODE=soft`.
3. Confirm `/api/pilot-backend/status` reports confidential access blocked.
4. Confirm `/workspace`, `/projects`, `/api/projects` and `/api/storage/health` remain available in public demo/local fallback where configured.
5. Do not change Production env as part of rollback.

## Out Of Scope

- No merge by Codex.
- No Production env configuration.
- No hard access enablement.
- No Supabase Auth users, passwords, emails, memberships or data created in code.
- No Supabase migrations or writes.
- No secrets or env values.
- No debug endpoints.
- No confidential files.
- No Figma/design implementation.
- No live official DLD or GeoDubai integration.
- No official parcel, official zoning, cadastral validation, ownership verification, certified valuation, approved site, guaranteed best use, production-ready or pilot-ready claim.
