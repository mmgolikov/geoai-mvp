-- Forward-only lifecycle remediation for the already-applied Auth/Admin activation.
-- Preserve the 14-RPC Data API inventory while closing invitation lifecycle,
-- owner-bootstrap provenance, temporary-ban and aggregate-pagination defects.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '120s';

-- A temporary Auth ban is evaluated dynamically by every identity/role helper.
-- profiles.status remains durable application/identity lifecycle state:
-- disabled is operator-controlled, while inactive is unconfirmed/deleted.
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
    then 'active'
    else 'inactive'
  end;

  update public.profiles profile
  set email = canonical_email,
      full_name = coalesce(canonical_name, profile.full_name, canonical_email),
      status = case when profile.status = 'disabled' then 'disabled' else canonical_status end,
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
          status = case when profile.status = 'disabled' then 'disabled' else canonical_status end,
          identity_kind = 'user',
          updated_at = now()
      where profile.auth_user_id = new.id;
    end;
  end if;
  return new;
end;
$$;

revoke all on function geoai_private.provision_auth_profile()
  from public, anon, authenticated, service_role;

-- Reconcile only the auth-derived inactive state. A manual application block
-- uses status=disabled and is deliberately preserved. Active profile state
-- does not bypass a current ban because the authorization helpers still check
-- auth.users.banned_until on every request transaction.
update public.profiles profile
set status = 'active', updated_at = now()
from auth.users auth_user
where profile.auth_user_id = auth_user.id
  and profile.identity_kind = 'user'
  and profile.status = 'inactive'
  and coalesce(auth_user.is_anonymous, false) is false
  and auth_user.confirmed_at is not null
  and auth_user.email_confirmed_at is not null
  and auth_user.deleted_at is null;

-- The legacy owner bootstrap cannot capture durable operator/change
-- provenance. Keep the signature fail-closed so postgres cannot bypass v2 by
-- invoking the old owner-owned function directly.
create or replace function geoai_private.bootstrap_first_platform_owner(target_auth_user_id uuid)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  raise exception 'bootstrap v1 is disabled; use bootstrap_first_platform_owner_v2'
    using errcode = '0A000';
end;
$$;

revoke all on function geoai_private.bootstrap_first_platform_owner(uuid)
  from public, anon, authenticated, service_role;

