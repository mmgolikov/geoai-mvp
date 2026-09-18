# Development recovery and upgrade checkpoint

18 September 2026, 21:22 Moscow. Target: `geoai-dev` / `pphdqkurxneyagvnnjdt`; never Production.

## Recovery evidence

The normal authenticated Supabase CLI is linked to the exact development ref. No existing API key was printed, copied into a document, or rotated. Six private backup files are outside Git at `/private/tmp/geoai-dev-backup-20260918-r4fQ2K`, directory mode 0700 and files 0600: roles, application schema, Auth/Storage/migration schemas, data, migration history, and the sole Storage readiness object (338 bytes). This is a local recovery set, not a new hosted service or a public artifact.

An isolated local Colima profile `geoai-sprint10` runs container `geoai-sprint10-restore`, image `public.ecr.aws/supabase/postgres:17.6.1.141`, digest `sha256:ba10e934f0a59990379f78ab9ed93926f1c291dd61a12fe4026f4202f1b89770`. The container has **no network and no published ports**. Global Docker context was not changed. A new `geoai_restore_probe` database was created from template0. Original dumps were restored in one `ON_ERROR_STOP` transaction after supplying empty platform schemas and `supabase_realtime` publication expected by the official export. Earlier failed attempts rolled back; original dumps were not edited.

All **31 selected table counts and content digests match the current hosted source**, including every public/DLD table, Auth users, Storage objects/buckets and the migration ledger. Representative counts: 5 projects, 10 analyses, 5 comparisons, 242 audit events, 0 Auth users, 4 buckets, 1 Storage object, 12 migrations. Vault secrets count is zero. This proves restoration of the existing application database and required current Auth/Storage state; it does not prove provider delivery, functional login, future replication subscriptions, or an arbitrary disaster restore into a different hosted version. The sole existing Storage object's bytes were separately downloaded without modifying the source.

## Root decision on the no-MFA review

The independent review correctly identifies eight new Admin paths using permanent identity and explicit roles without an AAL2 requirement. It also confirms that **none of these Admin paths or AAL2 enforcement exists on the actual target**. The preceding AAL2 migration is an unapplied intermediate design, not deployed security to be removed. Current application and documented MVP authentication deliberately use email/password/permanent identity without MFA.

Root therefore does not treat the intermediate-draft comparison as a new blanket authorization blocker. Applying the complete reviewed chain to original12 retires broad anonymous demo access and adds active-identity, tenant, membership, role, audit, concurrency and last-owner checks. It must not be applied to the different rehearsal target where AAL2 was deployed. No provider/MFA configuration is changed. No public/shared/platform administrator account will be created for testing; synthetic product personas must receive only their isolated test scope. The absence of MFA remains a clearly stated Admin hardening limitation, not an MFA assurance claim.

This decision does **not** waive a concrete privilege-escalation finding, data preservation, API-only exposure, backup, exact migration-order, actual-role/JWT tests, or final acceptance. Root still requires populated-clone upgrade, fresh exact fingerprint, one-version ledger repair, exact eight-version dry-run, scoped apply and postchecks. Hosted schema apply has not happened at this checkpoint.

## Operational controls

The populated-clone upgrade also preserves all **355 original rows across 19 public application tables**, compared in both directions with `EXCEPT ALL` on their original columns. Only the expected `profiles.updated_at` timestamp from system-profile backfill is excluded; profile IDs and original content are unchanged. All constraints validate, the sole legacy profile becomes `system`, no platform membership/invitation/Auth account is auto-created, and the expected 16 API functions exist. This is database compatibility evidence, not clearance of the invitation P1 or real JWT/API acceptance.

**21:25 update — hosted apply is held for a concrete P1, not an MFA permission question.** An independent review found that `admin_create_invitation` lets an organization admin invite themselves as organization owner; `admin_accept_invitation` then upgrades their existing membership, bypassing the direct membership mutation guard. The original12 target has none of these RPCs. A new forward migration and before/after negative regression are required; immutable historical migrations will not be edited. The original eight files applied successfully only to the restored local clone. The eventual exact pending batch/order and hashes must be refreshed to include the correction.

