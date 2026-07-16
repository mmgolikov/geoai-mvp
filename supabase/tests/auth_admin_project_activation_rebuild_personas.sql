-- Rebuilt AUTH/ADMIN/PROJECT activation personas. Run only on a clean local or
-- isolated rehearsal database after all migrations. All fixtures roll back.

begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(73);

-- Structural and least-privilege contract (1-35).
select extensions.has_table('public', 'platform_memberships', 'platform memberships exist');
select extensions.has_table('public', 'clients', 'tenant clients exist');
select extensions.has_table('public', 'invitations', 'tenant invitations exist');
select extensions.has_table('public', 'admin_audit_events', 'append-only admin audit exists');
select extensions.has_column('public', 'projects', 'client_id', 'projects can bind a tenant client');
select extensions.has_column('public', 'organizations', 'row_version', 'organizations expose optimistic version state');
select extensions.has_column('public', 'projects', 'row_version', 'projects expose optimistic version state');
select extensions.ok(
  not exists (
    select 1 from pg_class relation join pg_namespace namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname in ('platform_memberships', 'clients', 'invitations', 'admin_audit_events')
      and not relation.relrowsecurity
  ),
  'every activation table has RLS enabled'
);
select extensions.ok(
  not exists (
    select 1 from information_schema.role_table_grants
    where grantee = 'authenticated' and table_schema = 'public'
      and table_name in ('platform_memberships', 'clients', 'invitations', 'admin_audit_events')
  ),
  'authenticated has no activation-table grants'
);
select extensions.ok(
  not exists (
    select 1 from information_schema.role_table_grants
    where grantee = 'anon' and table_schema = 'public'
      and table_name in ('platform_memberships', 'clients', 'invitations', 'admin_audit_events')
  ),
  'anonymous has no activation-table grants'
);
select extensions.ok(
  not exists (
    select 1 from information_schema.role_table_grants
    where grantee = 'service_role' and table_schema = 'public'
      and table_name in ('platform_memberships', 'clients', 'invitations', 'admin_audit_events')
  ),
  'service role has no implicit activation-table grants'
);
select extensions.ok(exists (select 1 from pg_trigger where tgname = 'admin_audit_events_append_only' and not tgisinternal), 'admin audit append-only trigger exists');
select extensions.ok(exists (select 1 from pg_trigger where tgname = 'organization_memberships_last_owner' and not tgisinternal), 'organization last-owner trigger exists');
select extensions.ok(exists (select 1 from pg_trigger where tgname = 'project_memberships_last_owner' and not tgisinternal), 'project last-owner trigger exists');
select extensions.ok(exists (select 1 from pg_trigger where tgname = 'platform_memberships_last_owner' and not tgisinternal), 'platform last-owner trigger exists');
select extensions.ok(exists (select 1 from pg_trigger where tgname = 'geoai_provision_auth_profile' and not tgisinternal), 'Auth profile provisioning trigger exists');
select extensions.has_function('geoai_private', 'current_permanent_auth_user_id', array[]::text[], 'permanent Auth identity helper exists');
select extensions.has_function('geoai_private', 'bootstrap_first_platform_owner_v2', array['uuid', 'text', 'text', 'uuid'], 'owner-only durably audited platform bootstrap exists');
select extensions.has_function('api', 'create_organization', array['text', 'text', 'uuid'], 'organization creation RPC exists');
select extensions.has_function('api', 'create_client', array['uuid', 'text', 'text', 'text', 'uuid'], 'client creation RPC exists');
select extensions.has_function('api', 'create_project', array['uuid', 'uuid', 'text', 'text', 'text', 'uuid'], 'project creation RPC exists');
select extensions.has_function('api', 'create_invitation', array['uuid', 'uuid', 'text', 'text', 'text', 'text', 'timestamp with time zone', 'uuid'], 'invitation creation RPC exists');
select extensions.has_function('api', 'accept_invitation', array['text', 'uuid'], 'invitation acceptance RPC exists');
select extensions.has_function('api', 'revoke_invitation', array['uuid', 'bigint', 'uuid'], 'invitation revocation RPC exists');
select extensions.has_function('api', 'set_organization_member', array['uuid', 'uuid', 'text', 'text', 'bigint', 'uuid'], 'organization-member mutation RPC exists');
select extensions.has_function('api', 'set_project_member', array['uuid', 'uuid', 'text', 'text', 'bigint', 'uuid'], 'project-member mutation RPC exists');
select extensions.has_function('api', 'organization_admin_snapshot', array['uuid', 'integer', 'timestamp with time zone', 'uuid'], 'bounded admin snapshot RPC exists');
select extensions.ok(not has_function_privilege('anon', 'api.create_organization(text,text,uuid)', 'EXECUTE'), 'anonymous cannot create organizations');
select extensions.ok(not has_function_privilege('service_role', 'api.create_organization(text,text,uuid)', 'EXECUTE'), 'service role has no implicit organization creation');
select extensions.ok(has_function_privilege('authenticated', 'api.create_organization(text,text,uuid)', 'EXECUTE'), 'authenticated can reach the guarded organization RPC');
select extensions.ok(
  not exists (
    select 1 from pg_proc procedure join pg_namespace namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'api'
      and procedure.proname in ('create_organization', 'create_client', 'create_project', 'create_invitation', 'accept_invitation', 'revoke_invitation', 'set_organization_member', 'set_project_member', 'organization_admin_snapshot')
      and procedure.prosecdef
  ),
  'all exposed activation wrappers are security invoker'
);
select extensions.ok(
  exists (
    select 1 from pg_proc procedure join pg_namespace namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'geoai_private'
      and procedure.proname = 'admin_create_organization' and procedure.prosecdef
  ),
  'privileged organization implementation remains private and security definer'
);
select extensions.ok(
  not exists (
    select 1 from pg_proc procedure join pg_namespace namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'geoai_private'
      and procedure.proname like 'admin_%'
      and not (procedure.proconfig @> array['search_path=""']::text[])
  ),
  'private administration functions pin an empty search path'
);
select extensions.ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.invitations'::regclass
      and conname = 'invitations_token_hash_check'
  ),
  'invitation hashes are constrained to canonical SHA-256 text'
);
select extensions.ok(
  exists (
    select 1 from pg_indexes
    where schemaname = 'public' and indexname = 'idx_admin_audit_scope_page'
      and indexdef like '%created_at DESC%id DESC%'
  ),
  'admin audit keyset pagination index exists'
);

