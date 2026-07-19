-- OWNER-ONLY Supabase/PostgREST configuration for an API-only Data API.
-- This is intentionally outside supabase/migrations: it changes a hosted
-- project role setting and must be executed once per environment by `postgres`.
-- Application tables stay in `public`; only reviewed RPCs in `api` are exposed.

begin;

do $operator$
declare
  existing_override text;
  expected regprocedure[] := array[
    to_regprocedure('api.healthcheck()'),
    to_regprocedure('api.current_profile()'),
    to_regprocedure('api.current_organization_memberships()'),
    to_regprocedure('api.current_project_access(text)'),
    to_regprocedure('api.current_source_releases(text,integer,timestamp with time zone,uuid)'),
    to_regprocedure('api.create_organization(text,text,uuid)'),
    to_regprocedure('api.create_client(uuid,text,text,text,uuid)'),
    to_regprocedure('api.create_project(uuid,uuid,text,text,text,uuid)'),
    to_regprocedure('api.create_invitation(uuid,uuid,text,text,text,text,timestamp with time zone,uuid)'),
    to_regprocedure('api.accept_invitation(text,uuid)'),
    to_regprocedure('api.revoke_invitation(uuid,bigint,uuid)'),
    to_regprocedure('api.set_organization_member(uuid,uuid,text,text,bigint,uuid)'),
    to_regprocedure('api.set_project_member(uuid,uuid,text,text,bigint,uuid)'),
    to_regprocedure('api.organization_admin_snapshot(uuid,integer,timestamp with time zone,uuid)')
  ];
begin
  if current_user <> 'postgres' then
    raise exception 'Data API schema isolation requires the postgres owner role';
  end if;

  if to_regnamespace('api') is null then
    raise exception 'api schema is missing; apply the identity foundation first';
  end if;

  select setting
  into existing_override
  from pg_roles role
  cross join lateral unnest(coalesce(role.rolconfig, array[]::text[])) setting
  where role.rolname = 'authenticator'
    and setting like 'pgrst.db_schemas=%';

  if existing_override is not null
     and existing_override <> 'pgrst.db_schemas=api' then
    raise exception 'unexpected existing PostgREST schema override: %', existing_override;
  end if;

  if array_position(expected, null) is not null then
    raise exception 'one or more allowlisted api functions are missing';
  end if;

  if exists (
    select 1
    from pg_proc procedure
    join pg_namespace namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'api'
      and not (procedure.oid::regprocedure = any(expected))
  ) or (
    select count(*)
    from pg_proc procedure
    join pg_namespace namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'api'
  ) <> cardinality(expected) then
    raise exception 'api routine inventory differs from the exact allowlist';
  end if;

  if exists (
    select 1
    from pg_class relation
    join pg_namespace namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'api'
      and relation.relkind in ('r', 'p', 'v', 'm', 'f', 'S')
  ) then
    raise exception 'api must remain RPC-only';
  end if;

  -- Keep future application objects opt-in. Managed Supabase/PostGIS objects
  -- have different owners and are isolated by removing `public` from the Data
  -- API rather than mutating extension-owned ACL/RLS state.
  alter default privileges for role postgres in schema public
    revoke all on tables from public, anon, authenticated, service_role;
  alter default privileges for role postgres in schema public
    revoke all on sequences from public, anon, authenticated, service_role;
  alter default privileges for role postgres in schema public
    revoke all on functions from public, anon, authenticated, service_role;
  alter default privileges for role postgres in schema api
    revoke all on tables from public, anon, authenticated, service_role;
  alter default privileges for role postgres in schema api
    revoke all on sequences from public, anon, authenticated, service_role;
  alter default privileges for role postgres in schema api
    revoke all on functions from public, anon, authenticated, service_role;

  revoke all on schema api from public, anon, authenticated, service_role;
  grant usage on schema api to anon, authenticated;

  revoke all privileges on all functions in schema api
    from public, anon, authenticated, service_role;
  revoke all privileges on all tables in schema api
    from public, anon, authenticated, service_role;
  revoke all privileges on all sequences in schema api
    from public, anon, authenticated, service_role;

  grant execute on function api.healthcheck() to anon, authenticated;
  grant execute on function api.current_profile() to authenticated;
  grant execute on function api.current_organization_memberships() to authenticated;
  grant execute on function api.current_project_access(text) to authenticated;
  grant execute on function api.current_source_releases(text, integer, timestamptz, uuid) to authenticated;
  grant execute on function api.create_organization(text, text, uuid) to authenticated;
  grant execute on function api.create_client(uuid, text, text, text, uuid) to authenticated;
  grant execute on function api.create_project(uuid, uuid, text, text, text, uuid) to authenticated;
  grant execute on function api.create_invitation(uuid, uuid, text, text, text, text, timestamptz, uuid) to authenticated;
  grant execute on function api.accept_invitation(text, uuid) to authenticated;
  grant execute on function api.revoke_invitation(uuid, bigint, uuid) to authenticated;
  grant execute on function api.set_organization_member(uuid, uuid, text, text, bigint, uuid) to authenticated;
  grant execute on function api.set_project_member(uuid, uuid, text, text, bigint, uuid) to authenticated;
  grant execute on function api.organization_admin_snapshot(uuid, integer, timestamptz, uuid) to authenticated;

  alter role authenticator set pgrst.db_schemas = 'api';
end
$operator$;

-- PostgREST reads the role-scoped setting after a configuration reload.
select pg_notify('pgrst', 'reload config');
select pg_notify('pgrst', 'reload schema');

commit;

-- Machine-readable verification receipt. Expected: {api}, no public entry.
select jsonb_build_object(
  'operator', 'data_api_api_only_owner_path',
  'verifiedAt', now(),
  'currentUser', current_user,
  'authenticatorDbSchemas', coalesce(
    (
      select string_to_array(substring(setting from '^pgrst[.]db_schemas=(.*)$'), ',')
      from pg_roles role
      cross join lateral unnest(coalesce(role.rolconfig, array[]::text[])) setting
      where role.rolname = 'authenticator'
        and setting like 'pgrst.db_schemas=%'
      limit 1
    ),
    array[]::text[]
  ),
  'apiFunctionCount', (
    select count(*)
    from pg_proc procedure
    join pg_namespace namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'api'
  )
) as receipt;

-- Rollback template. Use only in an owner-approved incident/change and then
-- notify PostgREST again. Resetting restores the project/dashboard default,
-- which may expose `public`; never use it as a routine rollback.
-- begin;
-- alter role authenticator reset pgrst.db_schemas;
-- select pg_notify('pgrst', 'reload config');
-- select pg_notify('pgrst', 'reload schema');
-- commit;
