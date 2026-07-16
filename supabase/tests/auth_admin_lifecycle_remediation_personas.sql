-- Forward-remediation personas. Run after every canonical migration on a clean
-- local or isolated rehearsal database. All Auth/data fixtures roll back.

begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(39);

-- Structure, privileges and unchanged Data API inventory (1-6).
select extensions.has_function(
  'geoai_private', 'bootstrap_first_platform_owner_v2',
  array['uuid', 'text', 'text', 'uuid'],
  'durably audited platform-owner bootstrap v2 exists'
);
select extensions.ok(
  not has_function_privilege('anon', 'geoai_private.bootstrap_first_platform_owner(uuid)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'geoai_private.bootstrap_first_platform_owner(uuid)', 'EXECUTE')
  and not has_function_privilege('service_role', 'geoai_private.bootstrap_first_platform_owner(uuid)', 'EXECUTE'),
  'legacy bootstrap v1 has no caller-role grant'
);
select extensions.ok(
  not has_function_privilege('anon', 'geoai_private.bootstrap_first_platform_owner_v2(uuid,text,text,uuid)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'geoai_private.bootstrap_first_platform_owner_v2(uuid,text,text,uuid)', 'EXECUTE')
  and not has_function_privilege('service_role', 'geoai_private.bootstrap_first_platform_owner_v2(uuid,text,text,uuid)', 'EXECUTE'),
  'bootstrap v2 is owner-only and absent from caller roles'
);
select extensions.ok(
  exists (
    select 1
    from pg_proc procedure
    join pg_namespace namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'geoai_private'
      and procedure.proname = 'bootstrap_first_platform_owner_v2'
      and procedure.prosecdef
      and procedure.proconfig @> array['search_path=""']::text[]
  ),
  'bootstrap v2 is a private definer with an empty search path'
);
select extensions.is(
  (
    select count(*)::integer
    from pg_proc procedure
    join pg_namespace namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'api'
  ),
  14,
  'remediation does not expand the exact 14-RPC Data API inventory'
);
select extensions.has_function(
  'api', 'organization_admin_snapshot',
  array['uuid', 'integer', 'timestamp with time zone', 'uuid'],
  'initial-only aggregate admin snapshot retains its API signature'
);

create temporary table remediation_ids (key text primary key, id uuid not null) on commit drop;
grant select, insert, update, delete on table pg_temp.remediation_ids to authenticated;

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  banned_until, deleted_at, is_anonymous
) values
  ('93000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'remediation-owner@test.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now(), null, null, false),
  ('93000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'remediation-invitee@test.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now(), null, null, false),
  ('93000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'remediation-banned@test.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now(), now() + interval '1 day', null, false),
  ('93000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'remediation-unconfirmed@test.invalid', '', null, '{}'::jsonb, '{}'::jsonb, now(), now(), null, null, false),
  ('93000000-0000-0000-0000-000000000005', 'authenticated', 'authenticated', 'remediation-disabled@test.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now(), null, null, false);

-- Temporary-ban and durable profile-state behavior (7-13).
select extensions.is(
  (select status from public.profiles where auth_user_id = '93000000-0000-0000-0000-000000000003'),
  'active',
  'temporary Auth ban does not rewrite durable profile status'
);
set local role authenticated;
select set_config('request.jwt.claim.sub', '93000000-0000-0000-0000-000000000003', true);
select set_config('request.jwt.claims', '{"sub":"93000000-0000-0000-0000-000000000003","role":"authenticated","aal":"aal1","is_anonymous":false}', true);
select extensions.is((select count(*)::integer from api.current_profile()), 0, 'current temporary ban still denies the caller dynamically');
reset role;
update auth.users
set banned_until = now() - interval '1 second', updated_at = now()
where id = '93000000-0000-0000-0000-000000000003';
set local role authenticated;
select set_config('request.jwt.claim.sub', '93000000-0000-0000-0000-000000000003', true);
select set_config('request.jwt.claims', '{"sub":"93000000-0000-0000-0000-000000000003","role":"authenticated","aal":"aal1","is_anonymous":false}', true);
select extensions.is(
  (select email from api.current_profile()),
  'remediation-banned@test.invalid',
  'expired temporary ban restores access without profile-state repair'
);
reset role;
select extensions.is(
  (select status from public.profiles where auth_user_id = '93000000-0000-0000-0000-000000000004'),
  'inactive',
  'unconfirmed identity remains inactive'
);
update auth.users
set email_confirmed_at = now(), updated_at = now()
where id = '93000000-0000-0000-0000-000000000004';
select extensions.is(
  (select status from public.profiles where auth_user_id = '93000000-0000-0000-0000-000000000004'),
  'active',
  'confirmation activates the provisioned profile'
);
update auth.users
set deleted_at = now(), updated_at = now()
where id = '93000000-0000-0000-0000-000000000004';
select extensions.is(
  (select status from public.profiles where auth_user_id = '93000000-0000-0000-0000-000000000004'),
  'inactive',
  'deleted identity becomes inactive'
);
update public.profiles
set status = 'disabled'
where auth_user_id = '93000000-0000-0000-0000-000000000005';
update auth.users
set raw_user_meta_data = '{"full_name":"Disabled remains disabled"}'::jsonb,
    banned_until = now() + interval '1 day',
    updated_at = now()
where id = '93000000-0000-0000-0000-000000000005';
select extensions.is(
  (select status from public.profiles where auth_user_id = '93000000-0000-0000-0000-000000000005'),
  'disabled',
  'Auth lifecycle updates preserve an application-disabled profile'
);

-- Owner bootstrap v2 input, atomicity and durable provenance (14-23).
select extensions.throws_ok(
  $$select geoai_private.bootstrap_first_platform_owner('93000000-0000-0000-0000-000000000001')$$,
  '0A000', 'bootstrap v1 is disabled; use bootstrap_first_platform_owner_v2',
  'legacy owner bootstrap fails closed'
);
select extensions.throws_ok(
  $$select geoai_private.bootstrap_first_platform_owner_v2('93000000-0000-0000-0000-000000000001', '', 'pgtap:remediation', '93000000-0000-0000-0000-000000000101')$$,
  '22023', 'bootstrap change ticket must contain 3 to 160 characters',
  'bootstrap rejects an empty change ticket before mutation'
);
select extensions.throws_ok(
  $$select geoai_private.bootstrap_first_platform_owner_v2('93000000-0000-0000-0000-000000000001', 'CHG-REMEDIATION-TEST', '', '93000000-0000-0000-0000-000000000101')$$,
  '22023', 'bootstrap operator identity must contain 3 to 160 characters',
  'bootstrap rejects an empty operator identity before mutation'
);
select extensions.throws_ok(
  $$select geoai_private.bootstrap_first_platform_owner_v2('93000000-0000-0000-0000-000000000001', 'CHG-REMEDIATION-TEST', 'pgtap:remediation', null)$$,
  '22023', 'bootstrap request id is required',
  'bootstrap requires a durable request id before mutation'
);
select extensions.is(
  (geoai_private.bootstrap_first_platform_owner_v2(
    '93000000-0000-0000-0000-000000000001',
    'CHG-REMEDIATION-TEST',
    'pgtap:remediation',
    '93000000-0000-0000-0000-000000000101'
  ) ->> 'profileId')::uuid,
  (select id from public.profiles where auth_user_id = '93000000-0000-0000-0000-000000000001'),
  'bootstrap v2 returns the exact confirmed permanent profile'
);
select extensions.is(
  (select role from public.platform_memberships),
  'platform_owner',
  'bootstrap v2 creates the active platform owner membership'
);
select extensions.is(
  (select count(*)::integer from public.admin_audit_events where action = 'platform_owner_bootstrapped'),
  1,
  'bootstrap v2 creates exactly one durable audit event'
);
select extensions.is(
  (select request_id from public.admin_audit_events where action = 'platform_owner_bootstrapped'),
  '93000000-0000-0000-0000-000000000101'::uuid,
  'bootstrap membership and audit are correlated by the required request id'
);
select extensions.ok(
  exists (
    select 1 from public.admin_audit_events
    where action = 'platform_owner_bootstrapped'
      and details ->> 'changeTicket' = 'CHG-REMEDIATION-TEST'
      and details ->> 'operatorIdentity' = 'pgtap:remediation'
  ),
  'bootstrap audit durably stores change-ticket and operator provenance'
);
select extensions.throws_ok(
  $$select geoai_private.bootstrap_first_platform_owner_v2('93000000-0000-0000-0000-000000000002', 'CHG-SECOND', 'pgtap:remediation', '93000000-0000-0000-0000-000000000102')$$,
  '23505', 'platform owner bootstrap has already been consumed',
  'bootstrap v2 remains one-time under the platform advisory lock'
);

insert into pg_temp.remediation_ids
select 'owner_profile', id from public.profiles where auth_user_id = '93000000-0000-0000-0000-000000000001'
union all
select 'invitee_profile', id from public.profiles where auth_user_id = '93000000-0000-0000-0000-000000000002';

set local role authenticated;
select set_config('request.jwt.claim.sub', '93000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"93000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1","is_anonymous":false}', true);
insert into pg_temp.remediation_ids
select 'organization', (api.create_organization('Remediation Tenant', 'remediation-tenant', null) ->> 'id')::uuid;
select extensions.ok((select id is not null from pg_temp.remediation_ids where key = 'organization'), 'bootstrap owner creates the remediation organization');
insert into pg_temp.remediation_ids
select 'project', (api.create_project(
  (select id from pg_temp.remediation_ids where key = 'organization'),
  null, 'remediation-project', 'Remediation Project', null, null
) ->> 'id')::uuid;
select extensions.ok((select id is not null from pg_temp.remediation_ids where key = 'project'), 'bootstrap owner creates the remediation project');
reset role;

insert into public.clients (organization_id, client_key, display_name, created_by, created_at)
select
  (select id from pg_temp.remediation_ids where key = 'organization'),
  'remediation-client-' || lpad(series::text, 2, '0'),
  'Remediation Client ' || series,
  (select id from pg_temp.remediation_ids where key = 'owner_profile'),
  now() - make_interval(secs => series)
from generate_series(1, 30) series;

insert into public.invitations (
  id, organization_id, project_id, email, organization_role, project_role,
  token_hash, status, expires_at, created_by, created_at
) values (
  '93000000-0000-0000-0000-000000000201',
  (select id from pg_temp.remediation_ids where key = 'organization'),
  (select id from pg_temp.remediation_ids where key = 'project'),
  'remediation-invitee@test.invalid', 'member', 'analyst', repeat('e', 64),
  'pending', now() - interval '1 day',
  (select id from pg_temp.remediation_ids where key = 'owner_profile'),
  now() - interval '2 days'
), (
  '93000000-0000-0000-0000-000000000202',
  (select id from pg_temp.remediation_ids where key = 'organization'),
  (select id from pg_temp.remediation_ids where key = 'project'),
  'revoke@test.invalid', 'member', 'viewer', repeat('f', 64),
  'pending', now() + interval '1 day',
  (select id from pg_temp.remediation_ids where key = 'owner_profile'),
  now()
);

-- Invitation expiry persistence and revoke regression (26-34).
set local role authenticated;
select set_config('request.jwt.claim.sub', '93000000-0000-0000-0000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"93000000-0000-0000-0000-000000000002","role":"authenticated","aal":"aal1","is_anonymous":false}', true);
select extensions.is(api.accept_invitation(repeat('e', 64), null) ->> 'status', 'expired', 'matching caller persists and receives expired invitation status');
reset role;
select extensions.is((select status from public.invitations where id = '93000000-0000-0000-0000-000000000201'), 'expired', 'expired status survives the successful RPC transaction');
select extensions.is((select row_version from public.invitations where id = '93000000-0000-0000-0000-000000000201'), 2::bigint, 'expired transition increments optimistic row version');
select extensions.is(
  (select count(*)::integer from public.organization_memberships where organization_id = (select id from pg_temp.remediation_ids where key = 'organization') and profile_id = (select id from pg_temp.remediation_ids where key = 'invitee_profile')),
  0,
  'expired invitation creates no organization membership'
);
select extensions.is(
  (select count(*)::integer from public.project_memberships where project_id = (select id from pg_temp.remediation_ids where key = 'project') and user_id = (select id from pg_temp.remediation_ids where key = 'invitee_profile')),
  0,
  'expired invitation creates no project membership'
);
set local role authenticated;
select set_config('request.jwt.claim.sub', '93000000-0000-0000-0000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"93000000-0000-0000-0000-000000000002","role":"authenticated","aal":"aal1","is_anonymous":false}', true);
select extensions.throws_ok(
  $$select api.accept_invitation(repeat('e', 64), null)$$,
  '23514', 'invitation is not pending',
  'expired invitation cannot be replayed'
);
select set_config('request.jwt.claim.sub', '93000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"93000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1","is_anonymous":false}', true);
select extensions.is(
  api.revoke_invitation('93000000-0000-0000-0000-000000000202', 1, '93000000-0000-0000-0000-000000000103') ->> 'status',
  'revoked',
  'owner revokes a pending invitation through the remediated lock path'
);
reset role;
select extensions.is((select status from public.invitations where id = '93000000-0000-0000-0000-000000000202'), 'revoked', 'revoked status is persisted');
select extensions.ok(
  exists (
    select 1 from public.admin_audit_events
    where action = 'invitation_revoked'
      and request_id = '93000000-0000-0000-0000-000000000103'
  ),
  'revocation remains durably audited'
);

-- Initial-only aggregate snapshot boundary (35-39).
set local role authenticated;
select set_config('request.jwt.claim.sub', '93000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"93000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1","is_anonymous":false}', true);
select extensions.ok(
  (api.organization_admin_snapshot((select id from pg_temp.remediation_ids where key = 'organization'), 1000, null, null) #>> '{pagination,continuationSupported}')::boolean is false,
  'aggregate snapshot explicitly reports that continuation is unsupported'
);
select extensions.is(
  (api.organization_admin_snapshot((select id from pg_temp.remediation_ids where key = 'organization'), 1000, null, null) #>> '{pagination,pageSize}')::integer,
  25,
  'aggregate snapshot clamps every collection to twenty-five'
);
select extensions.is(
  jsonb_array_length(api.organization_admin_snapshot((select id from pg_temp.remediation_ids where key = 'organization'), 1000, null, null) -> 'clients'),
  25,
  'aggregate snapshot returns at most twenty-five clients'
);
select extensions.throws_ok(
  $$select api.organization_admin_snapshot((select id from pg_temp.remediation_ids where key = 'organization'), 25, now(), '93000000-0000-0000-0000-000000000301')$$,
  '0A000', 'aggregate admin snapshot supports the initial page only',
  'aggregate snapshot rejects a shared continuation cursor'
);
select extensions.throws_ok(
  $$select api.organization_admin_snapshot((select id from pg_temp.remediation_ids where key = 'organization'), 25, now(), null)$$,
  '0A000', 'aggregate admin snapshot supports the initial page only',
  'aggregate snapshot rejects an incomplete continuation cursor'
);

reset role;
select * from extensions.finish();
rollback;
