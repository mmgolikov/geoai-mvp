-- GeoAI identity and authorization foundation v1
-- REVIEW DRAFT. Apply only after the containment migration passes clean and
-- upgrade replay plus the live JWT persona matrix. This migration does not
-- configure Supabase Auth providers or change the Dashboard Data API schemas.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

-- Keep authorization helpers and operator custody objects outside the Data
-- API. `api` is a minimal allowlist: exposing that schema is a separate,
-- owner-controlled Dashboard action after clean replay and persona evidence.
create schema if not exists geoai_private authorization postgres;
create schema if not exists api authorization postgres;

revoke all on schema geoai_private from public, anon, authenticated;
revoke all on schema api from public, anon, authenticated;
grant usage on schema geoai_private to authenticated;
grant usage on schema api to anon, authenticated;

alter default privileges for role postgres in schema geoai_private
  revoke all on functions from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema geoai_private
  revoke all on tables from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema api
  revoke all on functions from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema api
  revoke all on tables from public, anon, authenticated, service_role;

-- A profile is either an Auth-backed human identity or a system seed identity.
-- Invitations are intentionally separate from profiles and belong to ADMIN-01.
alter table public.profiles
  add column if not exists status text not null default 'active',
  add column if not exists identity_kind text not null default 'user';

update public.profiles
set identity_kind = 'system'
where auth_user_id is null;

alter table public.profiles
  drop constraint if exists profiles_status_check,
  drop constraint if exists profiles_identity_kind_check,
  drop constraint if exists profiles_identity_mapping_check,
  drop constraint if exists profiles_auth_user_id_fkey;

alter table public.profiles
  add constraint profiles_status_check
    check (status in ('active', 'invited', 'disabled', 'inactive')),
  add constraint profiles_identity_kind_check
    check (identity_kind in ('user', 'system')),
  add constraint profiles_identity_mapping_check
    check (
      (identity_kind = 'user' and auth_user_id is not null)
      or (identity_kind = 'system' and auth_user_id is null)
    ),
  add constraint profiles_auth_user_id_fkey
    foreign key (auth_user_id)
    references auth.users(id)
    on delete restrict
    not valid;

alter table public.profiles
  validate constraint profiles_auth_user_id_fkey;

create unique index if not exists ux_profiles_auth_user_id_nonnull
  on public.profiles(auth_user_id)
  where auth_user_id is not null;

