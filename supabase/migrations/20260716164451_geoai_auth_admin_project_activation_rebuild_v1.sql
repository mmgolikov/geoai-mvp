-- Rebuilt after the unpublished activation commit was lost with the ephemeral
-- workspace. This is a new reviewed migration, not a byte-for-byte recovery.
-- It extends the published identity foundation with API-only administration,
-- client/project tenancy, invitation lifecycle, AAL2 elevation, immutable
-- audit evidence and database-enforced last-owner protection.

create table public.platform_memberships (
  profile_id uuid primary key references public.profiles(id) on delete restrict,
  role text not null check (role in ('platform_owner', 'platform_admin', 'support', 'auditor')),
  status text not null default 'active' check (status in ('active', 'disabled')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  row_version bigint not null default 1 check (row_version > 0)
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  client_key text not null,
  display_name text not null,
  legal_name text,
  status text not null default 'active' check (status in ('active', 'inactive', 'archived')),
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  row_version bigint not null default 1 check (row_version > 0),
  constraint clients_client_key_format_check
    check (client_key ~ '^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$'),
  constraint clients_display_name_length_check
    check (char_length(btrim(display_name)) between 1 and 160),
  constraint clients_scope_key_key unique (organization_id, client_key),
  constraint clients_scope_identity_key unique (id, organization_id)
);

alter table public.projects
  add column client_id uuid,
  add column row_version bigint not null default 1 check (row_version > 0);

alter table public.organizations
  add column row_version bigint not null default 1 check (row_version > 0);

alter table public.organization_memberships
  add column row_version bigint not null default 1 check (row_version > 0);

alter table public.project_memberships
  add column row_version bigint not null default 1 check (row_version > 0);

alter table public.projects
  add constraint projects_id_organization_key unique (id, organization_id),
  add constraint projects_client_scope_fkey
    foreign key (client_id, organization_id)
    references public.clients(id, organization_id)
    on delete restrict;

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid,
  email text not null,
  organization_role text not null default 'member'
    check (organization_role in ('owner', 'admin', 'member')),
  project_role text
    check (project_role is null or project_role in ('owner', 'admin', 'analyst', 'viewer', 'client_viewer')),
  token_hash text not null unique,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'revoked', 'expired')),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_by uuid references public.profiles(id) on delete set null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  row_version bigint not null default 1 check (row_version > 0),
  constraint invitations_email_canonical_check
    check (email = lower(btrim(email)) and char_length(email) between 3 and 320 and position('@' in email) > 1),
  constraint invitations_token_hash_check
    check (token_hash ~ '^[0-9a-f]{64}$'),
  constraint invitations_expiry_check check (expires_at > created_at),
  constraint invitations_project_pairing_check
    check ((project_id is null and project_role is null) or (project_id is not null and project_role is not null)),
  constraint invitations_project_scope_fkey
    foreign key (project_id, organization_id)
    references public.projects(id, organization_id)
    on delete cascade
);

create table public.admin_audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  action text not null check (action in (
    'platform_owner_bootstrapped',
    'organization_created',
    'client_created',
    'project_created',
    'invitation_created',
    'invitation_accepted',
    'invitation_revoked',
    'organization_membership_changed',
    'project_membership_changed',
    'account_status_changed'
  )),
  target_type text not null,
  target_id text not null,
  request_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint admin_audit_details_object_check
    check (jsonb_typeof(details) = 'object')
);

create index idx_platform_memberships_active_role
  on public.platform_memberships (role, profile_id)
  where status = 'active';
create index idx_clients_scope_page
  on public.clients (organization_id, created_at desc, id desc);
create index idx_projects_client_id
  on public.projects (client_id)
  where client_id is not null;
create index idx_invitations_scope_page
  on public.invitations (organization_id, created_at desc, id desc);
create index idx_invitations_project_id
  on public.invitations (project_id)
  where project_id is not null;
create index idx_invitations_pending_expiry
  on public.invitations (expires_at, organization_id)
  where status = 'pending';
create unique index ux_invitations_pending_organization_email
  on public.invitations (organization_id, email)
  where project_id is null and status = 'pending';
create unique index ux_invitations_pending_project_email
  on public.invitations (organization_id, project_id, email)
  where project_id is not null and status = 'pending';
create index idx_admin_audit_scope_page
  on public.admin_audit_events (organization_id, created_at desc, id desc);
create index idx_admin_audit_project_page
  on public.admin_audit_events (project_id, created_at desc, id desc)
  where project_id is not null;
create index idx_admin_audit_actor_page
  on public.admin_audit_events (actor_profile_id, created_at desc, id desc)
  where actor_profile_id is not null;

alter table public.platform_memberships enable row level security;
alter table public.clients enable row level security;
alter table public.invitations enable row level security;
alter table public.admin_audit_events enable row level security;

revoke all on table public.platform_memberships from public, anon, authenticated, service_role;
revoke all on table public.clients from public, anon, authenticated, service_role;
revoke all on table public.invitations from public, anon, authenticated, service_role;
revoke all on table public.admin_audit_events from public, anon, authenticated, service_role;

create or replace function geoai_private.bump_row_version()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.row_version := old.row_version + 1;
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function geoai_private.bump_row_version()
  from public, anon, authenticated, service_role;

create trigger zz_platform_memberships_row_version
before update on public.platform_memberships
for each row execute function geoai_private.bump_row_version();
create trigger zz_clients_row_version
before update on public.clients
for each row execute function geoai_private.bump_row_version();
create trigger zz_organizations_row_version
before update on public.organizations
for each row execute function geoai_private.bump_row_version();
create trigger zz_organization_memberships_row_version
before update on public.organization_memberships
for each row execute function geoai_private.bump_row_version();
create trigger zz_projects_row_version
before update on public.projects
for each row execute function geoai_private.bump_row_version();
create trigger zz_project_memberships_row_version
before update on public.project_memberships
for each row execute function geoai_private.bump_row_version();
create trigger zz_invitations_row_version
before update on public.invitations
for each row execute function geoai_private.bump_row_version();

