# RLS Positive / Negative Test Plan v1

Date: 2026-07-08

Status: Preview-only test plan. Mock validated only until real Preview Auth users and table-level evidence are approved.

Required caveat: **Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.**

## Scope

This plan defines positive and negative RLS checks for the GeoAI Preview schema. It does not create users, write data, apply migrations, change RLS policies, configure Production or enable hard access.

Personas come from `docs/AUTH_TEST_USERS_MEMBERSHIP_FIXTURES_V1.md`:

- `owner`
- `admin`
- `analyst`
- `client_viewer`
- `no_membership`
- `other_org_member`
- `inactive_member`
- `insufficient_role`

`no_session` is a request state, not a stored Preview user.

## Common Expectations

- Positive tests use the allowed Preview organization and allowed Preview project.
- Negative tests must include no-session, wrong-organization and insufficient-role cases where applicable.
- Read checks must prove row visibility is scoped to the allowed organization/project.
- Write checks must remain blocked until the relevant route, membership role and RLS policy behavior are explicitly verified.
- Audit expectations are evidence requirements only; `audit_events` is not a certified audit trail.
- No test fixture may include passwords, credentials, real client emails, live auth identifiers, raw env values or confidential file names/content.

## Table Test Matrix

| Table | Purpose | Positive User / Persona | Negative User / Persona | No-Session Behavior | Wrong-Organization Behavior | Insufficient-Role Behavior | Read Expectation | Write Expectation | Audit Expectation | Rollback / Diagnostic Note | Caveat |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `organizations` | Tenant container for project and profile access. | `owner` reads allowed organization. | `other_org_member` cannot read allowed organization. | No protected organization rows. | Other org cannot see allowed org. | Viewer roles do not manage org records. | Allowed org members only. | Operator/admin path only after explicit approval. | Non-secret organization access metadata. | Inspect organization predicates if cross-org rows appear. | Required caveat applies. |
| `profiles` | Server-verified profile mapping. | `owner` reads own mapped profile. | `no_membership` cannot infer unrelated profiles. | No protected profile rows. | Other org cannot discover allowed-org profiles through project access. | Role escalation must not broaden profile reads. | Self or scoped demo profile only. | Outside this harness. | Profile resolution metadata without credentials. | Inspect `auth_user_id` mapping and demo read policy. | Required caveat applies. |
| `project_memberships` | Role and membership source. | `admin` reads scoped membership evidence. | `no_membership` cannot read allowed-project memberships. | No protected membership rows. | Other org cannot read allowed-project membership rows. | Viewer cannot manage memberships. | User/scoped project memberships only. | Approved admin path only after evidence. | Membership changes require non-secret audit events. | Inspect membership predicates and grants. | Required caveat applies. |
| `projects` | Workspace and tenancy boundary. | `client_viewer` reads allowed project. | `other_org_member` cannot read allowed project. | No protected project rows. | Other org cannot read allowed project. | Client viewer cannot manage project records. | Allowed project members only. | Admin/owner only after hard-access approval. | Project view/update metadata. | Inspect `project_id`/`project_key` predicates. | Required caveat applies. |
| `aois` | Screening geometries. | `analyst` reads allowed project AOIs. | `insufficient_role` cannot write AOIs. | No protected AOI rows. | Other org cannot read or write AOIs. | Client viewer cannot create/update AOIs. | Allowed project members only. | Analyst/admin/owner only after Preview verification. | AOI create/update/delete metadata. | Inspect AOI read and write policy checks. | Required caveat applies. |
| `analysis_runs` | Analysis result payloads and lineage. | `analyst` reads allowed analyses. | `other_org_member` cannot read allowed analyses. | No protected analysis rows. | Other org cannot read allowed project analyses. | Client viewer cannot create/mutate runs. | Allowed project members only. | Approved server route plus verified RLS behavior. | Run metadata without confidential payload leakage. | Inspect project scoping. | Required caveat applies. |
| `reports` | Screening reports and printable package metadata. | `client_viewer` reads allowed reports. | `other_org_member` cannot read allowed reports. | No protected report rows. | Other org cannot read allowed project reports. | Read/export roles cannot mutate reports. | Allowed project members only. | Verified server-side generation only. | Report generation/preview metadata. | Inspect linked project predicates. | Required caveat applies. |
| `comparison_sets` | Shortlist and comparison results. | `analyst` reads allowed comparisons. | `no_membership` cannot read comparisons. | No protected comparison rows. | Other org cannot read allowed project comparisons. | Client viewer cannot create comparisons. | Allowed project members only. | Analyst/admin/owner after Preview verification. | Comparison creation metadata. | Inspect membership predicates. | Required caveat applies. |
| `uploaded_datasets` | User-provided dataset metadata. | `analyst` reads allowed dataset metadata. | `insufficient_role` cannot upload/mutate metadata. | No protected upload metadata rows. | Other org cannot read upload metadata. | Client viewer cannot upload/mutate datasets. | Allowed project members only. | Analyst/admin/owner with storage path verification. | Upload metadata creation event. | Inspect storage/table policy alignment. | Required caveat applies. |
| `data_room_assets` | Data room evidence metadata. | `analyst` reads allowed assets. | `other_org_member` cannot read assets. | No protected data-room rows. | Other org cannot read allowed project data-room rows. | Client viewer cannot add files. | Allowed project members only. | Verified membership plus storage controls. | Asset add/update/delete metadata. | Inspect project and storage path alignment. | Required caveat applies. |
| `validation_checklist_items` | Validation tasks and follow-up evidence. | `analyst` reads allowed validation items. | `no_membership` cannot read validation items. | No protected checklist rows. | Other org cannot read validation items. | Client viewer cannot update validation status. | Allowed project members only. | Analyst/admin/owner after Preview verification. | Validation status change metadata. | Inspect project predicates. | Required caveat applies. |
| `pilot_workflows` | Project workflow and decision context. | `client_viewer` reads allowed workflow. | `other_org_member` cannot read workflow. | No protected workflow rows. | Other org cannot read allowed workflows. | Client viewer cannot manage workflows. | Allowed project members only. | Analyst/admin/owner approval path. | Workflow edit metadata. | Inspect organization/project scoping. | Required caveat applies. |
| `pilot_client_inputs` | Requested client inputs and intake evidence metadata. | `analyst` reads allowed inputs. | `no_membership` cannot read inputs. | No protected input rows. | Other org cannot read inputs. | Client viewer cannot manage input request metadata. | Allowed project members only. | Analyst/admin/owner after verification. | Input change metadata. | Inspect project/membership predicates. | Required caveat applies. |
| `pilot_deliverables` | Deliverable checklist and linked references. | `client_viewer` reads allowed deliverables. | `other_org_member` cannot read deliverables. | No protected deliverable rows. | Other org cannot read deliverables. | Client viewer cannot mutate deliverable status. | Allowed project members only. | Analyst/admin/owner after verification. | Deliverable status metadata. | Inspect project and organization predicates. | Required caveat applies. |
| `source_registry_snapshots` | Source readiness metadata. | `client_viewer` reads public/global and scoped rows allowed to the project. | `other_org_member` cannot read protected project-scoped source rows. | Only explicit public/demo rows may be visible. | Other org cannot read project-scoped rows. | Client viewer cannot mutate snapshots. | Global/public rows plus allowed project rows only. | Trusted ingestion path only. | Source sync metadata only. | Separate null/global allowances from project rows. | Required caveat applies. |
| `external_data_snapshots` | External normalized snapshot manifests. | `client_viewer` reads public/global and scoped rows allowed to the project. | `other_org_member` cannot read protected project-scoped snapshot rows. | Only explicit public/demo rows may be visible. | Other org cannot read project-scoped rows. | Client viewer cannot import/mutate snapshots. | Global/public rows plus allowed project rows only. | Trusted ingestion path only. | Import/source metadata only. | Inspect global allowances and project predicates. | Required caveat applies. |
| `ai_decision_scores` | Score metadata and decision caveats. | `analyst` reads allowed score rows. | `other_org_member` cannot read scores. | No protected score rows. | Other org cannot read allowed project scores. | Client viewer cannot create score rows. | Allowed project members only. | Verified server route plus audit evidence. | Model/prompt metadata without unsupported claims. | Inspect selected AOI and project predicates. | Required caveat applies. |
| `audit_events` | Non-certified operational audit events. | `owner` reads scoped audit events. | `other_org_member` cannot read allowed-project audit events. | No protected audit events except explicit demo markers. | Other org cannot read allowed-project events. | Client viewer cannot read broad audit logs. | Actor/scoped project rows only. | Trusted server runtime only. | Events must not contain credentials or confidential content. | Inspect actor/project predicates. | Required caveat applies. |

## Mock Harness Mapping

The code model in `src/lib/access/rls-verification-plan.ts` converts this plan into four mock cases per table:

- positive read with the table's positive persona;
- negative no-session read;
- negative wrong-organization or no-membership read;
- negative insufficient-role write.

This is enough to validate plan coverage, but not enough to prove Supabase policy behavior. Live Preview RLS verification still requires approved test users, profile mapping, project memberships and route/database evidence.

## Evidence Required Before Hard Access

- `/api/auth/session` verifies real Preview sessions safely.
- Profile mapping is verified for positive and negative personas.
- Project membership positive and negative checks are recorded.
- Table-level RLS positive and negative checks are recorded.
- Storage path scope checks are recorded separately.
- Audit evidence contains only non-secret metadata.
- Rollback to soft mode is tested.
- Production approval remains separate and explicit.