create temporary table activation_ids (key text primary key, id uuid not null) on commit drop;
grant select, insert, update, delete on table pg_temp.activation_ids to authenticated;

-- Real Auth-backed fixtures exercise the provisioning trigger.
insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  banned_until, deleted_at, is_anonymous
) values
  ('92000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'platform@test.invalid', '', now(), '{}'::jsonb, '{"full_name":"Platform Owner"}'::jsonb, now(), now(), null, null, false),
  ('92000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'invitee@test.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now(), null, null, false),
  ('92000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'outsider@test.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now(), null, null, false),
  ('92000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'unconfirmed@test.invalid', '', null, '{}'::jsonb, '{}'::jsonb, now(), now(), null, null, false),
  ('92000000-0000-0000-0000-000000000005', 'authenticated', 'authenticated', 'phone-only@test.invalid', '', null, '{}'::jsonb, '{}'::jsonb, now(), now(), null, null, false),
  ('92000000-0000-0000-0000-000000000006', 'authenticated', 'authenticated', 'anonymous@test.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now(), null, null, true);

-- Provisioning and first-owner bootstrap (36-44).
select extensions.ok((select status = 'active' from public.profiles where auth_user_id = '92000000-0000-0000-0000-000000000001'), 'email-confirmed Auth user receives an active profile');
select extensions.is((select full_name from public.profiles where auth_user_id = '92000000-0000-0000-0000-000000000001'), 'Platform Owner', 'display metadata is copied only as non-authoritative profile text');
select extensions.is((select status from public.profiles where auth_user_id = '92000000-0000-0000-0000-000000000004'), 'inactive', 'unconfirmed Auth user receives an inactive profile');
select extensions.is((select status from public.profiles where auth_user_id = '92000000-0000-0000-0000-000000000005'), 'inactive', 'email-unconfirmed account remains inactive');
select extensions.is((select count(*)::integer from public.profiles where auth_user_id = '92000000-0000-0000-0000-000000000006'), 0, 'anonymous Auth identity receives no permanent profile');
select extensions.is(
  (geoai_private.bootstrap_first_platform_owner_v2(
    '92000000-0000-0000-0000-000000000001',
    'CHG-ACTIVATION-PERSONA',
    'pgtap:activation',
    '92000000-0000-0000-0000-000000000101'
  ) ->> 'profileId')::uuid,
  (select id from public.profiles where auth_user_id = '92000000-0000-0000-0000-000000000001'),
  'owner-only bootstrap returns the confirmed permanent profile'
);
select extensions.is((select role from public.platform_memberships), 'platform_owner', 'first platform role is platform_owner');
select extensions.is((select count(*)::integer from public.admin_audit_events where action = 'platform_owner_bootstrapped'), 1, 'platform bootstrap writes one audit event');
select extensions.throws_ok(
  $$select geoai_private.bootstrap_first_platform_owner_v2('92000000-0000-0000-0000-000000000002', 'CHG-ACTIVATION-SECOND', 'pgtap:activation', '92000000-0000-0000-0000-000000000102')$$,
  '23505', 'platform owner bootstrap has already been consumed',
  'platform owner bootstrap is one-time'
);
insert into pg_temp.activation_ids
select 'platform_profile', id from public.profiles where auth_user_id = '92000000-0000-0000-0000-000000000001'
union all
select 'invitee_profile', id from public.profiles where auth_user_id = '92000000-0000-0000-0000-000000000002'
union all
select 'outsider_profile', id from public.profiles where auth_user_id = '92000000-0000-0000-0000-000000000003';

set local role authenticated;
select set_config('request.jwt.claim.sub', '92000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"92000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}', true);

-- Verified identity, tenant/client/project creation (45-54).
select extensions.throws_ok(
  $$select api.create_organization('Activation Tenant', 'activation-tenant', null)$$,
  '42501', 'a permanent verified identity is required', 'organization creation fails closed when permanent-user evidence is absent'
);
select set_config('request.jwt.claims', '{"sub":"92000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1","is_anonymous":false}', true);
insert into pg_temp.activation_ids
select 'organization', (api.create_organization('Activation Tenant', 'activation-tenant', null) ->> 'id')::uuid;
select extensions.ok((select id is not null from pg_temp.activation_ids where key = 'organization'), 'verified email or phone platform owner creates an organization without MFA');
select extensions.is((select organization_role from api.current_organization_memberships() where organization_id = (select id from pg_temp.activation_ids where key = 'organization')), 'owner', 'organization creator becomes its owner');
select extensions.ok(
  exists (
    select 1
    from jsonb_array_elements(api.organization_admin_snapshot((select id from pg_temp.activation_ids where key = 'organization'), 25, null, null) -> 'audit') event
    where event ->> 'action' = 'organization_created'
  ),
  'organization creation is audited'
);
insert into pg_temp.activation_ids
select 'client', (api.create_client((select id from pg_temp.activation_ids where key = 'organization'), 'activation-client', 'Activation Client', null, null) ->> 'id')::uuid;
select extensions.ok((select id is not null from pg_temp.activation_ids where key = 'client'), 'organization administrator creates a tenant client');
insert into pg_temp.activation_ids
select 'project', (api.create_project((select id from pg_temp.activation_ids where key = 'organization'), (select id from pg_temp.activation_ids where key = 'client'), 'activation-project', 'Activation Project', null, null) ->> 'id')::uuid;
select extensions.ok((select id is not null from pg_temp.activation_ids where key = 'project'), 'organization administrator creates a project');
select extensions.is((api.organization_admin_snapshot((select id from pg_temp.activation_ids where key = 'organization'), 25, null, null) #>> '{projects,0,client_id}')::uuid, (select id from pg_temp.activation_ids where key = 'client'), 'project client stays in the same tenant');
select extensions.is((select project_role from api.current_project_access('activation-project')), 'owner', 'project creator becomes project owner');
select extensions.ok(
  (api.organization_admin_snapshot((select id from pg_temp.activation_ids where key = 'organization'), 25, null, null) #>> '{counts,clients}')::integer = 1
  and (api.organization_admin_snapshot((select id from pg_temp.activation_ids where key = 'organization'), 25, null, null) #>> '{counts,projects}')::integer = 1,
  'admin snapshot returns exact client and project counts'
);
select extensions.ok(
  jsonb_array_length(api.organization_admin_snapshot((select id from pg_temp.activation_ids where key = 'organization'), 1000, null, null) -> 'clients') <= 100,
  'admin snapshot clamps page size to one hundred'
);

-- Invitation lifecycle and membership boundaries (55-65).
select set_config('request.jwt.claims', '{"sub":"92000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1","is_anonymous":true}', true);
select extensions.throws_ok(
  $$select api.create_invitation(
    (select id from pg_temp.activation_ids where key = 'organization'),
    (select id from pg_temp.activation_ids where key = 'project'),
    'invitee@test.invalid', 'member', 'analyst', repeat('a',64), now() + interval '1 day', null
  )$$,
  '42501', 'a permanent verified identity is required', 'anonymous identity cannot create an invitation'
);
select set_config('request.jwt.claims', '{"sub":"92000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1","is_anonymous":false}', true);
select extensions.throws_ok(
  $$select api.create_invitation(
    (select id from pg_temp.activation_ids where key = 'organization'), null,
    'invitee@test.invalid', 'member', null, repeat('b',64), now() + interval '31 days', null
  )$$,
  '22023', 'invitation expiry must be within 30 days', 'invitation expiry is bounded'
);
insert into pg_temp.activation_ids
select 'invitation', (api.create_invitation(
  (select id from pg_temp.activation_ids where key = 'organization'),
  (select id from pg_temp.activation_ids where key = 'project'),
  'invitee@test.invalid', 'member', 'analyst', repeat('c',64), now() + interval '1 day', null
) ->> 'id')::uuid;
select extensions.ok((select id is not null from pg_temp.activation_ids where key = 'invitation'), 'administrator creates a bounded member invitation');
select extensions.ok(
  not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'invitations' and column_name = 'token'),
  'raw invitation tokens are never stored'
);
select set_config('request.jwt.claim.sub', '92000000-0000-0000-0000-000000000003', true);
select set_config('request.jwt.claims', '{"sub":"92000000-0000-0000-0000-000000000003","role":"authenticated","aal":"aal1","is_anonymous":false}', true);
select extensions.throws_ok(
  $$select api.accept_invitation(repeat('c',64), null)$$,
  '42501', 'invitation email does not match authenticated user',
  'wrong email cannot consume an invitation'
);
select set_config('request.jwt.claim.sub', '92000000-0000-0000-0000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"92000000-0000-0000-0000-000000000002","role":"authenticated","aal":"aal1","is_anonymous":false}', true);
select extensions.is(api.accept_invitation(repeat('c',64), null) ->> 'status', 'accepted', 'matching email consumes a member invitation at AAL1');
select extensions.is((select email from api.current_profile()), 'invitee@test.invalid', 'accepted invitation remains bound to the authenticated account');
select extensions.is((select organization_role from api.current_organization_memberships() where organization_id = (select id from pg_temp.activation_ids where key = 'organization')), 'member', 'acceptance creates organization membership');
select extensions.is((select project_role from api.current_project_access('activation-project')), 'analyst', 'acceptance creates project membership');
select extensions.throws_ok(
  $$select api.accept_invitation(repeat('c',64), null)$$,
  '23514', 'invitation is not pending', 'accepted invitation cannot be replayed'
);
select extensions.throws_ok(
  $$select api.organization_admin_snapshot((select id from pg_temp.activation_ids where key = 'organization'), 25, null, null)$$,
  '42501', 'organization administration role is required', 'ordinary member cannot read the admin snapshot'
);

-- Role escalation, last-owner, concurrency and append-only audit (66-73).
select extensions.throws_ok(
  $$select api.set_organization_member(
    (select id from pg_temp.activation_ids where key = 'organization'),
    (select id from pg_temp.activation_ids where key = 'outsider_profile'),
    'member', 'active', null, null
  )$$,
  '42501', 'organization administrator required', 'ordinary member cannot mutate organization membership'
);
select set_config('request.jwt.claim.sub', '92000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"92000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1","is_anonymous":false}', true);
insert into pg_temp.activation_ids
select 'outsider_org_membership', (api.set_organization_member(
  (select id from pg_temp.activation_ids where key = 'organization'),
  (select id from pg_temp.activation_ids where key = 'outsider_profile'),
  'member', 'active', null, null
) ->> 'id')::uuid;
select extensions.ok((select id is not null from pg_temp.activation_ids where key = 'outsider_org_membership'), 'platform owner adds a confirmed organization member');
select extensions.ok(
  (api.set_project_member(
    (select id from pg_temp.activation_ids where key = 'project'),
    (select id from pg_temp.activation_ids where key = 'invitee_profile'),
    'admin', 'active', 1, null
  ) ->> 'id')::uuid is not null,
  'project owner promotes an existing member to project admin'
);
select set_config('request.jwt.claim.sub', '92000000-0000-0000-0000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"92000000-0000-0000-0000-000000000002","role":"authenticated","aal":"aal1","is_anonymous":false}', true);
select extensions.throws_ok(
  $$select api.set_project_member(
    (select id from pg_temp.activation_ids where key = 'project'),
    (select id from pg_temp.activation_ids where key = 'outsider_profile'),
    'owner', 'active', null, null
  )$$,
  '42501', 'project admin cannot grant elevated authority', 'project admin cannot self-expand authority'
);
select set_config('request.jwt.claim.sub', '92000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"92000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1","is_anonymous":false}', true);
select extensions.throws_ok(
  $$select api.set_organization_member(
    (select id from pg_temp.activation_ids where key = 'organization'),
    (select id from pg_temp.activation_ids where key = 'platform_profile'),
    'member', 'active', 1, null
  )$$,
  '23514', 'last active organization owner cannot be removed', 'database trigger protects the last organization owner'
);
select extensions.throws_ok(
  $$select api.set_project_member(
    (select id from pg_temp.activation_ids where key = 'project'),
    (select id from pg_temp.activation_ids where key = 'platform_profile'),
    'viewer', 'active', 1, null
  )$$,
  '23514', 'last active project owner cannot be removed', 'database trigger protects the last project owner'
);
select extensions.throws_ok(
  $$select api.set_organization_member(
    (select id from pg_temp.activation_ids where key = 'organization'),
    (select id from pg_temp.activation_ids where key = 'outsider_profile'),
    'member', 'active', 999, null
  )$$,
  '40001', 'stale organization membership version', 'optimistic concurrency rejects a stale organization mutation'
);
reset role;
select extensions.throws_ok(
  $$update public.admin_audit_events set details = '{"tampered":true}'::jsonb where action = 'organization_created'$$,
  '55000', 'admin audit events are append-only', 'admin audit rows cannot be updated'
);

select * from extensions.finish();
rollback;