create or replace function geoai_private.bootstrap_first_platform_owner_v2(
  target_auth_user_id uuid,
  change_ticket text,
  operator_identity text,
  request_id uuid
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  canonical_ticket text := btrim(change_ticket);
  canonical_operator text := btrim(operator_identity);
  target_profile_id uuid;
  target_email text;
  membership_profile_id uuid;
  audit_event_id uuid;
begin
  if target_auth_user_id is null then
    raise exception 'bootstrap target Auth user is required' using errcode = '22023';
  end if;
  if char_length(coalesce(canonical_ticket, '')) not between 3 and 160 then
    raise exception 'bootstrap change ticket must contain 3 to 160 characters' using errcode = '22023';
  end if;
  if char_length(coalesce(canonical_operator, '')) not between 3 and 160 then
    raise exception 'bootstrap operator identity must contain 3 to 160 characters' using errcode = '22023';
  end if;
  if request_id is null then
    raise exception 'bootstrap request id is required' using errcode = '22023';
  end if;

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
    and coalesce(auth_user.is_anonymous, false) is false
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
    raise exception 'bootstrap requires an active provisioned profile' using errcode = '23514';
  end if;

  insert into public.platform_memberships (profile_id, role, status, created_by)
  values (target_profile_id, 'platform_owner', 'active', target_profile_id)
  returning profile_id into membership_profile_id;

  insert into public.admin_audit_events (
    actor_profile_id, action, target_type, target_id, request_id, details
  ) values (
    target_profile_id,
    'platform_owner_bootstrapped',
    'profile',
    target_profile_id::text,
    request_id,
    jsonb_build_object(
      'authUserId', target_auth_user_id,
      'changeTicket', canonical_ticket,
      'operatorIdentity', canonical_operator
    )
  ) returning id into audit_event_id;

  return jsonb_build_object(
    'profileId', target_profile_id,
    'platformMembershipProfileId', membership_profile_id,
    'auditEventId', audit_event_id,
    'requestId', request_id,
    'role', 'platform_owner',
    'status', 'active'
  );
end;
$$;

revoke all on function geoai_private.bootstrap_first_platform_owner_v2(uuid, text, text, uuid)
  from public, anon, authenticated, service_role;

-- Resolve invitation scope without a row lock, then serialize every mutation
-- in the canonical organization -> project -> invitation order. The final
-- invitation read revalidates the immutable scope under FOR UPDATE.
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
  invitation_scope record;
  invitation public.invitations%rowtype;
  actor_id uuid;
  actor_email text;
  expired_version bigint;
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

  select candidate.id, candidate.organization_id, candidate.project_id
  into invitation_scope
  from public.invitations candidate
  where candidate.token_hash = target_token_hash;
  if not found then
    raise exception 'invitation not found' using errcode = 'P0002';
  end if;

  perform 1
  from public.organizations organization
  where organization.id = invitation_scope.organization_id
    and organization.status = 'active'
  for update;
  if not found then
    raise exception 'invitation organization is inactive' using errcode = '23514';
  end if;

  if invitation_scope.project_id is not null then
    perform 1
    from public.projects project
    where project.id = invitation_scope.project_id
      and project.organization_id = invitation_scope.organization_id
      and project.status in ('active', 'demo')
    for update;
    if not found then
      raise exception 'invitation project is inactive' using errcode = '23514';
    end if;
  end if;

  select *
  into invitation
  from public.invitations candidate
  where candidate.id = invitation_scope.id
    and candidate.token_hash = target_token_hash
    and candidate.organization_id = invitation_scope.organization_id
    and candidate.project_id is not distinct from invitation_scope.project_id
  for update;
  if not found then
    raise exception 'invitation scope changed while acquiring locks' using errcode = '40001';
  end if;

  if invitation.status <> 'pending' then
    raise exception 'invitation is not pending' using errcode = '23514';
  end if;
  if actor_email is distinct from invitation.email then
    raise exception 'invitation email does not match authenticated user' using errcode = '42501';
  end if;
  if invitation.expires_at <= now() then
    update public.invitations
    set status = 'expired'
    where id = invitation.id
    returning row_version into expired_version;
    return jsonb_build_object(
      'id', invitation.id,
      'status', 'expired',
      'rowVersion', expired_version,
      'organizationId', invitation.organization_id,
      'projectId', invitation.project_id
    );
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
  invitation_scope record;
  invitation public.invitations%rowtype;
begin
  perform geoai_private.require_aal2();

  select candidate.id, candidate.organization_id, candidate.project_id
  into invitation_scope
  from public.invitations candidate
  where candidate.id = target_invitation_id;
  if not found then
    raise exception 'invitation not found' using errcode = 'P0002';
  end if;

  perform 1
  from public.organizations organization
  where organization.id = invitation_scope.organization_id
  for update;
  if not found then
    raise exception 'invitation organization not found' using errcode = '23514';
  end if;

  if invitation_scope.project_id is not null then
    perform 1
    from public.projects project
    where project.id = invitation_scope.project_id
      and project.organization_id = invitation_scope.organization_id
    for update;
    if not found then
      raise exception 'invitation project not found' using errcode = '23514';
    end if;
  end if;

  select *
  into invitation
  from public.invitations candidate
  where candidate.id = invitation_scope.id
    and candidate.organization_id = invitation_scope.organization_id
    and candidate.project_id is not distinct from invitation_scope.project_id
  for update;
  if not found then
    raise exception 'invitation scope changed while acquiring locks' using errcode = '40001';
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
  return jsonb_build_object(
    'id', invitation.id,
    'status', 'revoked',
    'rowVersion', invitation.row_version + 1
  );
end;
$$;

revoke all on function geoai_private.admin_accept_invitation(text, uuid)
  from public, anon, authenticated, service_role;
revoke all on function geoai_private.admin_revoke_invitation(uuid, bigint, uuid)
  from public, anon, authenticated, service_role;
grant execute on function geoai_private.admin_accept_invitation(text, uuid) to authenticated;
grant execute on function geoai_private.admin_revoke_invitation(uuid, bigint, uuid) to authenticated;

-- The aggregate endpoint is an initial, bounded dashboard snapshot. A single
-- cursor cannot paginate five independently ordered collections correctly, so
-- continuation fails closed until resource-specific page RPCs are designed and
-- evidenced with the real Admin UI.
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
  bounded_size integer := least(greatest(coalesce(page_size, 25), 1), 25);
begin
  if before_created_at is not null or before_id is not null then
    raise exception 'aggregate admin snapshot supports the initial page only'
      using errcode = '0A000';
  end if;
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
    'pagination', jsonb_build_object(
      'mode', 'initial_snapshot_only',
      'continuationSupported', false,
      'pageSize', bounded_size
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
        order by event.created_at desc, event.id desc
        limit bounded_size
      ) page
    )
  );
end;
$$;

revoke all on function geoai_private.admin_organization_snapshot(uuid, integer, timestamptz, uuid)
  from public, anon, authenticated, service_role;
grant execute on function geoai_private.admin_organization_snapshot(uuid, integer, timestamptz, uuid)
  to authenticated;

commit;