create or replace function geoai_private.reject_admin_audit_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'admin audit events are append-only' using errcode = '55000';
end;
$$;

revoke all on function geoai_private.reject_admin_audit_mutation()
  from public, anon, authenticated, service_role;

create trigger admin_audit_events_append_only
before update or delete on public.admin_audit_events
for each row execute function geoai_private.reject_admin_audit_mutation();

create or replace function geoai_private.protect_last_platform_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.role = 'platform_owner' and old.status = 'active'
     and (tg_op = 'DELETE' or new.role <> 'platform_owner' or new.status <> 'active') then
    perform pg_advisory_xact_lock(hashtextextended('geoai:platform-owner', 0));
    if not exists (
      select 1
      from public.platform_memberships membership
      where membership.role = 'platform_owner'
        and membership.status = 'active'
        and membership.profile_id <> old.profile_id
    ) then
      raise exception 'last active platform owner cannot be removed' using errcode = '23514';
    end if;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create or replace function geoai_private.protect_last_organization_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.role = 'owner' and old.status = 'active'
     and (tg_op = 'DELETE' or new.role <> 'owner' or new.status <> 'active') then
    perform 1 from public.organizations organization
      where organization.id = old.organization_id for update;
    if found and not exists (
      select 1
      from public.organization_memberships membership
      where membership.organization_id = old.organization_id
        and membership.role = 'owner'
        and membership.status = 'active'
        and membership.id <> old.id
    ) then
      raise exception 'last active organization owner cannot be removed' using errcode = '23514';
    end if;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create or replace function geoai_private.protect_last_project_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.role = 'owner' and old.status = 'active'
     and (tg_op = 'DELETE' or new.role <> 'owner' or new.status <> 'active') then
    -- Canonical lock order is organization then project for every project-role transition.
    perform 1 from public.organizations organization
      where organization.id = old.organization_id for update;
    perform 1 from public.projects project
      where project.id = old.project_id and project.organization_id = old.organization_id for update;
    if found and not exists (
      select 1
      from public.project_memberships membership
      where membership.project_id = old.project_id
        and membership.role = 'owner'
        and membership.status = 'active'
        and membership.id <> old.id
    ) then
      raise exception 'last active project owner cannot be removed' using errcode = '23514';
    end if;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function geoai_private.protect_last_platform_owner()
  from public, anon, authenticated, service_role;
revoke all on function geoai_private.protect_last_organization_owner()
  from public, anon, authenticated, service_role;
revoke all on function geoai_private.protect_last_project_owner()
  from public, anon, authenticated, service_role;

create trigger platform_memberships_last_owner
before update or delete on public.platform_memberships
for each row execute function geoai_private.protect_last_platform_owner();
create trigger organization_memberships_last_owner
before update or delete on public.organization_memberships
for each row execute function geoai_private.protect_last_organization_owner();
create trigger project_memberships_last_owner
before update or delete on public.project_memberships
for each row execute function geoai_private.protect_last_project_owner();

create or replace function geoai_private.current_permanent_auth_user_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select auth_user.id
  from auth.users auth_user
  where auth_user.id = (select auth.uid())
    and auth_user.is_anonymous is false
    and auth_user.confirmed_at is not null
    and auth_user.email_confirmed_at is not null
    and auth_user.deleted_at is null
    and (auth_user.banned_until is null or auth_user.banned_until <= now())
  limit 1
$$;

create or replace function geoai_private.provision_auth_profile()
returns trigger
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  canonical_email text := lower(btrim(new.email));
  canonical_name text := nullif(left(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), 160), '');
  canonical_status text;
begin
  if coalesce(new.is_anonymous, false) or canonical_email is null then
    return new;
  end if;
  canonical_status := case
    when new.confirmed_at is not null
      and new.email_confirmed_at is not null
      and new.deleted_at is null
      and (new.banned_until is null or new.banned_until <= now())
    then 'active'
    else 'inactive'
  end;

  update public.profiles profile
  set email = canonical_email,
      full_name = coalesce(canonical_name, profile.full_name, canonical_email),
      status = canonical_status,
      identity_kind = 'user',
      updated_at = now()
  where profile.auth_user_id = new.id;

  if not found then
    begin
      insert into public.profiles (
        auth_user_id, email, full_name, status, identity_kind
      ) values (
        new.id, canonical_email, coalesce(canonical_name, canonical_email),
        canonical_status, 'user'
      );
    exception when unique_violation then
      update public.profiles profile
      set email = canonical_email,
          full_name = coalesce(canonical_name, profile.full_name, canonical_email),
          status = canonical_status,
          identity_kind = 'user',
          updated_at = now()
      where profile.auth_user_id = new.id;
    end;
  end if;
  return new;
end;
$$;

revoke all on function geoai_private.current_permanent_auth_user_id()
  from public, anon, authenticated, service_role;
revoke all on function geoai_private.provision_auth_profile()
  from public, anon, authenticated, service_role;
grant execute on function geoai_private.current_permanent_auth_user_id() to authenticated;

create trigger geoai_provision_auth_profile
after insert or update of email, confirmed_at, email_confirmed_at, is_anonymous, deleted_at, banned_until, raw_user_meta_data
on auth.users
for each row execute function geoai_private.provision_auth_profile();

create or replace function geoai_private.require_aal2()
returns void
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if coalesce((select auth.jwt() ->> 'aal'), '') <> 'aal2' then
    raise exception 'aal2 authentication is required' using errcode = '42501';
  end if;
end;
$$;

create or replace function geoai_private.has_platform_role(allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.platform_memberships membership
    where membership.profile_id = geoai_private.current_profile_id()
      and membership.status = 'active'
      and membership.role = any(allowed_roles)
  )
$$;

