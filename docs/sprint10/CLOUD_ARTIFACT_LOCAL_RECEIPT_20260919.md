# Cloud artifact persistence — local forward-upgrade evidence

Date: 19 September 2026, Moscow. Candidate only; not released.

The independently reviewed server/SQL candidate `6420f8048bda22a46ba1d95cfb1e14d66a4f0952` was integrated by root as `bf9f0e6` (following `4c51a10`). The migration SHA-256 remains `6b804d0164fba82e01b7744f64d904a51d1a9c91f0c4927c6e3274448840eefe`.

## Executed evidence

- Local PostgreSQL 17.6, container `geoai-sprint10-restore`, network `none`, published ports `{}`.
- New database `geoai_cloud_artifacts_20260919_r2`, cloned from the retained 22-migration local `geoai_invitation_probe`; no existing database was reset or deleted.
- Exact migration 23 applied. API routine count increased from 16 to 18. The private rollout scope remains disabled.
- `supabase/tests/sprint10_point_object_project_artifacts.sql`: **59/59 PASS**, psql exit 0. All fixtures ran within one rolled-back transaction.
- Covers exact replay, immutable results, Find/Create view CAS, stale and split-key conflicts, direct-RPC envelope and byte limits, creator isolation, membership revocation, old JWT after ban, and disabled scope.
- Post-test readback: 5 projects, 10 analysis runs, 5 comparison sets, 242 audit events; 0 cloud artifacts; scope disabled; 0 disabled user triggers. These counts match the retained local original counts, not a new hosted content-hash certification.

## Preparation failures retained honestly

An initial fresh database `geoai_cloud_artifacts_20260919` could not replay the complete chain because the bare image template lacked the complete managed Storage foundation and its public schema owner differed. No application migration succeeded there; it was retained and not presented as a clean replay.

The populated clone had ten application tables owned by `supabase_admin` from earlier local replay, unlike the intended `postgres` migration owner. The first new pgTAP attempt therefore failed with a permission error. Root corrected only those ten table owners in the new test database, preserving ACLs/data and excluding extension-owned `spatial_ref_sys`, then reran the unchanged migration's pgTAP suite successfully. This preparation is not a hosted schema change or a product authorization workaround.

## Open acceptance gates

- Full clean Supabase-stack replay and whole-chain regression in fresh CI.
- Two-session same-actor quota-boundary races and different-actor control.
- Data-preserving deactivation twice with readback.
- Exact development migration, enabled-scope verification, genuine Auth/RPC and browser save/reopen acceptance.
- Existing browser-local content upload is still subject to the separate pending founder decision. No upload transport was exercised.

No hosted database, Production, real API key, email or paid provider call was used in this local test.
