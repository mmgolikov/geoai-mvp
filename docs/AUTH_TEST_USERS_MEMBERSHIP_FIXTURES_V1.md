# Auth Test Users / Membership Fixtures v1

Date: 2026-07-08

Status: fixture specification only. Do not store real emails, passwords, live auth user ids or secrets here.

Required caveat: **Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion.**

## Fixture Principles

- Personas are Preview-only and symbolic.
- Real Supabase users must be created manually in the approved Preview project only after explicit approval.
- Authorization data must come from server-verified profiles and memberships, not user-editable metadata.
- Soft mode remains advisory and must not break public demo workflows.
- Future hard mode must return 401/403 for blocked personas and 200 only for allowed project members.

## Shared Symbolic Context

| Field | Symbolic Value |
| --- | --- |
| Allowed organization | `org_allowed_preview` |
| Other organization | `org_other_preview` |
| Allowed project | `project_allowed_preview` |
| Allowed project key | `preview-authorized-project` |
| Other project key | `preview-other-project` |

## Personas

| Persona | Purpose | Profile State | Organization Membership | Project Membership | Allowed Actions | Denied Actions | Soft Mode Expected | Future Hard Mode Expected |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `owner` | Full positive-control user. | Active profile in `org_allowed_preview`. | Active member of `org_allowed_preview`. | Active `owner` on `project_allowed_preview`. | read, export, write, upload, review, validate, manage. | None for scoped project actions. | 200 with advisory metadata. | 200 for all scoped actions. |
| `admin` | Manage-capable non-owner. | Active profile in `org_allowed_preview`. | Active member of `org_allowed_preview`. | Active `admin` on `project_allowed_preview`. | read, export, write, upload, review, validate, manage. | None for scoped project actions. | 200 with advisory metadata. | 200 for all scoped actions. |
| `analyst` | Work/review user without management rights. | Active profile in `org_allowed_preview`. | Active member of `org_allowed_preview`. | Active `analyst` on `project_allowed_preview`. | read, export, write, upload, review, validate. | manage. | 200 with advisory metadata. | 200 for allowed actions; 403 for manage. |
| `client_viewer` | Read/export client-facing user. | Active profile in `org_allowed_preview`. | Active member of `org_allowed_preview`. | Active `client_viewer` on `project_allowed_preview`. | read, export. | write, upload, review, validate, manage. | 200 with advisory metadata. | 200 for read/export; 403 for denied actions. |
| `no_membership` | Authenticated user with no project access. | Active profile in `org_allowed_preview`. | Active member of `org_allowed_preview`. | None for `project_allowed_preview`. | None for scoped project actions. | read, export, write, upload, review, validate, manage. | 200 with advisory metadata; hard-mode warning expected. | 403 `no_project_membership`. |
| `other_org_member` | Negative control for tenant boundary. | Active profile in `org_other_preview`. | Active member of `org_other_preview`. | Active membership only on other org/project. | None for allowed project. | read, export, write, upload, review, validate, manage on allowed project. | 200 with advisory metadata; hard-mode warning expected. | 403 `wrong_organization`. |
| `inactive_member` | Negative control for disabled membership. | Active profile in `org_allowed_preview`. | Active member of `org_allowed_preview`. | Disabled or invited membership on `project_allowed_preview`. | None until active. | read, export, write, upload, review, validate, manage. | 200 with advisory metadata; hard-mode warning expected. | 403 `inactive_membership`. |
| `insufficient_role` | Negative control for action-level role checks. | Active profile in `org_allowed_preview`. | Active member of `org_allowed_preview`. | Active `client_viewer` or `viewer` on `project_allowed_preview`. | Depends on role: read; export for viewer/client viewer. | write, upload, review, validate, manage. | 200 with advisory metadata; hard-mode warning expected. | 403 `insufficient_role` for denied actions. |

## Expected Role Matrix

| Action | Minimum Role |
| --- | --- |
| read | `client_viewer` |
| export | `client_viewer` or `viewer` |
| write | `analyst` |
| upload | `analyst` |
| review | `analyst` |
| validate | `analyst` |
| manage | `admin` or `owner` |

## Data That Must Not Appear In Fixtures

- Passwords.
- Magic-link tokens.
- JWTs or bearer tokens.
- Service-role keys.
- Raw environment values.
- Real client emails.
- Live Supabase Auth user ids.
- Confidential client file names or contents.

## Evidence Required Before Hard Access

- `/api/auth/session` verifies real Preview sessions safely.
- Profile mapping from Auth user to `profiles.auth_user_id` is verified.
- Positive and negative membership tests are recorded.
- RLS positive and negative tests are recorded.
- Storage access is verified against project/organization scope.
- Rollback to soft mode is tested.
- Production approval is explicit and documented.