create or replace function geoai_private.write_admin_audit(
  target_organization_id uuid,
  target_project_id uuid,
  target_action text,
  target_type text,
  target_id text,
  request_id uuid,
  details jsonb
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  event_id uuid;
begin
  insert into public.admin_audit_events (
    organization_id,
    project_id,
    actor_profile_id,
    action,
    target_type,
    target_id,
    request_id,
    details
  ) values (
    target_organization_id,
    target_project_id,
    geoai_private.current_profile_id(),
    target_action,
    left(target_type, 80),
    left(target_id, 200),
    request_id,
    coalesce(details, '{}'::jsonb)
  ) returning id into event_id;
  return event_id;
end;
$$;

revoke all on function geoai_private.require_aal2()
  from public, anon, authenticated, service_role;
revoke all on function geoai_private.has_platform_role(text[])
  from public, anon, authenticated, service_role;
revoke all on function geoai_private.write_admin_audit(uuid, uuid, text, text, text, uuid, jsonb)
  from public, anon, authenticated, service_role;
grant execute on function geoai_private.require_aal2() to authenticated;
grant execute on function geoai_private.has_platform_role(text[]) to authenticated;

-- Owner-only operator bootstrap. It is intentionally absent from the exposed
-- api schema and has no caller-role EXECUTE grant. The first invocation is
-- serialized and permanently fails once an active platform owner exists.
create or replace function geoai_private.bootstrap_first_platform_owner(target_auth_user_id uuid)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  target_profile_id uuid;
  target_email text;
begin
  perform pg_advisory_xact_lock(hashtextextended('geoai:platform-owner', 0));

  if exists (
    select 1 from public.platform_memberships
    where role = 'platform_owner' and status = 'active'
  ) then
    raise exception 'platform owner bootstrap has already been consumed' using errcode = '23505';
  end if;

  select lower(auth_user.email)
  into target_email
  from auth.users auth_user
  where auth_user.id = target_auth_user_id
    and coalesce(auth_user.is_anonymous, false) = false
    and auth_user.confirmed_at is not null
    and auth_user.email_confirmed_at is not null
    and auth_user.deleted_at is null
    and (auth_user.banned_until is null or auth_user.banned_until <= now());

  if target_email is null then
    raise exception 'bootstrap requires a confirmed permanent Auth user' using errcode = '23514';
  end if;

  select profile.id
  into target_profile_id
  from public.profiles profile
  where profile.auth_user_id = target_auth_user_id
    and profile.identity_kind = 'user'
    and profile.status = 'active';

  if target_profile_id is null then
    insert into public.profiles (auth_user_id, email, full_name, status, identity_kind)
    values (target_auth_user_id, target_email, target_email, 'active', 'user')
    returning id into target_profile_id;
  end if;

  insert into public.platform_memberships (profile_id, role, status, created_by)
  values (target_profile_id, 'platform_owner', 'active', target_profile_id);

  insert into public.admin_audit_events (
    actor_profile_id, action, target_type, target_id, details
  ) values (
    target_profile_id,
    'platform_owner_bootstrapped',
    'profile',
    target_profile_id::text,
    jsonb_build_object('authUserId', target_auth_user_id)
  );

  return target_profile_id;
end;
$$;

revoke all on function geoai_private.bootstrap_first_platform_owner(uuid)
  from public, anon, authenticated, service_role;

create or replace function geoai_private.admin_create_organization(
  organization_name text,
  organization_slug text,
  request_id uuid default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  organization_id uuid;
  actor_id uuid;
begin
  perform geoai_private.require_aal2();
  actor_id := geoai_private.current_profile_id();
  if actor_id is null or not geoai_private.has_platform_role(array['platform_owner', 'platform_admin']::text[]) then
    raise exception 'platform owner or admin role is required' using errcode = '42501';
  end if;
  if organization_slug is null or organization_slug !~ '^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$' then
    raise exception 'invalid organization slug' using errcode = '22023';
  end if;
  if char_length(btrim(coalesce(organization_name, ''))) not between 1 and 160 then
    raise exception 'invalid organization name' using errcode = '22023';
  end if;

  insert into public.organizations (name, slug, status)
  values (btrim(organization_name), organization_slug, 'active')
  returning id into organization_id;

  insert into public.organization_memberships (
    organization_id, profile_id, role, status
  ) values (
    organization_id, actor_id, 'owner', 'active'
  );

  perform geoai_private.write_admin_audit(
    organization_id, null, 'organization_created', 'organization',
    organization_id::text, request_id,
    jsonb_build_object('slug', organization_slug)
  );
  return jsonb_build_object('id', organization_id, 'rowVersion', 1);
end;
$$;

create or replace function geoai_private.admin_create_client(
  target_organization_id uuid,
  target_client_key text,
  target_display_name text,
  target_legal_name text default null,
  request_id uuid default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  client_id uuid;
  actor_id uuid;
begin
  perform geoai_private.require_aal2();
  actor_id := geoai_private.current_profile_id();
  if actor_id is null then
    raise exception 'authenticated permanent user is required' using errcode = '42501';
  end if;
  perform 1 from public.organizations organization
    where organization.id = target_organization_id and organization.status = 'active'
    for update;
  if not found then
    raise exception 'active organization not found' using errcode = 'P0002';
  end if;
  if not (
    geoai_private.has_platform_role(array['platform_owner', 'platform_admin']::text[])
    or geoai_private.has_organization_role(target_organization_id, array['owner', 'admin']::text[])
  ) then
    raise exception 'organization administration role is required' using errcode = '42501';
  end if;

  insert into public.clients (
    organization_id, client_key, display_name, legal_name, created_by
  ) values (
    target_organization_id, target_client_key, btrim(target_display_name),
    nullif(btrim(target_legal_name), ''), actor_id
  ) returning id into client_id;

  perform geoai_private.write_admin_audit(
    target_organization_id, null, 'client_created', 'client', client_id::text,
    request_id, jsonb_build_object('clientKey', target_client_key)
  );
  return jsonb_build_object('id', client_id, 'rowVersion', 1);
end;
$$;

create or replace function geoai_private.admin_create_project(
  target_organization_id uuid,
  target_client_id uuid,
  target_project_key text,
  target_name text,
  target_description text default null,
  request_id uuid default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  project_id uuid;
  actor_id uuid;
begin
  perform geoai_private.require_aal2();
  actor_id := geoai_private.current_profile_id();
  if actor_id is null then
    raise exception 'authenticated permanent user is required' using errcode = '42501';
  end if;
  perform 1 from public.organizations organization
    where organization.id = target_organization_id and organization.status = 'active'
    for update;
  if not found then
    raise exception 'active organization not found' using errcode = 'P0002';
  end if;
  if not (
    geoai_private.has_platform_role(array['platform_owner', 'platform_admin']::text[])
    or geoai_private.has_organization_role(target_organization_id, array['owner', 'admin']::text[])
  ) then
    raise exception 'organization administration role is required' using errcode = '42501';
  end if;
  if target_client_id is not null and not exists (
    select 1 from public.clients client
    where client.id = target_client_id
      and client.organization_id = target_organization_id
      and client.status = 'active'
  ) then
    raise exception 'active client not found in organization' using errcode = '23503';
  end if;

  insert into public.projects (
    organization_id, client_id, project_key, name, description,
    status, data_mode, created_by
  ) values (
    target_organization_id, target_client_id, target_project_key, btrim(target_name),
    nullif(btrim(target_description), ''), 'active', 'demo_normalized', actor_id
  ) returning id into project_id;

  insert into public.project_memberships (
    organization_id, project_id, project_key, user_id, role, status
  ) values (
    target_organization_id, project_id, target_project_key, actor_id, 'owner', 'active'
  );

  perform geoai_private.write_admin_audit(
    target_organization_id, project_id, 'project_created', 'project', project_id::text,
    request_id, jsonb_build_object('projectKey', target_project_key, 'clientId', target_client_id)
  );
  return jsonb_build_object('id', project_id, 'projectKey', target_project_key, 'rowVersion', 1);
end;
$$;

create or replace function geoai_private.admin_create_invitation(
  target_organization_id uuid,
  target_project_id uuid,
  target_email text,
  target_organization_role text,
  target_project_role text,
  target_token_hash text,
  target_expires_at timestamptz,
  request_id uuid default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  invitation_id uuid;
  actor_id uuid;
  canonical_email text := lower(btrim(target_email));
begin
  perform geoai_private.require_aal2();
  actor_id := geoai_private.current_profile_id();
  if actor_id is null then
    raise exception 'authenticated permanent user is required' using errcode = '42501';
  end if;
  perform 1 from public.organizations organization
    where organization.id = target_organization_id and organization.status = 'active'
    for update;
  if not found then
    raise exception 'active organization not found' using errcode = 'P0002';
  end if;
  if target_project_id is not null then
    perform 1 from public.projects project
      where project.id = target_project_id
        and project.organization_id = target_organization_id
        and project.status in ('active', 'demo')
      for update;
    if not found then
      raise exception 'active project not found in organization' using errcode = 'P0002';
    end if;
  end if;
  if not (
    geoai_private.has_platform_role(array['platform_owner', 'platform_admin']::text[])
    or geoai_private.has_organization_role(target_organization_id, array['owner', 'admin']::text[])
    or (
      target_project_id is not null
      and geoai_private.has_project_role(target_project_id, array['owner', 'admin']::text[])
      and target_organization_role = 'member'
      and target_project_role in ('analyst', 'viewer', 'client_viewer')
    )
  ) then
    raise exception 'role assignment exceeds caller administration scope' using errcode = '42501';
  end if;
  if target_expires_at <= now() or target_expires_at > now() + interval '30 days' then
    raise exception 'invitation expiry must be within 30 days' using errcode = '22023';
  end if;

  insert into public.invitations (
    organization_id, project_id, email, organization_role, project_role,
    token_hash, expires_at, created_by
  ) values (
    target_organization_id, target_project_id, canonical_email,
    target_organization_role, target_project_role, target_token_hash,
    target_expires_at, actor_id
  ) returning id into invitation_id;

  perform geoai_private.write_admin_audit(
    target_organization_id, target_project_id, 'invitation_created', 'invitation',
    invitation_id::text, request_id,
    jsonb_build_object(
      'emailHash', encode(extensions.digest(canonical_email, 'sha256'), 'hex'),
      'organizationRole', target_organization_role,
      'projectRole', target_project_role,
      'expiresAt', target_expires_at
    )
  );
  return jsonb_build_object('id', invitation_id, 'status', 'pending', 'rowVersion', 1);
end;
$$;

create or replace function geoai_private.admin_accept_invitation(
  target_token_hash text,
  request_id uuid default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  invitation public.invitations%rowtype;
  actor_id uuid;
  actor_email text;
begin
  actor_id := geoai_private.current_profile_id();
  if actor_id is null then
    raise exception 'confirmed permanent user is required' using errcode = '42501';
  end if;
  select lower(auth_user.email)
  into actor_email
  from public.profiles profile
  join auth.users auth_user on auth_user.id = profile.auth_user_id
  where profile.id = actor_id
    and auth_user.email_confirmed_at is not null;

  if actor_email is null then
    raise exception 'email-confirmed permanent user is required' using errcode = '42501';
  end if;

  select * into invitation
  from public.invitations candidate
  where candidate.token_hash = target_token_hash
  for update;
  if not found then
    raise exception 'invitation not found' using errcode = 'P0002';
  end if;

  -- Lock order remains organization then project after the invitation row is
  -- located by its unique secret-derived hash. Competing consumes serialize on
  -- the invitation row; role transitions serialize on tenant rows.
  perform 1 from public.organizations organization
    where organization.id = invitation.organization_id and organization.status = 'active'
    for update;
  if not found then
    raise exception 'invitation organization is inactive' using errcode = '23514';
  end if;
  if invitation.project_id is not null then
    perform 1 from public.projects project
      where project.id = invitation.project_id
        and project.organization_id = invitation.organization_id
        and project.status in ('active', 'demo')
      for update;
    if not found then
      raise exception 'invitation project is inactive' using errcode = '23514';
    end if;
  end if;
  if invitation.status <> 'pending' then
    raise exception 'invitation is not pending' using errcode = '23514';
  end if;
  if invitation.expires_at <= now() then
    update public.invitations set status = 'expired' where id = invitation.id;
    raise exception 'invitation has expired' using errcode = '23514';
  end if;
  if actor_email is distinct from invitation.email then
    raise exception 'invitation email does not match authenticated user' using errcode = '42501';
  end if;
  if invitation.organization_role in ('owner', 'admin')
     or invitation.project_role in ('owner', 'admin') then
    perform geoai_private.require_aal2();
  end if;

  insert into public.organization_memberships (
    organization_id, profile_id, role, status
  ) values (
    invitation.organization_id, actor_id, invitation.organization_role, 'active'
  ) on conflict (organization_id, profile_id) do update
    set role = excluded.role, status = 'active';

  if invitation.project_id is not null then
    insert into public.project_memberships (
      organization_id, project_id, project_key, user_id, role, status
    )
    select
      project.organization_id, project.id, project.project_key,
      actor_id, invitation.project_role, 'active'
    from public.projects project
    where project.id = invitation.project_id
    on conflict (project_id, user_id) do update
      set role = excluded.role, status = 'active';
  end if;

  update public.invitations
  set status = 'accepted', accepted_at = now(), accepted_by = actor_id
  where id = invitation.id;

  perform geoai_private.write_admin_audit(
    invitation.organization_id, invitation.project_id, 'invitation_accepted',
    'invitation', invitation.id::text, request_id,
    jsonb_build_object('acceptedBy', actor_id)
  );
  return jsonb_build_object(
    'id', invitation.id,
    'status', 'accepted',
    'organizationId', invitation.organization_id,
    'projectId', invitation.project_id
  );
end;
$$;

create or replace function geoai_private.admin_revoke_invitation(
  target_invitation_id uuid,
  expected_row_version bigint,
  request_id uuid default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  invitation public.invitations%rowtype;
begin
  perform geoai_private.require_aal2();
  select * into invitation from public.invitations
  where id = target_invitation_id for update;
  if not found then
    raise exception 'invitation not found' using errcode = 'P0002';
  end if;
  perform 1 from public.organizations organization
    where organization.id = invitation.organization_id for update;
  if invitation.project_id is not null then
    perform 1 from public.projects project
      where project.id = invitation.project_id for update;
  end if;
  if not (
    geoai_private.has_platform_role(array['platform_owner', 'platform_admin']::text[])
    or geoai_private.has_organization_role(invitation.organization_id, array['owner', 'admin']::text[])
    or (
      invitation.project_id is not null
      and geoai_private.has_project_role(invitation.project_id, array['owner', 'admin']::text[])
    )
  ) then
    raise exception 'administration role is required' using errcode = '42501';
  end if;
  if invitation.row_version <> expected_row_version then
    raise exception 'stale invitation version' using errcode = '40001';
  end if;
  if invitation.status <> 'pending' then
    raise exception 'only pending invitations can be revoked' using errcode = '23514';
  end if;
  update public.invitations set status = 'revoked' where id = invitation.id;
  perform geoai_private.write_admin_audit(
    invitation.organization_id, invitation.project_id, 'invitation_revoked',
    'invitation', invitation.id::text, request_id,
    jsonb_build_object('previousStatus', invitation.status)
  );
  return jsonb_build_object('id', invitation.id, 'status', 'revoked', 'rowVersion', invitation.row_version + 1);
end;
$$;

create or replace function geoai_private.admin_set_organization_member(
  target_organization_id uuid,
  target_profile_id uuid,
  target_role text,
  target_status text,
  expected_row_version bigint default null,
  request_id uuid default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  actor_id uuid;
  actor_role text;
  membership public.organization_memberships%rowtype;
  result_id uuid;
  result_version bigint;
begin
  perform geoai_private.require_aal2();
  actor_id := geoai_private.current_profile_id();
  if actor_id is null then
    raise exception 'authenticated permanent user is required' using errcode = '42501';
  end if;
  perform 1 from public.organizations organization
    where organization.id = target_organization_id and organization.status = 'active'
    for update;
  if not found then
    raise exception 'active organization not found' using errcode = 'P0002';
  end if;
  if geoai_private.has_platform_role(array['platform_owner', 'platform_admin']::text[]) then
    actor_role := 'owner';
  else
    select current_membership.role into actor_role
    from public.organization_memberships current_membership
    where current_membership.organization_id = target_organization_id
      and current_membership.profile_id = actor_id
      and current_membership.status = 'active'
      and current_membership.role in ('owner', 'admin');
  end if;
  if actor_role is null then
    raise exception 'organization administrator required' using errcode = '42501';
  end if;
  if target_role not in ('owner', 'admin', 'member')
     or target_status not in ('active', 'invited', 'disabled', 'suspended') then
    raise exception 'invalid organization membership transition' using errcode = '22023';
  end if;
  if actor_role = 'admin' and (target_role <> 'member' or target_status = 'suspended') then
    raise exception 'organization admin cannot grant or suspend elevated authority' using errcode = '42501';
  end if;
  if not exists (
    select 1
    from public.profiles profile
    join auth.users auth_user on auth_user.id = profile.auth_user_id
    where profile.id = target_profile_id
      and profile.identity_kind = 'user'
      and profile.status = 'active'
      and auth_user.confirmed_at is not null
      and coalesce(auth_user.is_anonymous, false) = false
      and auth_user.deleted_at is null
  ) then
    raise exception 'target must be a confirmed permanent active profile' using errcode = '23514';
  end if;

  select * into membership
  from public.organization_memberships candidate
  where candidate.organization_id = target_organization_id
    and candidate.profile_id = target_profile_id
  for update;

  if membership.id is null then
    if expected_row_version is not null then
      raise exception 'stale organization membership version' using errcode = '40001';
    end if;
    insert into public.organization_memberships (
      organization_id, profile_id, role, status
    ) values (
      target_organization_id, target_profile_id, target_role, target_status
    ) returning id, row_version into result_id, result_version;
  else
    if expected_row_version is null or membership.row_version <> expected_row_version then
      raise exception 'stale organization membership version' using errcode = '40001';
    end if;
    update public.organization_memberships
    set role = target_role, status = target_status
    where id = membership.id
    returning id, row_version into result_id, result_version;
  end if;

  perform geoai_private.write_admin_audit(
    target_organization_id, null, 'organization_membership_changed',
    'organization_membership', result_id::text, request_id,
    jsonb_build_object(
      'targetProfileId', target_profile_id,
      'oldRole', membership.role,
      'oldStatus', membership.status,
      'newRole', target_role,
      'newStatus', target_status,
      'rowVersion', result_version
    )
  );
  return jsonb_build_object('id', result_id, 'rowVersion', result_version);
end;
$$;

create or replace function geoai_private.admin_set_project_member(
  target_project_id uuid,
  target_profile_id uuid,
  target_role text,
  target_status text,
  expected_row_version bigint default null,
  request_id uuid default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  actor_id uuid;
  actor_role text;
  project public.projects%rowtype;
  membership public.project_memberships%rowtype;
  result_id uuid;
  result_version bigint;
begin
  perform geoai_private.require_aal2();
  actor_id := geoai_private.current_profile_id();
  if actor_id is null then
    raise exception 'authenticated permanent user is required' using errcode = '42501';
  end if;
  select * into project from public.projects
  where id = target_project_id and status in ('active', 'demo');
  if not found then
    raise exception 'active project not found' using errcode = 'P0002';
  end if;
  -- Canonical lock order: organization then project.
  perform 1 from public.organizations organization
    where organization.id = project.organization_id and organization.status = 'active'
    for update;
  if not found then
    raise exception 'active organization not found' using errcode = 'P0002';
  end if;
  perform 1 from public.projects target_project
    where target_project.id = project.id for update;

  if geoai_private.has_platform_role(array['platform_owner', 'platform_admin']::text[])
     or geoai_private.has_organization_role(project.organization_id, array['owner']::text[]) then
    actor_role := 'owner';
  elsif geoai_private.has_organization_role(project.organization_id, array['admin']::text[])
     or geoai_private.has_project_role(project.id, array['admin']::text[]) then
    actor_role := 'admin';
  elsif geoai_private.has_project_role(project.id, array['owner']::text[]) then
    actor_role := 'owner';
  end if;
  if actor_role is null then
    raise exception 'project administrator required' using errcode = '42501';
  end if;
  if target_role not in ('owner', 'admin', 'analyst', 'viewer', 'client_viewer')
     or target_status not in ('active', 'invited', 'disabled') then
    raise exception 'invalid project membership transition' using errcode = '22023';
  end if;
  if actor_role = 'admin' and target_role in ('owner', 'admin') then
    raise exception 'project admin cannot grant elevated authority' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.organization_memberships organization_membership
    where organization_membership.organization_id = project.organization_id
      and organization_membership.profile_id = target_profile_id
      and organization_membership.status = 'active'
  ) then
    raise exception 'target requires an active organization membership' using errcode = '23514';
  end if;

  select * into membership
  from public.project_memberships candidate
  where candidate.project_id = project.id and candidate.user_id = target_profile_id
  for update;

  if membership.id is null then
    if expected_row_version is not null then
      raise exception 'stale project membership version' using errcode = '40001';
    end if;
    insert into public.project_memberships (
      organization_id, project_id, project_key, user_id, role, status
    ) values (
      project.organization_id, project.id, project.project_key,
      target_profile_id, target_role, target_status
    ) returning id, row_version into result_id, result_version;
  else
    if expected_row_version is null or membership.row_version <> expected_row_version then
      raise exception 'stale project membership version' using errcode = '40001';
    end if;
    update public.project_memberships
    set role = target_role, status = target_status
    where id = membership.id
    returning id, row_version into result_id, result_version;
  end if;

  perform geoai_private.write_admin_audit(
    project.organization_id, project.id, 'project_membership_changed',
    'project_membership', result_id::text, request_id,
    jsonb_build_object(
      'targetProfileId', target_profile_id,
      'oldRole', membership.role,
      'oldStatus', membership.status,
      'newRole', target_role,
      'newStatus', target_status,
      'rowVersion', result_version
    )
  );
  return jsonb_build_object('id', result_id, 'rowVersion', result_version);
end;
$$;

create or replace function geoai_private.admin_organization_snapshot(
  target_organization_id uuid,
  page_size integer default 25,
  before_created_at timestamptz default null,
  before_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  bounded_size integer := least(greatest(coalesce(page_size, 25), 1), 100);
begin
  if geoai_private.current_profile_id() is null then
    raise exception 'authenticated permanent user is required' using errcode = '42501';
  end if;
  if not (
    geoai_private.has_platform_role(array['platform_owner', 'platform_admin', 'support', 'auditor']::text[])
    or geoai_private.has_organization_role(target_organization_id, array['owner', 'admin']::text[])
  ) then
    raise exception 'organization administration role is required' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.organizations organization
    where organization.id = target_organization_id and organization.status = 'active'
  ) then
    raise exception 'active organization not found' using errcode = 'P0002';
  end if;

  return jsonb_build_object(
    'organization', (
      select jsonb_build_object(
        'id', organization.id,
        'name', organization.name,
        'slug', organization.slug,
        'status', organization.status,
        'rowVersion', organization.row_version
      )
      from public.organizations organization
      where organization.id = target_organization_id
    ),
    'counts', jsonb_build_object(
      'clients', (select count(*) from public.clients where organization_id = target_organization_id),
      'projects', (select count(*) from public.projects where organization_id = target_organization_id),
      'members', (select count(*) from public.organization_memberships where organization_id = target_organization_id),
      'pendingInvitations', (
        select count(*) from public.invitations
        where organization_id = target_organization_id and status = 'pending'
      )
    ),
    'clients', (
      select coalesce(jsonb_agg(to_jsonb(page) order by page.created_at desc, page.id desc), '[]'::jsonb)
      from (
        select client.id, client.client_key, client.display_name, client.legal_name,
          client.status, client.created_at, client.updated_at, client.row_version
        from public.clients client
        where client.organization_id = target_organization_id
          and (
            before_created_at is null or before_id is null
            or (client.created_at, client.id) < (before_created_at, before_id)
          )
        order by client.created_at desc, client.id desc
        limit bounded_size
      ) page
    ),
    'projects', (
      select coalesce(jsonb_agg(to_jsonb(page) order by page.created_at desc, page.id desc), '[]'::jsonb)
      from (
        select project.id, project.project_key, project.name, project.status,
          project.client_id, client.display_name as client_name,
          project.created_at, project.updated_at, project.row_version
        from public.projects project
        left join public.clients client
          on client.id = project.client_id and client.organization_id = project.organization_id
        where project.organization_id = target_organization_id
          and (
            before_created_at is null or before_id is null
            or (project.created_at, project.id) < (before_created_at, before_id)
          )
        order by project.created_at desc, project.id desc
        limit bounded_size
      ) page
    ),
    'members', (
      select coalesce(jsonb_agg(to_jsonb(page) order by page.created_at desc, page.id desc), '[]'::jsonb)
      from (
        select membership.id, membership.profile_id, profile.email, profile.full_name,
          membership.role, membership.status, membership.created_at,
          membership.updated_at, membership.row_version
        from public.organization_memberships membership
        join public.profiles profile on profile.id = membership.profile_id
        where membership.organization_id = target_organization_id
          and (
            before_created_at is null or before_id is null
            or (membership.created_at, membership.id) < (before_created_at, before_id)
          )
        order by membership.created_at desc, membership.id desc
        limit bounded_size
      ) page
    ),
    'invitations', (
      select coalesce(jsonb_agg(to_jsonb(page) order by page.created_at desc, page.id desc), '[]'::jsonb)
      from (
        select invitation.id, invitation.project_id, invitation.email,
          invitation.organization_role, invitation.project_role, invitation.status,
          invitation.expires_at, invitation.created_at, invitation.updated_at,
          invitation.row_version
        from public.invitations invitation
        where invitation.organization_id = target_organization_id
          and (
            before_created_at is null or before_id is null
            or (invitation.created_at, invitation.id) < (before_created_at, before_id)
          )
        order by invitation.created_at desc, invitation.id desc
        limit bounded_size
      ) page
    ),
    'audit', (
      select coalesce(jsonb_agg(to_jsonb(page) order by page.created_at desc, page.id desc), '[]'::jsonb)
      from (
        select event.id, event.project_id, event.actor_profile_id, event.action,
          event.target_type, event.target_id, event.request_id, event.details, event.created_at
        from public.admin_audit_events event
        where event.organization_id = target_organization_id
          and (
            before_created_at is null or before_id is null
            or (event.created_at, event.id) < (before_created_at, before_id)
          )
        order by event.created_at desc, event.id desc
        limit bounded_size
      ) page
    )
  );
end;
$$;

-- Exposed wrappers are SECURITY INVOKER. Privileged table access remains in
-- geoai_private and every private function re-validates caller identity, AAL,
-- tenant role, target scope and state before touching rows.
create or replace function api.create_organization(
  organization_name text,
  organization_slug text,
  request_id uuid default null
)
returns jsonb
language sql
volatile
security invoker
set search_path = ''
as $$
  select geoai_private.admin_create_organization(organization_name, organization_slug, request_id)
$$;

create or replace function api.create_client(
  target_organization_id uuid,
  target_client_key text,
  target_display_name text,
  target_legal_name text default null,
  request_id uuid default null
)
returns jsonb
language sql
volatile
security invoker
set search_path = ''
as $$
  select geoai_private.admin_create_client(
    target_organization_id, target_client_key, target_display_name,
    target_legal_name, request_id
  )
$$;

create or replace function api.create_project(
  target_organization_id uuid,
  target_client_id uuid,
  target_project_key text,
  target_name text,
  target_description text default null,
  request_id uuid default null
)
returns jsonb
language sql
volatile
security invoker
set search_path = ''
as $$
  select geoai_private.admin_create_project(
    target_organization_id, target_client_id, target_project_key,
    target_name, target_description, request_id
  )
$$;

create or replace function api.create_invitation(
  target_organization_id uuid,
  target_project_id uuid,
  target_email text,
  target_organization_role text,
  target_project_role text,
  target_token_hash text,
  target_expires_at timestamptz,
  request_id uuid default null
)
returns jsonb
language sql
volatile
security invoker
set search_path = ''
as $$
  select geoai_private.admin_create_invitation(
    target_organization_id, target_project_id, target_email,
    target_organization_role, target_project_role, target_token_hash,
    target_expires_at, request_id
  )
$$;

create or replace function api.accept_invitation(
  target_token_hash text,
  request_id uuid default null
)
returns jsonb
language sql
volatile
security invoker
set search_path = ''
as $$
  select geoai_private.admin_accept_invitation(target_token_hash, request_id)
$$;

create or replace function api.revoke_invitation(
  target_invitation_id uuid,
  expected_row_version bigint,
  request_id uuid default null
)
returns jsonb
language sql
volatile
security invoker
set search_path = ''
as $$
  select geoai_private.admin_revoke_invitation(
    target_invitation_id, expected_row_version, request_id
  )
$$;

create or replace function api.set_organization_member(
  target_organization_id uuid,
  target_profile_id uuid,
  target_role text,
  target_status text,
  expected_row_version bigint default null,
  request_id uuid default null
)
returns jsonb
language sql
volatile
security invoker
set search_path = ''
as $$
  select geoai_private.admin_set_organization_member(
    target_organization_id, target_profile_id, target_role, target_status,
    expected_row_version, request_id
  )
$$;

create or replace function api.set_project_member(
  target_project_id uuid,
  target_profile_id uuid,
  target_role text,
  target_status text,
  expected_row_version bigint default null,
  request_id uuid default null
)
returns jsonb
language sql
volatile
security invoker
set search_path = ''
as $$
  select geoai_private.admin_set_project_member(
    target_project_id, target_profile_id, target_role, target_status,
    expected_row_version, request_id
  )
$$;

create or replace function api.organization_admin_snapshot(
  target_organization_id uuid,
  page_size integer default 25,
  before_created_at timestamptz default null,
  before_id uuid default null
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select geoai_private.admin_organization_snapshot(
    target_organization_id, page_size, before_created_at, before_id
  )
$$;

revoke all on function geoai_private.admin_create_organization(text, text, uuid)
  from public, anon, authenticated, service_role;
revoke all on function geoai_private.admin_create_client(uuid, text, text, text, uuid)
  from public, anon, authenticated, service_role;
revoke all on function geoai_private.admin_create_project(uuid, uuid, text, text, text, uuid)
  from public, anon, authenticated, service_role;
revoke all on function geoai_private.admin_create_invitation(uuid, uuid, text, text, text, text, timestamptz, uuid)
  from public, anon, authenticated, service_role;
revoke all on function geoai_private.admin_accept_invitation(text, uuid)
  from public, anon, authenticated, service_role;
revoke all on function geoai_private.admin_revoke_invitation(uuid, bigint, uuid)
  from public, anon, authenticated, service_role;
revoke all on function geoai_private.admin_set_organization_member(uuid, uuid, text, text, bigint, uuid)
  from public, anon, authenticated, service_role;
revoke all on function geoai_private.admin_set_project_member(uuid, uuid, text, text, bigint, uuid)
  from public, anon, authenticated, service_role;
revoke all on function geoai_private.admin_organization_snapshot(uuid, integer, timestamptz, uuid)
  from public, anon, authenticated, service_role;

grant execute on function geoai_private.admin_create_organization(text, text, uuid) to authenticated;
grant execute on function geoai_private.admin_create_client(uuid, text, text, text, uuid) to authenticated;
grant execute on function geoai_private.admin_create_project(uuid, uuid, text, text, text, uuid) to authenticated;
grant execute on function geoai_private.admin_create_invitation(uuid, uuid, text, text, text, text, timestamptz, uuid) to authenticated;
grant execute on function geoai_private.admin_accept_invitation(text, uuid) to authenticated;
grant execute on function geoai_private.admin_revoke_invitation(uuid, bigint, uuid) to authenticated;
grant execute on function geoai_private.admin_set_organization_member(uuid, uuid, text, text, bigint, uuid) to authenticated;
grant execute on function geoai_private.admin_set_project_member(uuid, uuid, text, text, bigint, uuid) to authenticated;
grant execute on function geoai_private.admin_organization_snapshot(uuid, integer, timestamptz, uuid) to authenticated;

revoke all on function api.create_organization(text, text, uuid)
  from public, anon, authenticated, service_role;
revoke all on function api.create_client(uuid, text, text, text, uuid)
  from public, anon, authenticated, service_role;
revoke all on function api.create_project(uuid, uuid, text, text, text, uuid)
  from public, anon, authenticated, service_role;
revoke all on function api.create_invitation(uuid, uuid, text, text, text, text, timestamptz, uuid)
  from public, anon, authenticated, service_role;
revoke all on function api.accept_invitation(text, uuid)
  from public, anon, authenticated, service_role;
revoke all on function api.revoke_invitation(uuid, bigint, uuid)
  from public, anon, authenticated, service_role;
revoke all on function api.set_organization_member(uuid, uuid, text, text, bigint, uuid)
  from public, anon, authenticated, service_role;
revoke all on function api.set_project_member(uuid, uuid, text, text, bigint, uuid)
  from public, anon, authenticated, service_role;
revoke all on function api.organization_admin_snapshot(uuid, integer, timestamptz, uuid)
  from public, anon, authenticated, service_role;

grant execute on function api.create_organization(text, text, uuid) to authenticated;
grant execute on function api.create_client(uuid, text, text, text, uuid) to authenticated;
grant execute on function api.create_project(uuid, uuid, text, text, text, uuid) to authenticated;
grant execute on function api.create_invitation(uuid, uuid, text, text, text, text, timestamptz, uuid) to authenticated;
grant execute on function api.accept_invitation(text, uuid) to authenticated;
grant execute on function api.revoke_invitation(uuid, bigint, uuid) to authenticated;
grant execute on function api.set_organization_member(uuid, uuid, text, text, bigint, uuid) to authenticated;
grant execute on function api.set_project_member(uuid, uuid, text, text, bigint, uuid) to authenticated;
grant execute on function api.organization_admin_snapshot(uuid, integer, timestamptz, uuid) to authenticated;

comment on table public.platform_memberships is
  'Platform-wide roles. First owner is created only through the owner-only bootstrap procedure.';
comment on table public.clients is
  'Tenant-scoped client accounts. Direct Data API access is closed.';
comment on table public.invitations is
  'Single-use, tenant-scoped invitation hashes. Raw invitation tokens are never stored.';
comment on table public.admin_audit_events is
  'Append-only administration audit events. Direct Data API access is closed.';