- Canonical 21-file SQL tree: `ef22daea39a65b4d23666956fc51573647306ee3077f1ee99f201c5ce37687be`.
- Fresh CI `35377577084` on `00ef491`: clean replay **183/183** and synthetic noncontiguous upgrade **183/183**; protected browser personas **4/4**, HTTPS boundaries **22/22**. Overall CI failed an outdated application test contract; later demo tests were not run.
- The old auto-apply wrapper remains prohibited for this populated target. No reset or seed flag is permitted.
- Recovery restores are local only. Restoring old broad grants into hosted development is not an automatic rollback; on failure stop app writes, preserve data and prefer a reviewed forward correction.
- Keep private backup and restore container while the upgrade is being verified; stop the task-owned container/profile after recovery evidence is complete. Do not delete user data or unrelated containers.

Official procedure used: [Supabase CLI backup and restore](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore).

## Forward correction checkpoint — 21:49 Moscow

Root completed the interrupted worker's defensive forward migration, committed as `bd3d8ea` and integrated as `780b51c`. No original migration changed. Invitation creation and acceptance now use current permanent-identity/tenant/role authority; acceptance also rejects overwriting existing elevated memberships by a lower-authority issuer. Outstanding invitations do not retain authority after the issuer is demoted, disabled or banned. Existing valid owner/member/project-viewer paths remain tested. No pre-fix execution was performed; the original finding is a source review, not a claimed live incident.

The new 35-assertion rollback-only pgTAP suite passed. All three original suites plus the new suite then passed **218/218** on `geoai_invitation_probe`, an isolated copy of the populated restored-and-upgraded database. The first combined run stopped because the manually created `extensions` schema lacked standard platform usage grants; root compared it with the same image's default `postgres` database and supplied those standard grants only in the local probe. Final plans: 71 + 73 + 39 + 35, zero failures. This is populated-clone regression, not a fresh clean replay, real JWT, or hosted acceptance.

Canonical inventory is now **22 files = 12 immutable hosted + 1 pre-ledger reconciliation + 9 pending**, retaining seven historical version holes. Static inventory, synthetic upgrade contract, migration security surface, identity contract and 47-case non-writing preflight passed. Exact tree hashes must be re-recorded after final independent review. Hosted ledger/schema/data/Auth/Storage remain unchanged. Independent defensive review and fresh CI are still required before hosted apply.

Test-harness refresh `e5fd119` received independent GO and was integrated as `8ac071f`. Real-password harness `917ce0c` is **not integrated/not live-ready**: independent review found post-dispatch-only mutation observation and false-green skipped runs under incomplete configuration; corrections are assigned. No transactional mail or paid API test has run.

### Corrective recipient-status review — 21:50 Moscow

The independent review rejected the first invitation correction because an otherwise permitted project invitation could reactivate an existing disabled/suspended organization member. Root fixed that in `8497f03`: invitation acceptance may not reactivate disabled/suspended organization membership or disabled project membership for any issuer, including an owner. Reactivation remains an explicit versioned membership-administration action. Acceptance also preserves an already stronger organization/project role; an invitation is not a hidden downgrade action.

The new suite now contains **46 assertions**. Final combined isolated populated-copy regression passed **229/229** (71 + 73 + 39 + 46), zero failed assertions. An earlier extra fixture used the same pending recipient and correctly hit the existing uniqueness constraint; root changed only that fixture recipient, leaving the uniqueness rule intact. The correction is undergoing bounded independent rereview. These local results do not waive fresh clean/synthetic-upgrade CI or hosted postchecks.

**21:53 rereview:** independent bounded GO on exact `8497f03` closes the recipient-status finding and accepts the normal preservation/upgrade logic. The full review and prior NO-GO are retained adjacent to this document. Root retains standing founder authority for the exact development apply, but has not yet exercised it. Local GO is not live acceptance.
