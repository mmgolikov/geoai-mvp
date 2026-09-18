-- Forward-only invitation authority hardening. No stored data is rewritten.
begin;

-- A token is not a durable delegation after its issuer loses current authority.
create or replace function geoai_private.can_issue_invitation(
  issuer_profile_id uuid,
  target_organization_id uuid,
  target_project_id uuid,
  target_organization_role text,
  target_project_role text
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
    join public.organizations organization on organization.id = target_organization_id
    left join public.platform_memberships platform_membership
      on platform_membership.profile_id = profile.id and platform_membership.status = 'active'
    left join public.organization_memberships organization_membership
      on organization_membership.organization_id = organization.id
      and organization_membership.profile_id = profile.id
      and organization_membership.status = 'active'
    left join public.projects project
      on project.id = target_project_id and project.organization_id = organization.id
      and project.status in ('active', 'demo')
    left join public.project_memberships project_membership
      on project_membership.project_id = project.id
      and project_membership.organization_id = organization.id
      and project_membership.user_id = profile.id
      and project_membership.status = 'active'
    where profile.id = issuer_profile_id
      and profile.identity_kind = 'user' and profile.status = 'active'
      and coalesce(auth_user.is_anonymous, false) = false
      and auth_user.confirmed_at is not null and auth_user.deleted_at is null
      and (auth_user.banned_until is null or auth_user.banned_until <= now())
      and organization.status = 'active'
      and target_organization_role in ('owner', 'admin', 'member')
      and (
        (target_project_id is null and target_project_role is null)
        or (project.id is not null and target_project_role in ('owner', 'admin', 'analyst', 'viewer', 'client_viewer'))
      )
      and (
        platform_membership.role in ('platform_owner', 'platform_admin')
        or organization_membership.role = 'owner'
        or (
          target_organization_role = 'member'
          and (target_project_id is null or target_project_role in ('analyst', 'viewer', 'client_viewer'))
          and (
            organization_membership.role = 'admin'
            or (project.id is not null and organization_membership.id is not null
                and project_membership.role in ('owner', 'admin'))
          )
        )
      )
  )
$$;

-- Explicit issuer is internal only: no caller-visible role oracle / new API.
revoke all on function geoai_private.can_issue_invitation(uuid, uuid, uuid, text, text)
  from public, anon, authenticated, service_role;

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
  if not geoai_private.can_issue_invitation(
    actor_id, target_organization_id, target_project_id,
    target_organization_role, target_project_role
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

-- Preserve canonical organization -> project -> invitation lock order.
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
  -- Recheck the issuer, not the accepting user's roles, before ANY write.
  -- Old self-invitations cannot exceed the issuer's current assignment scope.
  if not geoai_private.can_issue_invitation(
    invitation.created_by, invitation.organization_id, invitation.project_id,
    invitation.organization_role, invitation.project_role
  ) then
    raise exception 'invitation issuer no longer has assignment authority' using errcode = '42501';
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

  -- An invitation must not overwrite an existing elevated membership on behalf
  -- of an issuer who could not assign that authority in the first place.
  if exists (
    select 1 from public.organization_memberships membership
    where membership.organization_id = invitation.organization_id
      and membership.profile_id = actor_id
      and membership.role in ('owner', 'admin')
      and not geoai_private.can_issue_invitation(
        invitation.created_by, invitation.organization_id, null,
        membership.role, null
      )
  ) or exists (
    select 1 from public.project_memberships membership
    where membership.project_id = invitation.project_id
      and membership.user_id = actor_id
      and membership.role in ('owner', 'admin')
      and not geoai_private.can_issue_invitation(
        invitation.created_by, invitation.organization_id,
        invitation.project_id, 'member', membership.role
      )
  ) then
    raise exception 'invitation issuer cannot replace existing elevated membership' using errcode = '42501';
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

revoke all on function geoai_private.admin_create_invitation(uuid, uuid, text, text, text, text, timestamptz, uuid)
  from public, anon, authenticated, service_role;
revoke all on function geoai_private.admin_accept_invitation(text, uuid)
  from public, anon, authenticated, service_role;
grant execute on function geoai_private.admin_create_invitation(uuid, uuid, text, text, text, text, timestamptz, uuid) to authenticated;
grant execute on function geoai_private.admin_accept_invitation(text, uuid) to authenticated;

commit;
