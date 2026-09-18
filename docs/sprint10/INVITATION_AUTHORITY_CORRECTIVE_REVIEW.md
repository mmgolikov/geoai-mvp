# Sprint 10 Invitation Authority Corrective Review

Status: Read-only corrective review complete
Date: 2026-09-18
Reviewer: `dev_1`
Integration head reviewed: `8497f03f4395a25be42359fb3e4e392e46d8d8b8`
Parent: `8ac071f15ec6a412898a7f534f2908c7a56ed624`
Commit: `fix(auth): preserve recipient suspensions and existing stronger roles`
Decision: **GO for root-owned local integration; NO hosted apply or readiness promotion**

## Review boundary

This corrective review inspected only the exact commit diff for:

- `supabase/migrations/20260918182922_geoai_invitation_authority_hardening_v1.sql`
- `supabase/tests/sprint10_invitation_authority.sql`

The integration commit also updates migration-ledger and database packet/check scripts. Those mechanical integration files are outside this corrective authorization review and are not independently accepted by this document.

No database, network, hosted service, migration, credential, live account or external system was accessed. Root's reported `229/229` pgTAP result on an isolated populated copy and the invitation-suite increase from 35 to 46 assertions are accepted as supplied evidence, not independently executed here. No root-owned file was edited by this review.

## Corrective decision

The prior P1 recipient-status bypass is closed.

### Recipient status is fail-closed for every issuer

Migration lines 250–264 now reject acceptance when the recipient already has:

- an organization membership in `disabled` or `suspended` status; or
- a project membership in `disabled` status for the invitation project.

The check is independent of issuer role. Platform and organization owners cannot use invitation acceptance as a reactivation shortcut. Reactivation must use the existing explicit versioned membership command and its dedicated authorization, concurrency and audit path.

The check runs after canonical organization/project/invitation locks and current issuer revalidation, but before any membership, invitation-acceptance or audit write.

### Existing stronger roles are preserved

Organization upsert lines 290–299 use the explicit hierarchy:

`owner > admin > member`

Project upsert lines 301–315 use:

`owner > admin > analyst > viewer > client_viewer`

When an existing role is stronger than the invitation role, the existing role is retained. Equal roles remain unchanged. A stronger invitation role upgrades the membership only after the existing issuer-ceiling checks have authorized that assignment. The status guards prevent the upsert from silently reactivating a disabled or suspended membership.

The earlier owner/admin issuer-authority guard remains in place. A lower-authority issuer still cannot consume an invitation against an existing elevated membership merely because the role-preserving upsert would avoid a downgrade.

### Corrective tests match the required behavior

Test lines 126–141 add evidence that:

- project invitation acceptance cannot reactivate an organization-disabled recipient;
- project invitation acceptance cannot reactivate an organization-suspended recipient;
- even an organization owner must use explicit membership reactivation;
- invitation acceptance cannot reactivate a disabled project membership;
- an existing project analyst accepts a lower viewer invitation without downgrade;
- an existing organization owner accepts an authorized member invitation without downgrade.

All denial cases use the existing full-state hash over organization memberships, project memberships, invitations and admin audit events. Therefore a denied acceptance must preserve all four state classes.

The successful-acceptance audit count was updated from five to seven to cover the two new successful preservation paths. The reported fixture correction uses an independent recipient to avoid the real unique-pending-invitation constraint; the constraint itself was not weakened.

## Reconfirmed unchanged controls

- Current issuer identity, Auth status, membership status, tenant scope and assignment ceiling are revalidated before acceptance writes.
- Exact organization/project scope remains enforced.
- Canonical lock order remains organization → project → invitation.
- Invitation tokens remain single-use and email-bound.
- Existing owner/admin authority checks and last-owner triggers remain active.
- The private issuer predicate remains unavailable to `anon`, `authenticated` and `service_role` callers.
- No new RPC, anonymous grant, service-role grant, schema exposure or historical migration edit is introduced.
- The full unapplied chain retains the current permanent-identity/no-MFA Product decision; this review does not reopen that decision.

## Remaining non-blocking risks and evidence limits

1. The added suite directly proves preservation and denied reactivation, but does not contain a named positive assertion for an existing weaker membership upgraded to a stronger role. The SQL hierarchy implements that path deterministically; a focused viewer→analyst or member→admin regression assertion would improve future change detection.
2. The 46-test suite is transactional authorization evidence, not a two-session concurrency test. Re-run the existing create/accept/revoke lock-order exercise after final integration because the accept function body changed.
3. The role hierarchy is encoded as literal ordered arrays. Any future role addition or semantic reorder must update both arrays and focused preservation/upgrade tests in the same change.
4. Root's `229/229` receipt is local isolated-copy evidence only. It does not certify the physical hosted migration ledger, function owners, grants, RLS, Auth users or runtime behavior.
5. The reviewed migration remains forward-only and unapplied. Exact-target inventory, backup/rollback, full clean replay, populated upgrade replay, grants/advisors review and post-apply physical readback remain mandatory before any hosted action.

## Rollback and authority

Root remains the sole integration owner. This GO permits only inclusion of exact commit `8497f03f4395a25be42359fb3e4e392e46d8d8b8` in the local Candidate integration sequence. It does not authorize push to protected branches, hosted Supabase apply, Auth configuration, Preview/Production deployment or maturity promotion.

Rollback preparation must retain the prior exact definitions of `geoai_private.admin_create_invitation` and `geoai_private.admin_accept_invitation`, plus the pre-migration database backup. Any rollback must be a separately reviewed forward migration; no destructive rollback was performed here.

Mandatory caveat: “Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.”
