-- Local isolated database only; fixture/data changes always roll back.
-- Standard pgTAP SQL: no psql metacommands or optional pre-fix execution path.
begin;
create extension if not exists pgtap with schema extensions;
select extensions.no_plan();

insert into auth.users (id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_anonymous)
select ('94000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
  'authenticated', 'authenticated', 'invitation-' || n || '@test.invalid', '',
  now(), '{}'::jsonb, '{}'::jsonb, now(), now(), false
from generate_series(1, 9) n;

create function pg_temp.pid(n integer) returns uuid language sql as $$
  select id from public.profiles
  where auth_user_id = ('94000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid
$$;
insert into public.organizations (id, name, slug) values
  ('94000000-0000-0000-0000-000000000101', 'Invitation test A', 'invitation-test-a'),
  ('94000000-0000-0000-0000-000000000102', 'Invitation test B', 'invitation-test-b');
insert into public.projects (id, organization_id, project_key, name) values
  ('94000000-0000-0000-0000-000000000201', '94000000-0000-0000-0000-000000000101', 'invitation-test-a', 'Invitation project A'),
  ('94000000-0000-0000-0000-000000000202', '94000000-0000-0000-0000-000000000102', 'invitation-test-b', 'Invitation project B');
insert into public.organization_memberships (organization_id, profile_id, role)
select '94000000-0000-0000-0000-000000000101'::uuid, pg_temp.pid(n),
  case when n in (1,9) then 'owner' when n = 2 then 'admin' else 'member' end
from generate_series(1,4) n union all
select '94000000-0000-0000-0000-000000000101', pg_temp.pid(9), 'owner' union all
select '94000000-0000-0000-0000-000000000102', pg_temp.pid(6), 'owner';
insert into public.project_memberships (organization_id, project_id, project_key, user_id, role)
select '94000000-0000-0000-0000-000000000101', '94000000-0000-0000-0000-000000000201',
  'invitation-test-a', pg_temp.pid(n), case when n = 2 then 'owner' else 'admin' end
from generate_series(2,3) n;
insert into public.platform_memberships (profile_id, role) values (pg_temp.pid(7), 'platform_admin');

-- Execute through the actual invoker API wrapper as an AAL1 authenticated user.
-- No impersonation helper is installed outside this rollback-only test session.
create function pg_temp.invoke(actor integer, command text) returns text language plpgsql as $$
declare code text;
begin
  perform set_config('request.jwt.claim.sub', '94000000-0000-0000-0000-' || lpad(actor::text,12,'0'), true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub',
    '94000000-0000-0000-0000-' || lpad(actor::text,12,'0'),
    'role','authenticated','aal','aal1','is_anonymous',false)::text, true);
  begin
    set local role authenticated;
    execute command;
    reset role;
    return '00000';
  exception when others then
    get stacked diagnostics code = returned_sqlstate;
    reset role;
    return code;
  end;
end $$;
create function pg_temp.issue_command(token text, org_role text, project_role text default null,
  recipient integer default 5, tenant integer default 1) returns text language sql as $$
  select format('select api.create_invitation(%L,%L,%L,%L,%L,%L,now()+interval ''1 day'')',
    '94000000-0000-0000-0000-00000000010' || tenant,
    case when project_role is not null then '94000000-0000-0000-0000-00000000020' || tenant end,
    'invitation-' || recipient || '@test.invalid', org_role, project_role, md5(token)||md5(token))
$$;
create function pg_temp.accept_command(token text) returns text language sql as $$
  select format('select api.accept_invitation(%L)', md5(token)||md5(token))
$$;
create function pg_temp.state() returns text language sql as $$
  select md5(string_agg(row_data, '' order by row_data)) from (
    select 'org:' || row_to_json(t)::text row_data from public.organization_memberships t
    union all select 'project:' || row_to_json(t)::text from public.project_memberships t
    union all select 'invite:' || row_to_json(t)::text from public.invitations t
    union all select 'audit:' || row_to_json(t)::text from public.admin_audit_events t
  ) rows
$$;
create function pg_temp.deny_unchanged(actor integer, command text) returns text language plpgsql as $$
declare old_state text := pg_temp.state(); code text;
begin
  code := pg_temp.invoke(actor,command);
  return code || ':' || case when old_state = pg_temp.state() then 'unchanged' else 'MUTATED' end;
end $$;

select extensions.ok(not has_function_privilege('anon','geoai_private.can_issue_invitation(uuid,uuid,uuid,text,text)','execute')
  and not has_function_privilege('authenticated','geoai_private.can_issue_invitation(uuid,uuid,uuid,text,text)','execute')
  and not has_function_privilege('service_role','geoai_private.can_issue_invitation(uuid,uuid,uuid,text,text)','execute'), 'issuer predicate is private to command implementations');
select extensions.is(pg_temp.deny_unchanged(2, pg_temp.issue_command('admin-'||r,r,null,2)), '42501:unchanged', 'org admin cannot self-grant '||r) from unnest(array['owner','admin']) r;
select extensions.is(pg_temp.deny_unchanged(a, pg_temp.issue_command('project-'||a||r,'member',r)), '42501:unchanged', 'admin '||a||' cannot grant project '||r)
from unnest(array[2,3]) a cross join unnest(array['owner','admin']) r;
select extensions.is(pg_temp.deny_unchanged(a, pg_temp.issue_command('no-role-'||a,'member')), '42501:unchanged', 'member/nonmember/foreign-owner '||a||' denied') from unnest(array[4,6,8]) a;
select extensions.is(pg_temp.deny_unchanged(1, pg_temp.issue_command('foreign','member',null,5,2)), '42501:unchanged', 'tenant A owner has no tenant B assignment authority');

-- Legacy malicious self-invitation is a persisted input, not recreated by the hardened RPC.
insert into public.invitations(organization_id,email,organization_role,token_hash,expires_at,created_by)
values('94000000-0000-0000-0000-000000000101','invitation-2@test.invalid','owner',md5('legacy-self')||md5('legacy-self'),now()+interval '1 day',pg_temp.pid(2));
select extensions.is(pg_temp.deny_unchanged(2,pg_temp.accept_command('legacy-self')), '42501:unchanged', 'legacy self-owner acceptance denied without membership/invitation/audit writes');

-- Owner may invite an elevated member, but demotion invalidates outstanding authority.
select extensions.is(pg_temp.invoke(1,pg_temp.issue_command('stale','owner')), '00000', 'owner can issue owner invitation at AAL1');
update public.organization_memberships set role='admin' where profile_id=pg_temp.pid(1);
select extensions.is(pg_temp.deny_unchanged(5,pg_temp.accept_command('stale')), '42501:unchanged', 'demoted issuer cannot convey old elevated authority');
update public.organization_memberships set role='owner' where profile_id=pg_temp.pid(1);
update auth.users set banned_until=now()+interval '1 day' where id='94000000-0000-0000-0000-000000000001';
select extensions.is(pg_temp.deny_unchanged(5,pg_temp.accept_command('stale')), '42501:unchanged', 'currently banned issuer cannot convey authority');
update auth.users set banned_until=null where id='94000000-0000-0000-0000-000000000001';
select extensions.is(pg_temp.deny_unchanged(8,pg_temp.accept_command('stale')), '42501:unchanged', 'wrong recipient denied');
select extensions.is(pg_temp.invoke(5,pg_temp.accept_command('stale')), '00000', 'restored legitimate owner invitation accepted by confirmed recipient');
select extensions.is((select role from public.organization_memberships where profile_id=pg_temp.pid(5)), 'owner', 'legitimate invitation creates owner membership');
select extensions.is(pg_temp.deny_unchanged(5,pg_temp.accept_command('stale')), '23514:unchanged', 'accepted token cannot be replayed');

-- Ordinary member and lower project role paths remain functional.
select extensions.is(pg_temp.invoke(2,pg_temp.issue_command('member','member',null,8)), '00000', 'org admin issues ordinary member invitation');
select extensions.is(pg_temp.invoke(8,pg_temp.accept_command('member')), '00000', 'no-role confirmed recipient accepts legitimate member invitation');
select extensions.is(pg_temp.invoke(3,pg_temp.issue_command('viewer','member','viewer',8)), '00000', 'project admin issues viewer invitation');
update public.project_memberships set status='disabled' where user_id=pg_temp.pid(3);
select extensions.is(pg_temp.deny_unchanged(8,pg_temp.accept_command('viewer')), '42501:unchanged', 'disabled project issuer cannot convey even lower project role');
update public.project_memberships set status='active' where user_id=pg_temp.pid(3);
select extensions.is(pg_temp.invoke(8,pg_temp.accept_command('viewer')), '00000', 'restored project admin invitation accepted');
select extensions.is((select role from public.project_memberships where user_id=pg_temp.pid(8)), 'viewer', 'lower project membership is correct');
select extensions.is(pg_temp.invoke(1,pg_temp.issue_command('project-owner','member','owner',4)), '00000', 'org owner may issue elevated project invitation');
select extensions.is(pg_temp.invoke(4,pg_temp.accept_command('project-owner')), '00000', 'legitimate project owner invitation accepted');
select extensions.is(pg_temp.invoke(2,pg_temp.issue_command('existing-org-owner','member',null,9)), '00000', 'ordinary invitation may be issued before recipient membership is checked');
select extensions.is(pg_temp.deny_unchanged(9,pg_temp.accept_command('existing-org-owner')), '42501:unchanged', 'admin invitation cannot overwrite existing organization owner');
select extensions.is(pg_temp.invoke(3,pg_temp.issue_command('existing-project-owner','member','viewer',4)), '00000', 'project invitation issued within lower-role ceiling');
select extensions.is(pg_temp.deny_unchanged(4,pg_temp.accept_command('existing-project-owner')), '42501:unchanged', 'project admin invitation cannot overwrite existing project owner');
select extensions.is(pg_temp.invoke(7,pg_temp.issue_command('platform','admin',null,6)), '00000', 'platform admin may issue elevated organization invitation');
select extensions.is(pg_temp.invoke(6,pg_temp.accept_command('platform')), '00000', 'legitimate platform invitation accepted');

select extensions.is(pg_temp.invoke(3,pg_temp.issue_command('recipient-disabled','member','viewer',8)), '00000', 'project admin issues within role ceiling');
update public.organization_memberships set status='disabled' where profile_id=pg_temp.pid(8);
select extensions.is(pg_temp.deny_unchanged(8,pg_temp.accept_command('recipient-disabled')), '42501:unchanged', 'project invitation cannot reactivate organization-disabled recipient');
update public.organization_memberships set status='suspended' where profile_id=pg_temp.pid(8);
select extensions.is(pg_temp.deny_unchanged(8,pg_temp.accept_command('recipient-disabled')), '42501:unchanged', 'project invitation cannot reactivate organization-suspended recipient');
select extensions.is(pg_temp.invoke(1,pg_temp.issue_command('owner-reactivation','member',null,8)), '00000', 'owner invitation issuance remains bounded');
select extensions.is(pg_temp.deny_unchanged(8,pg_temp.accept_command('owner-reactivation')), '42501:unchanged', 'owner must also use explicit membership reactivation, not invitation');
update public.organization_memberships set status='active' where profile_id=pg_temp.pid(8);
update public.project_memberships set status='disabled' where user_id=pg_temp.pid(8);
select extensions.is(pg_temp.deny_unchanged(8,pg_temp.accept_command('recipient-disabled')), '42501:unchanged', 'invitation cannot reactivate disabled project membership');
update public.project_memberships set status='active',role='analyst' where user_id=pg_temp.pid(8);
select extensions.is(pg_temp.invoke(8,pg_temp.accept_command('recipient-disabled')), '00000', 'active existing analyst may accept legitimate lower-role invitation');
select extensions.is((select role from public.project_memberships where user_id=pg_temp.pid(8)), 'analyst', 'existing stronger project role is preserved; downgrade requires membership command');
select extensions.is(pg_temp.invoke(1,pg_temp.issue_command('owner-preservation','member',null,5)), '00000', 'owner may issue ordinary invitation to existing owner');
select extensions.is(pg_temp.invoke(5,pg_temp.accept_command('owner-preservation')), '00000', 'existing owner can accept authorized invitation without downgrade');
select extensions.is((select role from public.organization_memberships where profile_id=pg_temp.pid(5)), 'owner', 'existing stronger organization role is preserved');

select extensions.ok(exists(select 1 from pg_trigger where tgname='organization_memberships_last_owner' and not tgisinternal)
  and exists(select 1 from pg_trigger where tgname='project_memberships_last_owner' and not tgisinternal), 'last-owner guards remain installed');
select extensions.is((select count(*)::integer from public.admin_audit_events where action='invitation_accepted' and organization_id='94000000-0000-0000-0000-000000000101'), 7, 'exactly seven successful acceptances produce audit events; denials produce none');
select * from extensions.finish();
rollback;
