-- DB-01 local/ephemeral persona suite.
-- Run only after a clean `supabase db reset`; the transaction rolls back all
-- fixtures. This is not a service-role REST test and must not target Production.

begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(69);

select extensions.has_table(
  'public',
  'organization_memberships',
  'organization membership table exists'
);
select extensions.has_function(
  'geoai_private',
  'has_project_role',
  array['uuid', 'text[]'],
  'project authorization helper is private'
);
select extensions.ok(
  to_regprocedure('public.geoai_has_project_access(uuid,text)') is null,
  'legacy exposed project helper is absent'
);
select extensions.ok(
  not has_table_privilege('anon', 'public.aois', 'SELECT'),
  'anonymous caller has no AOI read grant'
);
select extensions.ok(
  not has_table_privilege('authenticated', 'public.aois', 'TRUNCATE'),
  'authenticated caller has no TRUNCATE grant'
);
select extensions.ok(
  not has_table_privilege('authenticated', 'public.aois', 'REFERENCES'),
  'authenticated caller has no REFERENCES grant'
);
select extensions.ok(
  not has_table_privilege('authenticated', 'public.aois', 'TRIGGER'),
  'authenticated caller has no TRIGGER grant'
);
select extensions.ok(
  not has_table_privilege('authenticated', 'public.aois', 'SELECT'),
  'authenticated caller has no direct public AOI read grant'
);
select extensions.ok(
  not has_table_privilege('authenticated', 'public.profiles', 'SELECT'),
  'authenticated caller has no direct public profile read grant'
);
select extensions.ok(
  not has_table_privilege('anon', 'public.geoai_healthcheck', 'SELECT'),
  'anonymous caller has no direct public healthcheck grant'
);
select extensions.ok(
  has_function_privilege('authenticated', 'api.current_profile()', 'EXECUTE'),
  'authenticated caller can execute the current-profile allowlist RPC'
);
select extensions.ok(
  has_function_privilege('anon', 'api.healthcheck()', 'EXECUTE'),
  'anonymous caller can execute only the health allowlist RPC'
);
select extensions.ok(
  not has_function_privilege('anon', 'api.current_profile()', 'EXECUTE'),
  'anonymous caller cannot execute the current-profile RPC'
);
select extensions.ok(
  not has_function_privilege('anon', 'api.current_organization_memberships()', 'EXECUTE'),
  'anonymous caller cannot execute the organization-memberships RPC'
);
select extensions.ok(
  not has_function_privilege('anon', 'api.current_project_access(text)', 'EXECUTE'),
  'anonymous caller cannot execute the project-access RPC'
);
select extensions.ok(
  not has_schema_privilege('anon', 'geoai_private', 'USAGE'),
  'anonymous caller cannot use the private authorization schema'
);
select extensions.ok(
  has_schema_privilege('authenticated', 'api', 'USAGE'),
  'authenticated caller can use the reviewed api schema'
);
select extensions.has_table('public', 'source_catalog', 'source catalog exists');
select extensions.has_table('public', 'source_releases', 'immutable source releases exist');
select extensions.has_table('public', 'source_artifacts', 'immutable source artifacts exist');
select extensions.has_table('public', 'source_release_status_events', 'append-only source status events exist');
select extensions.has_table('public', 'source_ingestion_receipts', 'idempotent ingestion receipts exist');
select extensions.has_function(
  'api',
  'current_source_releases',
  array['text', 'integer', 'timestamp with time zone', 'uuid'],
  'bounded caller-scoped source release RPC exists'
);
select extensions.ok(
  not has_table_privilege('authenticated', 'public.source_releases', 'SELECT'),
  'authenticated caller has no direct source-release read grant'
);
select extensions.ok(
  not has_function_privilege('anon', 'api.current_source_releases(text,integer,timestamptz,uuid)', 'EXECUTE'),
  'anonymous caller cannot execute the source-release RPC'
);
select extensions.ok(
  has_function_privilege('authenticated', 'api.current_source_releases(text,integer,timestamptz,uuid)', 'EXECUTE'),
  'authenticated caller can execute the reviewed source-release RPC'
);
select extensions.ok(
  not exists (
    select 1
    from pg_class relation
    join pg_namespace namespace on namespace.oid = relation.relnamespace
    cross join (values ('anon'), ('authenticated')) as caller(role_name)
    cross join (values ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE'), ('REFERENCES'), ('TRIGGER')) as operation(privilege_name)
    where namespace.nspname = 'public'
      and relation.relkind in ('r', 'p')
      and relation.relname = any(array[
        'organizations', 'profiles', 'organization_memberships', 'projects',
        'project_memberships', 'aois', 'analysis_runs', 'reports',
        'comparison_sets', 'uploaded_datasets', 'data_room_assets',
        'validation_checklist_items', 'validation_evidence', 'evidence_reviews',
        'pilot_workflows', 'pilot_client_inputs', 'pilot_deliverables',
        'ai_decision_scores', 'source_registry_snapshots',
        'external_data_snapshots', 'audit_events', 'source_catalog',
        'source_releases', 'source_artifacts', 'source_release_status_events',
        'source_ingestion_receipts'
      ]::text[])
      and has_table_privilege(caller.role_name, relation.oid, operation.privilege_name)
  ),
  'anon and authenticated have no direct privileges on any domain base table'
);

insert into auth.users (
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  banned_until,
  deleted_at,
  is_anonymous
)
values
  ('81000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'owner@test.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now(), null, null, false),
  ('81000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'analyst@test.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now(), null, null, false),
  ('81000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'viewer@test.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now(), null, null, false),
  ('81000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'client@test.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now(), null, null, false),
  ('81000000-0000-0000-0000-000000000005', 'authenticated', 'authenticated', 'banned@test.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now(), now() + interval '1 day', null, false),
  ('81000000-0000-0000-0000-000000000006', 'authenticated', 'authenticated', 'deleted@test.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now(), null, now(), false),
  ('81000000-0000-0000-0000-000000000007', 'authenticated', 'authenticated', 'anonymous@test.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now(), null, null, true),
  ('81000000-0000-0000-0000-000000000008', 'authenticated', 'authenticated', 'unconfirmed@test.invalid', '', null, '{}'::jsonb, '{}'::jsonb, now(), now(), null, null, false),
  ('81000000-0000-0000-0000-000000000009', 'authenticated', 'authenticated', 'no-profile@test.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now(), null, null, false),
  ('81000000-0000-0000-0000-000000000010', 'authenticated', 'authenticated', 'inactive-profile@test.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now(), null, null, false),
  ('81000000-0000-0000-0000-000000000011', 'authenticated', 'authenticated', 'inactive-org@test.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now(), null, null, false),
  ('81000000-0000-0000-0000-000000000012', 'authenticated', 'authenticated', 'inactive-project@test.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now(), null, null, false),
  ('81000000-0000-0000-0000-000000000013', 'authenticated', 'authenticated', 'inactive-org-entity@test.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now(), null, null, false),
  ('81000000-0000-0000-0000-000000000014', 'authenticated', 'authenticated', 'inactive-project-entity@test.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now(), null, null, false);

insert into public.organizations (id, name, slug, status)
values
  ('82000000-0000-0000-0000-000000000001', 'Persona Org A', 'persona-org-a', 'active'),
  ('82000000-0000-0000-0000-000000000002', 'Persona Org B', 'persona-org-b', 'active'),
  ('82000000-0000-0000-0000-000000000003', 'Inactive Persona Org', 'persona-org-inactive', 'inactive'),
  ('82000000-0000-0000-0000-000000000004', 'Active Persona Org C', 'persona-org-c', 'active');

insert into public.profiles (id, auth_user_id, email, full_name, status, identity_kind)
values
  ('83000000-0000-0000-0000-000000000001', '81000000-0000-0000-0000-000000000001', 'owner@test.invalid', 'Owner', 'active', 'user'),
  ('83000000-0000-0000-0000-000000000002', '81000000-0000-0000-0000-000000000002', 'analyst@test.invalid', 'Analyst', 'active', 'user'),
  ('83000000-0000-0000-0000-000000000003', '81000000-0000-0000-0000-000000000003', 'viewer@test.invalid', 'Viewer', 'active', 'user'),
  ('83000000-0000-0000-0000-000000000004', '81000000-0000-0000-0000-000000000004', 'client@test.invalid', 'Client', 'active', 'user'),
  ('83000000-0000-0000-0000-000000000005', '81000000-0000-0000-0000-000000000005', 'banned@test.invalid', 'Banned', 'active', 'user'),
  ('83000000-0000-0000-0000-000000000006', '81000000-0000-0000-0000-000000000006', 'deleted@test.invalid', 'Deleted', 'active', 'user'),
  ('83000000-0000-0000-0000-000000000007', '81000000-0000-0000-0000-000000000007', 'anonymous@test.invalid', 'Anonymous', 'active', 'user'),
  ('83000000-0000-0000-0000-000000000008', '81000000-0000-0000-0000-000000000008', 'unconfirmed@test.invalid', 'Unconfirmed', 'active', 'user'),
  ('83000000-0000-0000-0000-000000000010', '81000000-0000-0000-0000-000000000010', 'inactive-profile@test.invalid', 'Inactive Profile', 'inactive', 'user'),
  ('83000000-0000-0000-0000-000000000011', '81000000-0000-0000-0000-000000000011', 'inactive-org@test.invalid', 'Inactive Org Member', 'active', 'user'),
  ('83000000-0000-0000-0000-000000000012', '81000000-0000-0000-0000-000000000012', 'inactive-project@test.invalid', 'Inactive Project Member', 'active', 'user'),
  ('83000000-0000-0000-0000-000000000013', '81000000-0000-0000-0000-000000000013', 'inactive-org-entity@test.invalid', 'Inactive Organization Entity', 'active', 'user'),
  ('83000000-0000-0000-0000-000000000014', '81000000-0000-0000-0000-000000000014', 'inactive-project-entity@test.invalid', 'Inactive Project Entity', 'active', 'user');

insert into public.projects (id, organization_id, project_key, name, status, data_mode)
values
  ('84000000-0000-0000-0000-000000000001', '82000000-0000-0000-0000-000000000001', 'persona-project-a', 'Project A', 'active', 'pilot_private'),
  ('84000000-0000-0000-0000-000000000002', '82000000-0000-0000-0000-000000000002', 'persona-project-b', 'Project B', 'active', 'pilot_private'),
  ('84000000-0000-0000-0000-000000000003', '82000000-0000-0000-0000-000000000003', 'persona-project-inactive-org', 'Project In Inactive Org', 'active', 'pilot_private'),
  ('84000000-0000-0000-0000-000000000004', '82000000-0000-0000-0000-000000000004', 'persona-project-archived', 'Archived Project', 'archived', 'pilot_private');

insert into public.organization_memberships (organization_id, profile_id, role, status)
values
  ('82000000-0000-0000-0000-000000000001', '83000000-0000-0000-0000-000000000001', 'owner', 'active'),
  ('82000000-0000-0000-0000-000000000002', '83000000-0000-0000-0000-000000000001', 'owner', 'active'),
  ('82000000-0000-0000-0000-000000000001', '83000000-0000-0000-0000-000000000002', 'member', 'active'),
  ('82000000-0000-0000-0000-000000000001', '83000000-0000-0000-0000-000000000003', 'member', 'active'),
  ('82000000-0000-0000-0000-000000000001', '83000000-0000-0000-0000-000000000004', 'member', 'active'),
  ('82000000-0000-0000-0000-000000000001', '83000000-0000-0000-0000-000000000005', 'member', 'active'),
  ('82000000-0000-0000-0000-000000000001', '83000000-0000-0000-0000-000000000006', 'member', 'active'),
  ('82000000-0000-0000-0000-000000000001', '83000000-0000-0000-0000-000000000007', 'member', 'active'),
  ('82000000-0000-0000-0000-000000000001', '83000000-0000-0000-0000-000000000008', 'member', 'active'),
  ('82000000-0000-0000-0000-000000000001', '83000000-0000-0000-0000-000000000010', 'member', 'active'),
  ('82000000-0000-0000-0000-000000000001', '83000000-0000-0000-0000-000000000011', 'member', 'suspended'),
  ('82000000-0000-0000-0000-000000000001', '83000000-0000-0000-0000-000000000012', 'member', 'active'),
  ('82000000-0000-0000-0000-000000000002', '83000000-0000-0000-0000-000000000002', 'member', 'active'),
  ('82000000-0000-0000-0000-000000000003', '83000000-0000-0000-0000-000000000013', 'member', 'active'),
  ('82000000-0000-0000-0000-000000000004', '83000000-0000-0000-0000-000000000014', 'member', 'active');

insert into public.project_memberships (
  organization_id,
  project_id,
  project_key,
  user_id,
  role,
  status
)
values
  ('82000000-0000-0000-0000-000000000002', '84000000-0000-0000-0000-000000000002', 'persona-project-b', '83000000-0000-0000-0000-000000000001', 'owner', 'active'),
  ('82000000-0000-0000-0000-000000000001', '84000000-0000-0000-0000-000000000001', 'persona-project-a', '83000000-0000-0000-0000-000000000001', 'owner', 'active'),
  ('82000000-0000-0000-0000-000000000001', '84000000-0000-0000-0000-000000000001', 'persona-project-a', '83000000-0000-0000-0000-000000000002', 'analyst', 'active'),
  ('82000000-0000-0000-0000-000000000001', '84000000-0000-0000-0000-000000000001', 'persona-project-a', '83000000-0000-0000-0000-000000000003', 'viewer', 'active'),
  ('82000000-0000-0000-0000-000000000001', '84000000-0000-0000-0000-000000000001', 'persona-project-a', '83000000-0000-0000-0000-000000000004', 'client_viewer', 'active'),
  ('82000000-0000-0000-0000-000000000001', '84000000-0000-0000-0000-000000000001', 'persona-project-a', '83000000-0000-0000-0000-000000000005', 'analyst', 'active'),
  ('82000000-0000-0000-0000-000000000001', '84000000-0000-0000-0000-000000000001', 'persona-project-a', '83000000-0000-0000-0000-000000000006', 'analyst', 'active'),
  ('82000000-0000-0000-0000-000000000001', '84000000-0000-0000-0000-000000000001', 'persona-project-a', '83000000-0000-0000-0000-000000000007', 'viewer', 'active'),
  ('82000000-0000-0000-0000-000000000001', '84000000-0000-0000-0000-000000000001', 'persona-project-a', '83000000-0000-0000-0000-000000000008', 'viewer', 'active'),
  ('82000000-0000-0000-0000-000000000001', '84000000-0000-0000-0000-000000000001', 'persona-project-a', '83000000-0000-0000-0000-000000000010', 'viewer', 'active'),
  ('82000000-0000-0000-0000-000000000001', '84000000-0000-0000-0000-000000000001', 'persona-project-a', '83000000-0000-0000-0000-000000000011', 'viewer', 'active'),
  ('82000000-0000-0000-0000-000000000001', '84000000-0000-0000-0000-000000000001', 'persona-project-a', '83000000-0000-0000-0000-000000000012', 'viewer', 'disabled'),
  ('82000000-0000-0000-0000-000000000003', '84000000-0000-0000-0000-000000000003', 'persona-project-inactive-org', '83000000-0000-0000-0000-000000000013', 'viewer', 'active'),
  ('82000000-0000-0000-0000-000000000004', '84000000-0000-0000-0000-000000000004', 'persona-project-archived', '83000000-0000-0000-0000-000000000014', 'viewer', 'active');

insert into public.aois (
  id,
  organization_id,
  project_id,
  project_key,
  name,
  data_mode
)
values
  ('85000000-0000-0000-0000-000000000001', '82000000-0000-0000-0000-000000000001', '84000000-0000-0000-0000-000000000001', 'persona-project-a', 'Project A AOI', 'pilot_private'),
  ('85000000-0000-0000-0000-000000000002', '82000000-0000-0000-0000-000000000002', '84000000-0000-0000-0000-000000000002', 'persona-project-b', 'Project B AOI', 'pilot_private');

insert into public.source_catalog (
  source_id, display_name, source_category, access_mode, data_classification, catalog_status
)
values ('persona-source', 'Persona Source', 'test', 'fixture', 'public_open', 'approved')
on conflict (source_id) do nothing;

insert into public.source_catalog (
  source_id, display_name, source_category, access_mode, data_classification, catalog_status
)
values ('persona-source-unapproved', 'Unapproved Persona Source', 'test', 'fixture', 'restricted', 'registered_unverified')
on conflict (source_id) do nothing;

insert into public.source_releases (
  id, organization_id, project_id, project_key, source_id, release_version,
  schema_version, content_sha256, record_count, extracted_at, released_at,
  created_by, quality_summary, lineage_summary, caveat
)
values
  (
    '86000000-0000-0000-0000-000000000001',
    '82000000-0000-0000-0000-000000000001',
    '84000000-0000-0000-0000-000000000001',
    'persona-project-a',
    'persona-source',
    'v1',
    'v1',
    repeat('a', 64),
    10,
    timestamptz '2026-07-16 11:00:00+00',
    timestamptz '2026-07-16 12:00:00+00',
    '83000000-0000-0000-0000-000000000001',
    '{"tier":"fixture"}'::jsonb,
    '{"provider":"fixture"}'::jsonb,
    'Test fixture only.'
  ),
  (
    '86000000-0000-0000-0000-000000000002',
    '82000000-0000-0000-0000-000000000002',
    '84000000-0000-0000-0000-000000000002',
    'persona-project-b',
    'persona-source',
    'v1',
    'v1',
    repeat('b', 64),
    20,
    timestamptz '2026-07-16 10:00:00+00',
    timestamptz '2026-07-16 11:59:00+00',
    '83000000-0000-0000-0000-000000000001',
    '{"tier":"fixture"}'::jsonb,
    '{"provider":"fixture"}'::jsonb,
    'Test fixture only.'
  ),
  (
    '86000000-0000-0000-0000-000000000003',
    '82000000-0000-0000-0000-000000000001',
    '84000000-0000-0000-0000-000000000001',
    'persona-project-a',
    'persona-source-unapproved',
    'v1',
    'v1',
    repeat('c', 64),
    30,
    timestamptz '2026-07-16 09:00:00+00',
    timestamptz '2026-07-16 11:58:00+00',
    '83000000-0000-0000-0000-000000000001',
    '{"tier":"unapproved-fixture"}'::jsonb,
    '{"provider":"fixture"}'::jsonb,
    'Test fixture only.'
  );

insert into public.source_releases (
  organization_id, project_id, project_key, source_id, release_version,
  schema_version, content_sha256, record_count, extracted_at, released_at,
  created_by, quality_summary, lineage_summary, caveat
)
select
  '82000000-0000-0000-0000-000000000001'::uuid,
  '84000000-0000-0000-0000-000000000001'::uuid,
  'persona-project-a',
  'persona-source',
  'page-' || lpad(page_number::text, 3, '0'),
  'v1',
  lpad(to_hex(page_number), 64, '0'),
  page_number,
  timestamptz '2026-07-16 10:00:00+00' - page_number * interval '1 second',
  timestamptz '2026-07-16 12:00:00+00' - page_number * interval '1 second',
  '83000000-0000-0000-0000-000000000001'::uuid,
  '{"tier":"pagination-fixture"}'::jsonb,
  '{"provider":"fixture"}'::jsonb,
  'Pagination fixture only.'
from generate_series(2, 101) as pages(page_number);

insert into public.source_artifacts (
  id, source_release_id, organization_id, project_id, project_key,
  artifact_kind, storage_bucket, storage_object_path, content_sha256,
  byte_size, media_type, created_by
)
values (
  '88000000-0000-0000-0000-000000000001',
  '86000000-0000-0000-0000-000000000001',
  '82000000-0000-0000-0000-000000000001',
  '84000000-0000-0000-0000-000000000001',
  'persona-project-a',
  'manifest',
  'geoai-data-room-assets',
  'org/82000000-0000-0000-0000-000000000001/project/84000000-0000-0000-0000-000000000001/manifest.json',
  repeat('d', 64),
  10,
  'application/json',
  '83000000-0000-0000-0000-000000000001'
);

insert into public.source_release_status_events (
  id, source_release_id, organization_id, project_id, project_key,
  status, reason_code, actor_profile_id, created_at
)
values (
  '89000000-0000-0000-0000-000000000001',
  '86000000-0000-0000-0000-000000000001',
  '82000000-0000-0000-0000-000000000001',
  '84000000-0000-0000-0000-000000000001',
  'persona-project-a',
  'quarantined',
  'persona_quality_hold',
  '83000000-0000-0000-0000-000000000001',
  timestamptz '2026-07-16 12:01:00+00'
);

set local role anon;
select extensions.is(
  (select healthy from api.healthcheck()),
  true,
  'anonymous caller can invoke the bounded health RPC without base-table access'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '', true);
select extensions.is(
  (select count(*)::integer from api.current_profile()),
  0,
  'authenticated role without a user session resolves no profile'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-0000-0000-000000000002', true);

select extensions.is(
  (select count(*)::integer from api.current_profile()),
  1,
  'analyst resolves exactly one active profile through api'
);
select extensions.is(
  (select count(*)::integer from api.current_project_access('persona-project-a')),
  1,
  'analyst resolves own project membership through api'
);
select extensions.is(
  (select count(*)::integer from api.current_project_access('persona-project-b')),
  0,
  'analyst cannot resolve another tenant project'
);
select extensions.is(
  (select count(*)::integer from api.current_source_releases('persona-project-a')),
  25,
  'analyst receives the bounded default source-release page for own project'
);
select extensions.is(
  (select count(*)::integer from api.current_source_releases('persona-project-b')),
  0,
  'analyst cannot read source release metadata for another tenant project'
);
select extensions.results_eq(
  $$select * from api.current_source_releases('persona-project-a', 1)$$,
  $$values (
    '86000000-0000-0000-0000-000000000001'::uuid,
    'persona-source'::text,
    'Persona Source'::text,
    'test'::text,
    'v1'::text,
    'v1'::text,
    repeat('a', 64)::text,
    10::bigint,
    timestamptz '2026-07-16 11:00:00+00',
    timestamptz '2026-07-16 12:00:00+00',
    'quarantined'::text,
    'Test fixture only.'::text
  )$$,
  'source-release RPC returns the exact approved projection and latest effective status'
);
select extensions.is(
  (select count(*)::integer from api.current_source_releases('persona-project-a', 0)),
  1,
  'source-release page size is clamped to the lower bound of one'
);
select extensions.is(
  (select count(*)::integer from api.current_source_releases('persona-project-a', 101)),
  100,
  'source-release page size is clamped to the upper bound of one hundred'
);
select extensions.is(
  (select project_role from api.current_project_access('persona-project-a')),
  'analyst',
  'api returns the canonical analyst project role'
);
select extensions.is(
  (select count(*)::integer from api.current_project_access(null)),
  0,
  'project-access RPC rejects an unbounded null project target'
);
select extensions.ok(
  geoai_private.has_project_role(
    '84000000-0000-0000-0000-000000000001',
    array['owner', 'admin', 'analyst']::text[]
  ),
  'private helper recognizes the analyst persona'
);
select extensions.ok(
  geoai_private.has_storage_project_role(
    '82000000-0000-0000-0000-000000000001',
    '84000000-0000-0000-0000-000000000001',
    array['owner', 'admin', 'analyst']::text[]
  ),
  'private Storage helper authorizes the exact analyst tenant path without caller table grants'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-0000-0000-000000000001', true);

select extensions.is(
  (select project_role from api.current_project_access('persona-project-a')),
  'owner',
  'owner resolves the canonical owner role through api'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-0000-0000-000000000003', true);

select extensions.is(
  (select project_role from api.current_project_access('persona-project-a')),
  'viewer',
  'viewer resolves only the canonical viewer role through api'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-0000-0000-000000000004', true);

select extensions.is(
  (select project_role from api.current_project_access('persona-project-a')),
  'client_viewer',
  'client viewer resolves project identity without base-table resource access'
);
select extensions.is(
  (select count(*)::integer from api.current_source_releases('persona-project-a')),
  0,
  'client viewer cannot read raw source release metadata'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-0000-0000-000000000005', true);
select extensions.is(
  (select count(*)::integer from api.current_profile()),
  0,
  'banned Auth user cannot resolve an active profile'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-0000-0000-000000000006', true);
select extensions.is(
  (select count(*)::integer from api.current_project_access('persona-project-a')),
  0,
  'soft-deleted Auth user cannot resolve project access'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-0000-0000-000000000007', true);
select extensions.is(
  (select count(*)::integer from api.current_profile()),
  0,
  'Supabase anonymous identity cannot resolve a user profile'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-0000-0000-000000000008', true);
select extensions.is(
  (select count(*)::integer from api.current_project_access('persona-project-a')),
  0,
  'unconfirmed Auth user cannot resolve project access'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-0000-0000-000000000009', true);
select extensions.is(
  (select count(*)::integer from api.current_profile()),
  0,
  'Auth user without a profile resolves no identity'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-0000-0000-000000000010', true);
select extensions.is(
  (select count(*)::integer from api.current_profile()),
  0,
  'inactive profile cannot resolve identity'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-0000-0000-000000000011', true);
select extensions.is(
  (select count(*)::integer from api.current_project_access('persona-project-a')),
  0,
  'suspended organization membership cannot resolve project access'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-0000-0000-000000000012', true);
select extensions.is(
  (select count(*)::integer from api.current_project_access('persona-project-a')),
  0,
  'disabled project membership cannot resolve project access'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-0000-0000-000000000013', true);
select extensions.is(
  (select count(*)::integer from api.current_project_access('persona-project-inactive-org')),
  0,
  'active memberships cannot resolve a project in an inactive organization'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-0000-0000-000000000014', true);
select extensions.is(
  (select count(*)::integer from api.current_project_access('persona-project-archived')),
  0,
  'active memberships cannot resolve an archived project'
);

reset role;
select extensions.throws_ok(
  $$
    insert into public.project_memberships (
      organization_id, project_id, project_key, user_id, role, status
    ) values (
      '82000000-0000-0000-0000-000000000001',
      '84000000-0000-0000-0000-000000000002',
      'persona-project-b',
      '83000000-0000-0000-0000-000000000002',
      'viewer',
      'active'
    )
  $$,
  '23503',
  'insert or update on table "project_memberships" violates foreign key constraint "project_memberships_project_scope_fkey"',
  'cross-organization project membership is rejected by tenant constraints'
);

select extensions.throws_ok(
  $$
    insert into public.source_releases (
      organization_id, project_id, project_key, source_id, release_version,
      schema_version, content_sha256, record_count, extracted_at, created_by,
      quality_summary, lineage_summary, caveat
    ) values (
      '82000000-0000-0000-0000-000000000002',
      '84000000-0000-0000-0000-000000000002',
      'persona-project-b',
      'persona-source',
      'actor-scope-negative',
      'v1',
      repeat('e', 64),
      0,
      now(),
      '83000000-0000-0000-0000-000000000003',
      '{}'::jsonb,
      '{}'::jsonb,
      'Test fixture only.'
    )
  $$,
  '23503',
  'insert or update on table "source_releases" violates foreign key constraint "source_releases_creator_membership_fkey"',
  'source release creator must belong to the release organization'
);
select extensions.throws_ok(
  $$
    insert into public.source_releases (
      organization_id, project_id, project_key, source_id, release_version,
      schema_version, content_sha256, record_count, extracted_at, created_by,
      quality_summary, lineage_summary, caveat
    ) values (
      '82000000-0000-0000-0000-000000000002',
      '84000000-0000-0000-0000-000000000002',
      'persona-project-b',
      'persona-source',
      'actor-project-scope-negative',
      'v1',
      repeat('f', 64),
      0,
      now(),
      '83000000-0000-0000-0000-000000000002',
      '{}'::jsonb,
      '{}'::jsonb,
      'Test fixture only.'
    )
  $$,
  '23503',
  'insert or update on table "source_releases" violates foreign key constraint "source_releases_creator_project_membership_fkey"',
  'source release creator must belong to the exact release project'
);
select extensions.throws_ok(
  $$
    insert into public.source_artifacts (
      source_release_id, organization_id, project_id, project_key,
      artifact_kind, storage_bucket, storage_object_path, content_sha256,
      byte_size, media_type, created_by
    ) values (
      '86000000-0000-0000-0000-000000000001',
      '82000000-0000-0000-0000-000000000002',
      '84000000-0000-0000-0000-000000000002',
      'persona-project-b',
      'manifest',
      'geoai-data-room-assets',
      'org/82000000-0000-0000-0000-000000000002/project/84000000-0000-0000-0000-000000000002/manifest.json',
      repeat('f', 64),
      10,
      'application/json',
      '83000000-0000-0000-0000-000000000001'
    )
  $$,
  '23503',
  'insert or update on table "source_artifacts" violates foreign key constraint "source_artifacts_release_scope_fkey"',
  'source artifact cannot cross its immutable release tenant scope'
);

select extensions.throws_ok(
  $$update public.source_releases set record_count = 11 where id = '86000000-0000-0000-0000-000000000001'$$,
  '55000',
  'source custody rows are append-only',
  'source release updates are rejected by append-only custody'
);
select extensions.throws_ok(
  $$delete from public.source_releases where id = '86000000-0000-0000-0000-000000000001'$$,
  '55000',
  'source custody rows are append-only',
  'source release deletes are rejected by append-only custody'
);
select extensions.throws_ok(
  $$update public.source_artifacts set byte_size = 11 where id = '88000000-0000-0000-0000-000000000001'$$,
  '55000',
  'source custody rows are append-only',
  'source artifact updates are rejected by append-only custody'
);
select extensions.throws_ok(
  $$delete from public.source_artifacts where id = '88000000-0000-0000-0000-000000000001'$$,
  '55000',
  'source custody rows are append-only',
  'source artifact deletes are rejected by append-only custody'
);
select extensions.throws_ok(
  $$update public.source_release_status_events set reason_code = 'mutated' where id = '89000000-0000-0000-0000-000000000001'$$,
  '55000',
  'source custody rows are append-only',
  'source status-event updates are rejected by append-only custody'
);
select extensions.throws_ok(
  $$delete from public.source_release_status_events where id = '89000000-0000-0000-0000-000000000001'$$,
  '55000',
  'source custody rows are append-only',
  'source status-event deletes are rejected by append-only custody'
);

insert into public.source_ingestion_receipts (
  id, organization_id, project_id, project_key, source_id, idempotency_key,
  outcome, source_release_id, request_sha256, started_at, finished_at, created_by
)
values (
  '87000000-0000-0000-0000-000000000001',
  '82000000-0000-0000-0000-000000000001',
  '84000000-0000-0000-0000-000000000001',
  'persona-project-a',
  'persona-source',
  'persona-idempotency-key',
  'succeeded',
  '86000000-0000-0000-0000-000000000001',
  repeat('c', 64),
  now() - interval '1 minute',
  now(),
  '83000000-0000-0000-0000-000000000001'
);
select extensions.throws_ok(
  $$
    insert into public.source_ingestion_receipts (
      organization_id, project_id, project_key, source_id, idempotency_key,
      outcome, source_release_id, request_sha256, started_at, finished_at, created_by
    ) values (
      '82000000-0000-0000-0000-000000000001',
      '84000000-0000-0000-0000-000000000001',
      'persona-project-a',
      'persona-source',
      'persona-idempotency-key',
      'succeeded',
      '86000000-0000-0000-0000-000000000001',
      repeat('d', 64),
      now() - interval '1 minute',
      now(),
      '83000000-0000-0000-0000-000000000001'
    )
  $$,
  '23505',
  'duplicate key value violates unique constraint "source_ingestion_receipts_idempotency_key"',
  'duplicate ingestion idempotency key is rejected'
);
select extensions.throws_ok(
  $$update public.source_ingestion_receipts set error_code = 'mutated' where id = '87000000-0000-0000-0000-000000000001'$$,
  '55000',
  'source custody rows are append-only',
  'source ingestion-receipt updates are rejected by append-only custody'
);
select extensions.throws_ok(
  $$delete from public.source_ingestion_receipts where id = '87000000-0000-0000-0000-000000000001'$$,
  '55000',
  'source custody rows are append-only',
  'source ingestion-receipt deletes are rejected by append-only custody'
);

select extensions.ok(
  not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'source_registry_snapshots', 'external_data_snapshots', 'audit_events',
        'source_catalog', 'source_releases', 'source_artifacts',
        'source_release_status_events', 'source_ingestion_receipts'
      )
      and roles && array['public', 'authenticated']::name[]
  ),
  'source custody and audit have no public or authenticated-applicable policies'
);

select * from extensions.finish();

rollback;
