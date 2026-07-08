# RLS Verification Harness v1 Change Request

Date: 2026-07-08

Status: Preview-only scaffold. No hard access, Production env, Supabase writes or migrations are included.

Required caveat: **Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.**

## Problem

GeoAI has a Supabase Preview schema, storage readiness, Auth/Hard Access scaffold and membership verification scaffold, but RLS evidence is still not directly testable in a repeatable way. The repository needs a Preview-only RLS harness that defines positive and negative table checks before real Preview users are created and before any hard-access rollout is considered.

## Business Reason

Confidential workflows require evidence that database policies block no-session, no-membership, wrong-organization and insufficient-role access. A static harness gives engineering and product reviewers a shared test plan now, while keeping demo fallback and governance gates intact.

## Users

- GeoAI operator preparing approved Preview-only Auth users.
- Engineering reviewer validating table coverage and mocked plan consistency.
- Security/product reviewer checking that confidential access remains blocked until real Preview evidence exists.

## Affected Tables

- `organizations`
- `profiles`
- `project_memberships`
- `projects`
- `aois`
- `analysis_runs`
- `reports`
- `comparison_sets`
- `uploaded_datasets`
- `data_room_assets`
- `validation_checklist_items`
- `pilot_workflows`
- `pilot_client_inputs`
- `pilot_deliverables`
- `source_registry_snapshots`
- `external_data_snapshots`
- `ai_decision_scores`
- `audit_events`

## Affected API Routes

- New read-only readiness route: `/api/security/rls-readiness`
- Existing status routes reviewed for alignment:
  - `/api/auth/session`
  - `/api/pilot-backend/status`
  - `/api/platform/activation-status`
  - `/api/projects`
  - `/api/storage/health`

No route is changed to enforce hard access.

## Data Impact

- No Supabase migrations are added or applied.
- No Supabase data is inserted, updated or deleted.
- No Supabase users, profiles, memberships, storage files, buckets, secrets or environment values are created in code.
- The harness uses symbolic personas and static plan metadata only.

## Engineering Impact

- Adds a static RLS verification plan model covering the required tables.
- Adds a `test:rls-plan` script that validates table coverage, case structure, secret-free fixtures and non-verified status.
- Adds a read-only App Router route that exposes plan/readiness metadata without calling Supabase.
- Updates Auth Hard Access planning docs so hard access remains gated on real RLS evidence.

## Risks

- Mock validation proves plan completeness only; it does not prove live Supabase policy behavior.
- Existing RLS policies and Preview demo read policies must still be tested with real Preview Auth users.
- Storage object policies remain a separate verification track.
- Future operators may confuse `mock_validated` with live verification unless PR/docs keep the distinction explicit.

## Acceptance Criteria

- Preview-only RLS verification harness exists.
- Required tables have positive and negative test cases.
- Mock plan validation passes.
- No real Supabase writes are performed.
- No migrations are applied.
- No Production env changes are made.
- Hard access remains disabled.
- Confidential pilot remains blocked.
- Data honesty caveat remains present.

## Rollback Plan

1. Revert this branch if the static plan, API route or validation script regresses build or API checks.
2. Keep `GEOAI_ACCESS_ENFORCEMENT_MODE=soft`.
3. Confirm `/api/pilot-backend/status` keeps `canRunDemoWorkflow=true` and `canRunConfidentialPilot=false`.
4. Confirm `/api/security/rls-readiness`, if present in Preview, reports `mock_validated` or `preview_unverified`, never verified without explicit evidence.
5. Do not modify Production env or Supabase data as part of rollback.

## Out Of Scope

- No merge by Codex.
- No Production env configuration.
- No hard access enablement.
- No Supabase migrations.
- No Supabase writes.
- No RLS policy changes.
- No Auth enforcement changes.
- No real users, passwords, emails, memberships or live auth identifiers in code.
- No secrets or environment values.
- No confidential files.
- No debug endpoints.
- No live official DLD or GeoDubai integration.
- No official parcel proof, official zoning, cadastral validation, ownership verification, certified valuation, approved site or guaranteed best use claim.
