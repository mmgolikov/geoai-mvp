# RLS Verification Harness v1 QA Checklist

Date: 2026-07-08

Status: Preview-only checklist. Do not use for Production rollout without explicit approval.

Required caveat: **Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.**

## Preview Environment Checklist

- [ ] Production environment variables are unchanged.
- [ ] `GEOAI_ACCESS_ENFORCEMENT_MODE=soft` remains the default unless a later approved Preview hard-mode test starts.
- [ ] `NEXT_PUBLIC_AUTH_MODE=supabase_auth` is used only in approved Preview testing.
- [ ] Supabase public config points to the approved Preview project only.
- [ ] Server-only Supabase credentials remain server-only.
- [ ] No secrets, credentials, raw environment values or confidential files are added to code or docs.
- [ ] `/api/security/rls-readiness` returns metadata only and performs no Supabase writes.

## Test Persona Checklist

- [ ] `owner` persona exists only in Preview when approved.
- [ ] `admin` persona exists only in Preview when approved.
- [ ] `analyst` persona exists only in Preview when approved.
- [ ] `client_viewer` persona exists only in Preview when approved.
- [ ] `no_membership` persona exists only in Preview when approved.
- [ ] `other_org_member` persona exists only in Preview when approved.
- [ ] `inactive_member` persona exists only in Preview when approved.
- [ ] `insufficient_role` persona exists only in Preview when approved.
- [ ] `no_session` is tested as an unauthenticated request state, not as a stored user.

## Profile Mapping Checklist

- [ ] Positive personas map from Supabase Auth user to `profiles.auth_user_id`.
- [ ] Active personas have active server-verified profiles.
- [ ] Inactive profile case is denied.
- [ ] Profile responses expose only safe user/profile fields.
- [ ] Client-editable user metadata is not used for authorization.

## Membership Checklist

- [ ] Allowed project belongs to expected organization.
- [ ] Positive personas have active organization membership.
- [ ] Positive personas have active project membership.
- [ ] Negative no-membership case is denied.
- [ ] Negative inactive-member case is denied.
- [ ] Negative other-organization case is denied.
- [ ] Negative insufficient-role write/manage case is denied.
- [ ] Role/action behavior matches the membership fixture specification.

## RLS Table Positive Tests

- [ ] `organizations`
- [ ] `profiles`
- [ ] `project_memberships`
- [ ] `projects`
- [ ] `aois`
- [ ] `analysis_runs`
- [ ] `reports`
- [ ] `comparison_sets`
- [ ] `uploaded_datasets`
- [ ] `data_room_assets`
- [ ] `validation_checklist_items`
- [ ] `pilot_workflows`
- [ ] `pilot_client_inputs`
- [ ] `pilot_deliverables`
- [ ] `source_registry_snapshots`
- [ ] `external_data_snapshots`
- [ ] `ai_decision_scores`
- [ ] `audit_events`

## RLS Table Negative Tests

- [ ] `organizations`
- [ ] `profiles`
- [ ] `project_memberships`
- [ ] `projects`
- [ ] `aois`
- [ ] `analysis_runs`
- [ ] `reports`
- [ ] `comparison_sets`
- [ ] `uploaded_datasets`
- [ ] `data_room_assets`
- [ ] `validation_checklist_items`
- [ ] `pilot_workflows`
- [ ] `pilot_client_inputs`
- [ ] `pilot_deliverables`
- [ ] `source_registry_snapshots`
- [ ] `external_data_snapshots`
- [ ] `ai_decision_scores`
- [ ] `audit_events`

## No-Session Tests

- [ ] No-session reads are denied for protected organization/project/profile rows.
- [ ] No-session reads are denied for protected project artifacts.
- [ ] Any public/demo source snapshot visibility is explicitly scoped and documented.
- [ ] No-session responses do not expose credential or session details.

## Wrong-Organization Tests

- [ ] Other-organization user cannot read allowed organization/project rows.
- [ ] Other-organization user cannot read project artifact rows.
- [ ] Other-organization user cannot read project-scoped source/snapshot rows.
- [ ] Other-organization user cannot read allowed-project audit rows.

## Insufficient-Role Tests

- [ ] `client_viewer` can read allowed records where read access is expected.
- [ ] `client_viewer` cannot write AOIs.
- [ ] `client_viewer` cannot upload datasets or data-room assets.
- [ ] `client_viewer` cannot update validation checklist items.
- [ ] `client_viewer` cannot manage project, workflow, membership or deliverable records.

## Audit / Event Expectations

- [ ] Access checks record only non-secret metadata when route enforcement is wired.
- [ ] Storage and data-room actions do not record confidential file content.
- [ ] `audit_events` is treated as operational evidence only, not a certified audit trail.
- [ ] Audit write/read evidence is recorded before hard access leaves Preview.

## Route Smoke

- [ ] `/api/health`
- [ ] `/api/auth/session`
- [ ] `/api/pilot-backend/status`
- [ ] `/api/platform/activation-status`
- [ ] `/api/projects`
- [ ] `/api/storage/health`
- [ ] `/api/security/rls-readiness`
- [ ] `/workspace`
- [ ] `/projects`

Expected route status:

- [ ] All checked routes return 200.
- [ ] Auth remains `demo_public` unless approved Preview Auth env says otherwise.
- [ ] `hardAccessEnabled=false`.
- [ ] `canRunDemoWorkflow=true`.
- [ ] `canRunConfidentialPilot=false`.
- [ ] RLS status is `mock_validated`, `preview_unverified` or configured-unverified, not verified without evidence.
- [ ] No response exposes credentials, raw env values or confidential content.

## Rollback

- [ ] Reset Preview `GEOAI_ACCESS_ENFORCEMENT_MODE=soft`.
- [ ] Confirm `/api/pilot-backend/status` keeps demo workflow available and confidential workflow blocked.
- [ ] Confirm `/api/security/rls-readiness` still reports non-live RLS status.
- [ ] Remove any abandoned Preview-only test users through an approved operational path.
- [ ] Do not copy Preview env to Production.

## Production Approval Gate

Production hard access remains blocked until:

- [ ] Auth sessions are verified with approved Preview users.
- [ ] Profile mapping is verified.
- [ ] Project membership positive and negative tests pass.
- [ ] RLS positive and negative tests pass table-by-table.
- [ ] Storage scope checks pass.
- [ ] Audit evidence is recorded without secrets.
- [ ] Rollback to soft mode is tested.
- [ ] Explicit approval is documented.

This checklist does not claim live official integrations, official parcel proof, official zoning, cadastral validation, ownership verification, certified valuation, approved site or guaranteed best use.