-- Organization membership is distinct from project role. Backfill never
-- promotes a project owner/admin to organization admin; existing principals
-- receive the minimum organization role required for consistency.
create table if not exists public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations(id) on delete cascade,
  profile_id uuid not null
    references public.profiles(id) on delete cascade,
  role text not null default 'member'
    check (role in ('owner', 'admin', 'member')),
  capabilities text[] not null default array[]::text[]
    check (
      capabilities <@ array[
        'client_attestor',
        'official_attestor',
        'source_operator'
      ]::text[]
    ),
  status text not null default 'active'
    check (status in ('active', 'invited', 'disabled', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_memberships_org_profile_key
    unique (organization_id, profile_id)
);

insert into public.organization_memberships (
  organization_id,
  profile_id,
  role,
  status
)
select
  pm.organization_id,
  pm.user_id,
  'member',
  case
    when bool_or(pm.status = 'active') then 'active'
    when bool_or(pm.status = 'invited') then 'invited'
    else 'disabled'
  end
from public.project_memberships pm
where pm.organization_id is not null
  and pm.user_id is not null
group by pm.organization_id, pm.user_id
on conflict (organization_id, profile_id) do nothing;

drop trigger if exists trg_organization_memberships_updated_at
  on public.organization_memberships;
create trigger trg_organization_memberships_updated_at
before update on public.organization_memberships
for each row execute function public.geoai_set_updated_at();

create index if not exists idx_organization_memberships_profile_id
  on public.organization_memberships(profile_id);
create index if not exists idx_organization_memberships_active_org
  on public.organization_memberships(organization_id, profile_id)
  where status = 'active';

alter table public.organization_memberships enable row level security;
revoke all on table public.organization_memberships from public, anon, authenticated;

-- Projects must always belong to one organization. Delete is restrictive so
-- tenant resources cannot be orphaned by an organization delete.
alter table public.projects
  drop constraint if exists projects_organization_id_nn;
alter table public.projects
  add constraint projects_organization_id_nn
  check (organization_id is not null) not valid;
alter table public.projects
  validate constraint projects_organization_id_nn;
alter table public.projects
  alter column organization_id set not null;
alter table public.projects
  drop constraint projects_organization_id_nn,
  drop constraint if exists projects_organization_id_fkey,
  drop constraint if exists projects_scope_identity_key;
alter table public.projects
  add constraint projects_organization_id_fkey
    foreign key (organization_id)
    references public.organizations(id)
    on delete restrict
    not valid;
alter table public.projects
  validate constraint projects_organization_id_fkey;
alter table public.projects
  add constraint projects_scope_identity_key
  unique (id, organization_id, project_key);

-- Project membership authorization uses immutable ids. project_key remains a
-- denormalized display/lookup value but is protected by a composite FK.
alter table public.project_memberships
  drop constraint if exists project_memberships_scope_nn;
alter table public.project_memberships
  add constraint project_memberships_scope_nn
  check (
    organization_id is not null
    and project_id is not null
    and project_key is not null
    and user_id is not null
  ) not valid;
alter table public.project_memberships
  validate constraint project_memberships_scope_nn;
alter table public.project_memberships
  alter column organization_id set not null,
  alter column project_id set not null,
  alter column project_key set not null,
  alter column user_id set not null;
alter table public.project_memberships
  drop constraint project_memberships_scope_nn,
  drop constraint if exists project_memberships_project_user_key,
  drop constraint if exists project_memberships_project_scope_fkey,
  drop constraint if exists project_memberships_org_profile_fkey;
alter table public.project_memberships
  add constraint project_memberships_project_user_key
    unique (project_id, user_id),
  add constraint project_memberships_project_scope_fkey
    foreign key (project_id, organization_id, project_key)
    references public.projects(id, organization_id, project_key)
    on delete cascade
    not valid,
  add constraint project_memberships_org_profile_fkey
    foreign key (organization_id, user_id)
    references public.organization_memberships(organization_id, profile_id)
    on delete cascade
    not valid;
alter table public.project_memberships
  validate constraint project_memberships_project_scope_fkey;
alter table public.project_memberships
  validate constraint project_memberships_org_profile_fkey;

-- Enforce the same tenant identity on project-scoped resources. The live
-- upgrade preflight currently reports zero nulls and zero mismatches; NOT VALID
-- plus VALIDATE keeps the failure explicit before the lock-taking SET NOT NULL.
do $$
declare
  table_name text;
  not_null_constraint text;
  scope_constraint text;
begin
  foreach table_name in array array[
    'aois',
    'analysis_runs',
    'reports',
    'comparison_sets',
    'uploaded_datasets',
    'data_room_assets',
    'validation_checklist_items',
    'pilot_workflows',
    'pilot_client_inputs',
    'pilot_deliverables',
    'ai_decision_scores'
  ]
  loop
    not_null_constraint := table_name || '_project_scope_nn';
    scope_constraint := table_name || '_project_scope_fkey';

    execute format('alter table public.%I drop constraint if exists %I', table_name, not_null_constraint);
    execute format(
      'alter table public.%I add constraint %I check (organization_id is not null and project_id is not null and project_key is not null) not valid',
      table_name,
      not_null_constraint
    );
    execute format('alter table public.%I validate constraint %I', table_name, not_null_constraint);
    execute format(
      'alter table public.%I alter column organization_id set not null, alter column project_id set not null, alter column project_key set not null',
      table_name
    );
    execute format('alter table public.%I drop constraint %I', table_name, not_null_constraint);

    execute format('alter table public.%I drop constraint if exists %I', table_name, scope_constraint);
    execute format(
      'alter table public.%I add constraint %I foreign key (project_id, organization_id, project_key) references public.projects(id, organization_id, project_key) on delete cascade not valid',
      table_name,
      scope_constraint
    );
    execute format('alter table public.%I validate constraint %I', table_name, scope_constraint);
  end loop;
end;
$$;

-- Private, fail-closed identity helpers. auth.uid() is mapped to one active
-- Auth-backed profile; organization and project memberships must both be
-- active. No authorization decision relies on project_key.
create or replace function geoai_private.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select profile.id
  from public.profiles profile
  join auth.users auth_user on auth_user.id = profile.auth_user_id
  where profile.auth_user_id = (select auth.uid())
    and profile.identity_kind = 'user'
    and profile.status = 'active'
    and coalesce(auth_user.is_anonymous, false) = false
    and auth_user.confirmed_at is not null
    and auth_user.deleted_at is null
    and (auth_user.banned_until is null or auth_user.banned_until <= now())
  limit 1
$$;

create or replace function geoai_private.has_organization_role(
  target_organization_id uuid,
  allowed_roles text[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles profile
    join auth.users auth_user on auth_user.id = profile.auth_user_id
    join public.organization_memberships membership
      on membership.profile_id = profile.id
    join public.organizations organization
      on organization.id = membership.organization_id
    where target_organization_id is not null
      and profile.auth_user_id = (select auth.uid())
      and profile.identity_kind = 'user'
      and profile.status = 'active'
      and coalesce(auth_user.is_anonymous, false) = false
      and auth_user.confirmed_at is not null
      and auth_user.deleted_at is null
      and (auth_user.banned_until is null or auth_user.banned_until <= now())
      and membership.organization_id = target_organization_id
      and membership.status = 'active'
      and membership.role = any(allowed_roles)
      and organization.status = 'active'
  )
$$;

create or replace function geoai_private.has_project_role(
  target_project_id uuid,
  allowed_roles text[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles profile
    join auth.users auth_user on auth_user.id = profile.auth_user_id
    join public.project_memberships project_membership
      on project_membership.user_id = profile.id
    join public.organization_memberships organization_membership
      on organization_membership.organization_id = project_membership.organization_id
     and organization_membership.profile_id = profile.id
    join public.projects project
      on project.id = project_membership.project_id
     and project.organization_id = project_membership.organization_id
    join public.organizations organization
      on organization.id = project.organization_id
    where target_project_id is not null
      and profile.auth_user_id = (select auth.uid())
      and profile.identity_kind = 'user'
      and profile.status = 'active'
      and coalesce(auth_user.is_anonymous, false) = false
      and auth_user.confirmed_at is not null
      and auth_user.deleted_at is null
      and (auth_user.banned_until is null or auth_user.banned_until <= now())
      and organization_membership.status = 'active'
      and project_membership.status = 'active'
      and project_membership.role = any(allowed_roles)
      and project.id = target_project_id
      and project.status in ('active', 'demo')
      and organization.status = 'active'
  )
$$;

-- Storage policies cannot read protected identity/tenant tables as the
-- authenticated caller. This narrow SECURITY DEFINER predicate exposes only a
-- boolean decision for one exact organization/project path and role set.
create or replace function geoai_private.has_storage_project_role(
  target_organization_id text,
  target_project_id text,
  allowed_roles text[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles profile
    join auth.users auth_user on auth_user.id = profile.auth_user_id
    join public.organization_memberships organization_membership
      on organization_membership.profile_id = profile.id
    join public.project_memberships project_membership
      on project_membership.user_id = profile.id
     and project_membership.organization_id = organization_membership.organization_id
    join public.projects project
      on project.id = project_membership.project_id
     and project.organization_id = project_membership.organization_id
    join public.organizations organization
      on organization.id = project.organization_id
    where target_organization_id is not null
      and target_project_id is not null
      and profile.auth_user_id = (select auth.uid())
      and profile.identity_kind = 'user'
      and profile.status = 'active'
      and coalesce(auth_user.is_anonymous, false) = false
      and auth_user.confirmed_at is not null
      and auth_user.deleted_at is null
      and (auth_user.banned_until is null or auth_user.banned_until <= now())
      and organization_membership.status = 'active'
      and project_membership.status = 'active'
      and project_membership.role = any(allowed_roles)
      and project.organization_id::text = target_organization_id
      and project.id::text = target_project_id
      and project.status in ('active', 'demo')
      and organization.status = 'active'
  )
$$;

revoke all on function geoai_private.current_profile_id()
  from public, anon, authenticated, service_role;
revoke all on function geoai_private.has_organization_role(uuid, text[])
  from public, anon, authenticated, service_role;
revoke all on function geoai_private.has_project_role(uuid, text[])
  from public, anon, authenticated, service_role;
revoke all on function geoai_private.has_storage_project_role(text, text, text[])
  from public, anon, authenticated, service_role;
grant execute on function geoai_private.current_profile_id() to authenticated;
grant execute on function geoai_private.has_organization_role(uuid, text[]) to authenticated;
grant execute on function geoai_private.has_project_role(uuid, text[]) to authenticated;
grant execute on function geoai_private.has_storage_project_role(text, text, text[]) to authenticated;

revoke execute on function public.geoai_set_updated_at()
  from public, anon, authenticated;

-- Minimal Data API allowlist. These SECURITY DEFINER functions do not depend
-- on public being exposed and never return another caller's identity or
-- membership. Every identity function re-checks auth.uid(), the Auth user,
-- profile kind/status, and active tenant state with an empty search_path.
create or replace function api.healthcheck()
returns table (
  healthy boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.geoai_healthcheck healthcheck
    where healthcheck.id = 1
  )
$$;

create or replace function api.current_profile()
returns table (
  id uuid,
  auth_user_id uuid,
  email text,
  full_name text,
  status text,
  identity_kind text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    profile.id,
    profile.auth_user_id,
    profile.email,
    profile.full_name,
    profile.status,
    profile.identity_kind
  from public.profiles profile
  join auth.users auth_user on auth_user.id = profile.auth_user_id
  where profile.auth_user_id = (select auth.uid())
    and profile.identity_kind = 'user'
    and profile.status = 'active'
    and coalesce(auth_user.is_anonymous, false) = false
    and auth_user.confirmed_at is not null
    and auth_user.deleted_at is null
    and (auth_user.banned_until is null or auth_user.banned_until <= now())
  limit 1
$$;

create or replace function api.current_organization_memberships()
returns table (
  profile_id uuid,
  organization_id uuid,
  organization_role text,
  capabilities text[],
  membership_status text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    profile.id,
    membership.organization_id,
    membership.role,
    membership.capabilities,
    membership.status
  from public.profiles profile
  join auth.users auth_user on auth_user.id = profile.auth_user_id
  join public.organization_memberships membership
    on membership.profile_id = profile.id
  join public.organizations organization
    on organization.id = membership.organization_id
  where profile.auth_user_id = (select auth.uid())
    and profile.identity_kind = 'user'
    and profile.status = 'active'
    and coalesce(auth_user.is_anonymous, false) = false
    and auth_user.confirmed_at is not null
    and auth_user.deleted_at is null
    and (auth_user.banned_until is null or auth_user.banned_until <= now())
    and membership.status = 'active'
    and organization.status = 'active'
$$;

create or replace function api.current_project_access(
  target_project_key text
)
returns table (
  profile_id uuid,
  organization_id uuid,
  organization_role text,
  capabilities text[],
  project_id uuid,
  project_key text,
  project_status text,
  project_role text,
  project_membership_status text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    profile.id,
    project.organization_id,
    organization_membership.role,
    organization_membership.capabilities,
    project.id,
    project.project_key,
    project.status,
    project_membership.role,
    project_membership.status
  from public.profiles profile
  join auth.users auth_user on auth_user.id = profile.auth_user_id
  join public.organization_memberships organization_membership
    on organization_membership.profile_id = profile.id
  join public.project_memberships project_membership
    on project_membership.user_id = profile.id
   and project_membership.organization_id = organization_membership.organization_id
  join public.projects project
    on project.id = project_membership.project_id
   and project.organization_id = project_membership.organization_id
  join public.organizations organization
    on organization.id = project.organization_id
  where profile.auth_user_id = (select auth.uid())
    and profile.identity_kind = 'user'
    and profile.status = 'active'
    and coalesce(auth_user.is_anonymous, false) = false
    and auth_user.confirmed_at is not null
    and auth_user.deleted_at is null
    and (auth_user.banned_until is null or auth_user.banned_until <= now())
    and organization_membership.status = 'active'
    and project_membership.status = 'active'
    and project.status in ('active', 'demo')
    and organization.status = 'active'
    and target_project_key is not null
    and project.project_key = target_project_key
$$;

revoke all on function api.healthcheck()
  from public, anon, authenticated, service_role;
revoke all on function api.current_profile()
  from public, anon, authenticated, service_role;
revoke all on function api.current_organization_memberships()
  from public, anon, authenticated, service_role;
revoke all on function api.current_project_access(text)
  from public, anon, authenticated, service_role;
grant execute on function api.healthcheck() to anon, authenticated;
grant execute on function api.current_profile() to authenticated;
grant execute on function api.current_organization_memberships() to authenticated;
grant execute on function api.current_project_access(text) to authenticated;

-- Identity-plane reads. Membership mutations remain closed until ADMIN-01
-- provides last-owner, anti-self-escalation and transactional audit controls.
create policy "organization active member read"
on public.organizations for select to authenticated
using (
  geoai_private.has_organization_role(id, array['owner', 'admin', 'member']::text[])
);

create policy "profile self read"
on public.profiles for select to authenticated
using (id = geoai_private.current_profile_id());

create policy "project active member read"
on public.projects for select to authenticated
using (
  geoai_private.has_project_role(
    id,
    array['owner', 'admin', 'analyst', 'viewer', 'client_viewer']::text[]
  )
);

create policy "organization membership self or admin read"
on public.organization_memberships for select to authenticated
using (
  profile_id = geoai_private.current_profile_id()
  or geoai_private.has_organization_role(
    organization_id,
    array['owner', 'admin']::text[]
  )
);

create policy "project membership self or admin read"
on public.project_memberships for select to authenticated
using (
  user_id = geoai_private.current_profile_id()
  or geoai_private.has_project_role(
    project_id,
    array['owner', 'admin']::text[]
  )
);

-- Project resource policies are action-specific. Client-visible resources need
-- an explicit audience column before client_viewer can receive base-table read.
-- SOURCE-01 and AUDIT-01 remain closed and receive no authenticated grants.
-- Base-table grants also remain closed: AUTH-01B must add reviewed api RPCs for
-- each resource operation before any repository is enabled.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'aois',
    'analysis_runs',
    'reports',
    'comparison_sets',
    'uploaded_datasets',
    'data_room_assets',
    'validation_checklist_items',
    'pilot_workflows',
    'pilot_client_inputs',
    'pilot_deliverables',
    'ai_decision_scores'
  ]
  loop
    execute format(
      'create policy %I on public.%I for select to authenticated using (geoai_private.has_project_role(project_id, array[''owner'', ''admin'', ''analyst'', ''viewer'']::text[]))',
      table_name || '_member_select',
      table_name
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (geoai_private.has_project_role(project_id, array[''owner'', ''admin'', ''analyst'']::text[]))',
      table_name || '_analyst_insert',
      table_name
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using (geoai_private.has_project_role(project_id, array[''owner'', ''admin'', ''analyst'']::text[])) with check (geoai_private.has_project_role(project_id, array[''owner'', ''admin'', ''analyst'']::text[]))',
      table_name || '_analyst_update',
      table_name
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using (geoai_private.has_project_role(project_id, array[''owner'', ''admin'']::text[]))',
      table_name || '_admin_delete',
      table_name
    );
  end loop;
end;
$$;

comment on schema geoai_private is
  'Non-exposed GeoAI authorization and operator internals. Never add this schema to Supabase exposed schemas.';
comment on schema api is
  'Minimal Data API allowlist. Expose only after clean replay, persona tests and explicit owner approval; never expose public.';
comment on table public.organization_memberships is
  'Organization membership is independent from project role; project membership never grants organization administration.';

commit;
