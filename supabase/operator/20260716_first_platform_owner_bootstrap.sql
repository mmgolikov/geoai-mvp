-- OWNER-ONLY / DO NOT RUN BY INFERENCE.
-- Replace every __PLACEHOLDER__ and execute only after the remediation migration,
-- API isolation and hosted persona evidence pass. This is not a migration and
-- is never invoked by the application, CI or service_role credentials.

begin;

do $bootstrap$
declare
  requested_email constant text := lower(btrim('__CONFIRMED_PLATFORM_OWNER_EMAIL__'));
  change_ticket constant text := btrim('__CHANGE_TICKET__');
  operator_identity constant text := btrim('__OPERATOR_IDENTITY__');
  request_id_text constant text := btrim('__REQUEST_ID_UUID__');
  target_request_id uuid;
  target_auth_user_id uuid;
begin
  if current_user <> 'postgres' then
    raise exception 'first platform owner bootstrap requires the postgres owner role';
  end if;
  if requested_email = '__confirmed_platform_owner_email__'
     or requested_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then
    raise exception 'replace __CONFIRMED_PLATFORM_OWNER_EMAIL__ with the approved canonical email';
  end if;
  if change_ticket = '__CHANGE_TICKET__'
     or operator_identity = '__OPERATOR_IDENTITY__'
     or request_id_text = '__REQUEST_ID_UUID__' then
    raise exception 'replace the change-ticket, operator and request-id receipt placeholders';
  end if;
  begin
    target_request_id := request_id_text::uuid;
  exception when invalid_text_representation then
    raise exception 'replace __REQUEST_ID_UUID__ with an approved UUID';
  end;
  if to_regprocedure('geoai_private.bootstrap_first_platform_owner_v2(uuid,text,text,uuid)') is null then
    raise exception 'Auth/Admin lifecycle remediation migration is not installed';
  end if;

  select auth_user.id
  into strict target_auth_user_id
  from auth.users auth_user
  where lower(auth_user.email) = requested_email
    and coalesce(auth_user.is_anonymous, false) is false
    and auth_user.confirmed_at is not null
    and auth_user.email_confirmed_at is not null
    and auth_user.deleted_at is null
    and (auth_user.banned_until is null or auth_user.banned_until <= now());

  perform geoai_private.bootstrap_first_platform_owner_v2(
    target_auth_user_id,
    change_ticket,
    operator_identity,
    target_request_id
  );
end
$bootstrap$;

commit;

-- Receipt: capture this result with the approved change record.
select jsonb_build_object(
  'changeTicket', '__CHANGE_TICKET__',
  'operatorIdentity', '__OPERATOR_IDENTITY__',
  'requestId', audit_event.request_id,
  'verifiedAt', now(),
  'authUserId', auth_user.id,
  'email', auth_user.email,
  'profileId', profile.id,
  'platformMembershipProfileId', membership.profile_id,
  'auditEventId', audit_event.id,
  'role', membership.role,
  'status', membership.status,
  'updatedAt', membership.updated_at
) as receipt
from auth.users auth_user
join public.profiles profile on profile.auth_user_id = auth_user.id
join public.platform_memberships membership on membership.profile_id = profile.id
join public.admin_audit_events audit_event
  on audit_event.actor_profile_id = profile.id
 and audit_event.action = 'platform_owner_bootstrapped'
 and audit_event.request_id = '__REQUEST_ID_UUID__'::uuid
where lower(auth_user.email) = lower(btrim('__CONFIRMED_PLATFORM_OWNER_EMAIL__'));

-- No automated rollback is provided: the migration protects the last active
-- platform owner. Transfer ownership to another confirmed permanent user and
-- verify access before disabling the original membership through a separately
-- reviewed owner transaction.
