# Sprint 10 Invitation Authority Hardening Review

Status: Read-only review complete
Date: 2026-09-18
Reviewer: `dev_1`
Candidate reviewed: `bd3d8ea798bde9c3bf2c2499362ff65e6a88e8af`
Decision: **NO-GO for integration pending one recipient-membership status correction**

## Review boundary

Reviewed only:

- `supabase/migrations/20260918182922_geoai_invitation_authority_hardening_v1.sql`
- `supabase/tests/sprint10_invitation_authority.sql`

This review did not execute a database, network request, hosted operation, migration, live account or offensive reproduction. Root's reported isolated populated-clone result of 35 passing pgTAP assertions is accepted as supplied evidence, not independently reproduced here. The migration is forward-only and does not edit historical migration files.

The original target with 12 migrations does not contain these RPCs. This migration is compatible only as the final step of the complete unapplied invitation/Auth chain; it is not a standalone patch for the original target.

## Blocking finding

### P1 — a project-scoped issuer can reactivate an organization-disabled recipient

Migration lines 52–58 allow an active project owner/admin to issue an invitation with organization role `member` and a lower project role. Acceptance lines 274–291 then upsert both memberships and unconditionally set their status to `active`.

The elevated-membership guard at lines 252–270 protects only existing `owner` and `admin` roles. It does not protect an existing organization `member` whose status is `disabled` or `suspended`. A project-scoped administrator can therefore invite that user's email to the project; if the user accepts, the organization membership conflict path changes the tenant-level status back to `active`. This bypasses the existing explicit organization administration boundary and differs from `admin_set_project_member`, which requires the target to already have an active organization membership.

The pgTAP suite tests a disabled **issuer** at lines 111–115, but not a disabled or suspended **recipient**. Denied paths otherwise use the strong state-hash check, so the missing persona can be added without weakening the test approach.

Required correction:

1. At accept time, inspect the recipient's existing organization membership while the organization lock is held.
2. For a project-only issuer, allow organization membership creation only when no membership exists; require an existing membership to already be active. Never reactivate `disabled` or `suspended` organization state through project invitation acceptance.
3. Decide and encode the org-owner/platform behavior explicitly. If reactivation is allowed for those roles, it must use a current-authority check and an auditable transition; otherwise deny and require the existing membership-administration RPC.
4. Add rollback-only pgTAP personas for disabled and suspended organization members, proving denial with membership, invitation and audit state unchanged.

## Confirmed behavior

### Normal invitation creation and acceptance

- Organization owner issuance of an elevated organization invitation is covered at test lines 95–105.
- Organization admin issuance of an ordinary member invitation is covered at lines 108–110.
- Project admin issuance of a lower project role and later acceptance are covered at lines 111–116.
- Organization owner issuance of a project-owner invitation is covered at lines 117–118.
- Platform admin issuance of an elevated organization invitation is covered at lines 123–124.
- The API signatures and return shapes remain compatible with the existing `api.create_invitation` and `api.accept_invitation` wrappers.
- The current no-MFA Product contract remains intact through the existing `require_aal2()` compatibility wrapper; this review does not reopen that product decision.

### Current issuer role and account status

`geoai_private.can_issue_invitation` requires:

- an active user profile;
- a permanent, confirmed, non-deleted and non-banned Auth user;
- active platform, organization and project memberships as applicable;
- an active organization;
- an active or demo project in the exact organization;
- a target role within the issuer's current assignment ceiling.

Organization admins cannot issue owner/admin organization roles. Organization and project admins cannot issue owner/admin project roles. Members, nonmembers and foreign-tenant owners are denied. The tests cover these role ceilings, cross-tenant denial, issuer demotion, issuer ban and disabled project membership.

### Organization and project scope

- The project join requires both project ID and organization ID.
- Project membership is joined through the same project and organization.
- Project-scoped issuance additionally requires an active organization membership for the issuer.
- Cross-tenant issuance is denied and covered by pgTAP.
- Projectless invitations require a null project role; project invitations require an allowed project role.

### Revalidation after issuer changes

Acceptance re-evaluates the invitation's `created_by` identity, current statuses, current memberships, current organization/project state and the original requested role assignment before any membership or audit write. Demoted, banned and disabled-project issuers are covered by negative tests with exact state preservation.

### Existing elevated-role protection

The migration blocks an issuer from replacing an existing organization or project `owner`/`admin` membership unless that issuer could currently assign the existing elevated role. The pgTAP suite covers organization-owner and project-owner preservation against lower-authority issuers.

This protection is deliberately narrower than general role preservation: existing project `analyst` can still be replaced by `viewer` or `client_viewer`, and an issuer that can assign an existing owner/admin role may still replace it through acceptance. Those transitions are not necessarily privilege escalations, but they bypass the optimistic row-version and dedicated membership-change audit semantics of the explicit membership RPCs. Product/Engineering must either accept this invitation-consent behavior explicitly or preserve the stronger current role and use the dedicated membership RPC for downgrades.

### Lock ordering

- Creation locks organization, then project when present, before inserting the invitation.
- Acceptance resolves immutable scope without locking, then locks organization, project and invitation in canonical order and revalidates the invitation scope under the row lock.
- Issuer authorization is checked after those scope locks.
- Membership upserts follow organization then project order.
- The new acceptance path retains the forward remediation's canonical ordering and does not reintroduce the historical invitation-first order.

Concurrency remains a limitation of this review: the new pgTAP file is transactional authorization evidence, not a concurrent-session lock/deadlock test. Existing prior concurrency evidence must be rerun after integration if the function body changes again.

### Grants

- The new predicate is `SECURITY DEFINER`, has an empty search path and has EXECUTE revoked from `public`, `anon`, `authenticated` and `service_role`.
- Private create/accept implementations retain the existing authenticated-only EXECUTE grant required by the security-invoker API wrappers.
- No new API function, anonymous grant, service-role grant or Data API schema exposure is introduced.
- The test confirms the predicate is not directly executable by runtime roles. A final integration replay should also reassert the complete API/private function privilege matrix because this two-file suite does not exhaustively test every create/accept grant.

## Remaining limitations and required integration evidence

- Correct the P1 recipient-status bypass and add its negative personas before integration.
- Decide whether invitation acceptance may downgrade an existing non-owner role or whether all higher-role preservation is required.
- Replay the complete migration chain on a clean database and on the isolated populated upgrade clone.
- Re-run the full Auth/RLS pgTAP suite, the 35 invitation assertions and concurrent create/accept/revoke lock tests.
- Verify exact function owners, schema usage, EXECUTE grants, RLS state, advisors and migration ledger after replay.
- Do not treat local replay as hosted Supabase certification. No hosted apply or hosted readback occurred in this review.

## Rollback

Before any hosted application, retain the pre-migration database backup and the exact prior definitions of `geoai_private.admin_create_invitation` and `geoai_private.admin_accept_invitation`. The candidate is forward-only; rollback must restore those function definitions and remove the new helper only through an explicit reviewed migration. No rollback action was performed here.

Mandatory caveat: “Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.”
