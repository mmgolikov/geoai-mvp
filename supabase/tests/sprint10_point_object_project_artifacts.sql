-- Local/ephemeral pgTAP persona coverage for cloud artifact CAS and isolation.
-- Run only on a clean local database after all migrations. The transaction
-- rolls back every fixture and must never target a hosted project.

begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(30);

select extensions.has_table('public', 'point_object_project_artifacts', 'artifact table exists');
select extensions.has_function(
  'api', 'put_point_object_project_artifact', array['text', 'jsonb', 'jsonb', 'bigint'],
  'bounded put facade exists'
);
select extensions.has_function(
  'api', 'list_point_object_project_artifacts', array['text', 'integer', 'timestamp with time zone', 'uuid'],
  'bounded list facade exists'
);
select extensions.ok(
  has_function_privilege('authenticated', 'api.put_point_object_project_artifact(text,jsonb,jsonb,bigint)', 'EXECUTE'),
  'authenticated caller can execute put facade'
);
select extensions.ok(
  has_function_privilege('authenticated', 'api.list_point_object_project_artifacts(text,integer,timestamptz,uuid)', 'EXECUTE'),
  'authenticated caller can execute list facade'
);
select extensions.ok(
  not has_function_privilege('anon', 'api.put_point_object_project_artifact(text,jsonb,jsonb,bigint)', 'EXECUTE'),
  'anonymous caller cannot execute put facade'
);
select extensions.ok(
  not has_table_privilege('authenticated', 'public.point_object_project_artifacts', 'SELECT'),
  'authenticated caller has no direct table read grant'
);
select extensions.ok(
  not has_table_privilege('authenticated', 'public.point_object_project_artifacts', 'INSERT'),
  'authenticated caller has no direct table write grant'
);
select extensions.ok(
  not has_function_privilege('authenticated', 'geoai_private.point_object_artifact_projections(jsonb)', 'EXECUTE'),
  'projection helper is not directly callable by authenticated clients'
);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  banned_until, deleted_at, is_anonymous
) values
  ('97000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'artifact-a@test.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now(), null, null, false),
  ('97000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'artifact-b@test.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now(), null, null, false),
  ('97000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'artifact-viewer@test.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now(), null, null, false);

delete from public.profiles
where auth_user_id between '97000000-0000-0000-0000-000000000001'::uuid
  and '97000000-0000-0000-0000-000000000003'::uuid;

insert into public.organizations (id, name, slug, status)
values ('97100000-0000-0000-0000-000000000001', 'Artifact Persona Org', 'artifact-persona-org', 'active');
insert into public.profiles (id, auth_user_id, email, full_name, status, identity_kind) values
  ('97200000-0000-0000-0000-000000000001', '97000000-0000-0000-0000-000000000001', 'artifact-a@test.invalid', 'Artifact A', 'active', 'user'),
  ('97200000-0000-0000-0000-000000000002', '97000000-0000-0000-0000-000000000002', 'artifact-b@test.invalid', 'Artifact B', 'active', 'user'),
  ('97200000-0000-0000-0000-000000000003', '97000000-0000-0000-0000-000000000003', 'artifact-viewer@test.invalid', 'Artifact Viewer', 'active', 'user');
insert into public.projects (id, organization_id, project_key, name, status, data_mode)
values ('97300000-0000-0000-0000-000000000001', '97100000-0000-0000-0000-000000000001', 'artifact-persona-project', 'Artifact Project', 'active', 'pilot_private');
insert into public.organization_memberships (organization_id, profile_id, role, status) values
  ('97100000-0000-0000-0000-000000000001', '97200000-0000-0000-0000-000000000001', 'member', 'active'),
  ('97100000-0000-0000-0000-000000000001', '97200000-0000-0000-0000-000000000002', 'member', 'active'),
  ('97100000-0000-0000-0000-000000000001', '97200000-0000-0000-0000-000000000003', 'member', 'active');
insert into public.project_memberships (organization_id, project_id, project_key, user_id, role, status) values
  ('97100000-0000-0000-0000-000000000001', '97300000-0000-0000-0000-000000000001', 'artifact-persona-project', '97200000-0000-0000-0000-000000000001', 'analyst', 'active'),
  ('97100000-0000-0000-0000-000000000001', '97300000-0000-0000-0000-000000000001', 'artifact-persona-project', '97200000-0000-0000-0000-000000000002', 'analyst', 'active'),
  ('97100000-0000-0000-0000-000000000001', '97300000-0000-0000-0000-000000000001', 'artifact-persona-project', '97200000-0000-0000-0000-000000000003', 'viewer', 'active');

create function pg_temp.local_project() returns jsonb language sql immutable as $$
  select '{"projectId":"project:local-1","name":"Local Project","createdAt":"2026-09-18T20:00:00.000Z"}'::jsonb
$$;
create function pg_temp.artifact(kind text, artifact_id text, idempotency_key text, revision integer, payload jsonb, client_hash text)
returns jsonb language sql immutable as $$
  select jsonb_build_object(
    'schemaVersion', 1, 'artifactId', artifact_id, 'idempotencyKey', idempotency_key,
    'payloadHash', client_hash, 'completedAt', '2026-09-18T20:00:01.000Z',
    'updatedAt', ('2026-09-18T20:00:' || lpad((revision + 1)::text, 2, '0') || '.000Z'),
    'viewRevision', revision, 'kind', kind, 'locale', 'en', 'marketKey', 'dubai',
    'label', initcap(kind), 'payload', payload
  )
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', '97000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"97000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1","is_anonymous":false}', true);

select extensions.is(
  (api.put_point_object_project_artifact('artifact-persona-project', pg_temp.local_project(),
    pg_temp.artifact('analyse', 'artifact-a', 'idem-a', 0, '{"selection":{"id":"one"},"analysis":{"result":"fixed"}}', repeat('a', 64)), null)->>'status'),
  'created', 'analyst creates an Analyse artifact'
);
select extensions.is(
  (api.put_point_object_project_artifact('artifact-persona-project', pg_temp.local_project(),
    pg_temp.artifact('analyse', 'artifact-a', 'idem-a', 0, '{"selection":{"id":"one"},"analysis":{"result":"fixed"}}', repeat('a', 64)), null)->>'cloudRevision'),
  '1', 'created artifact starts at cloud revision one'
);
select extensions.is(
  (api.put_point_object_project_artifact('artifact-persona-project', pg_temp.local_project(),
    pg_temp.artifact('analyse', 'artifact-a', 'idem-a', 0, '{"selection":{"id":"one"},"analysis":{"result":"fixed"}}', repeat('a', 64)), null)->>'status'),
  'replayed', 'byte-equivalent lost-response retry replays'
);
select extensions.is(
  jsonb_array_length(api.list_point_object_project_artifacts('artifact-persona-project', 4, null, null)),
  1, 'creator sees exactly the first artifact'
);
select extensions.is(
  (api.put_point_object_project_artifact('artifact-persona-project', pg_temp.local_project(),
    pg_temp.artifact('analyse', 'artifact-a', 'idem-a', 1, '{"selection":{"id":"one"},"analysis":{"result":"fixed"}}', repeat('b', 64)), 1)->>'status'),
  'conflict', 'Analyse has no mutable view surface and rejects revision-only updates'
);
select extensions.is(
  (api.put_point_object_project_artifact('artifact-persona-project', pg_temp.local_project(),
    pg_temp.artifact('analyse', 'artifact-other', 'idem-a', 0, '{"selection":{"id":"one"},"analysis":{"result":"fixed"}}', repeat('c', 64)), null)->>'status'),
  'conflict', 'split artifact and idempotency keys fail closed'
);
select extensions.is(
  (api.put_point_object_project_artifact('artifact-persona-project', pg_temp.local_project(),
    pg_temp.artifact('analyse', 'artifact-a', 'idem-a', 2, '{"selection":{"id":"one"},"analysis":{"result":"changed"}}', repeat('d', 64)), 2)->>'status'),
  'conflict', 'Analyse completed result is immutable even with forged client hash'
);

select extensions.is(
  (api.put_point_object_project_artifact('artifact-persona-project', pg_temp.local_project(),
    pg_temp.artifact('find', 'artifact-f', 'idem-f', 0,
      '{"session":{"result":{"fixed":true},"shortlist":[],"comparisonOpen":false,"comparisonView":"results","analysisTargetSourceFeatureId":null,"updatedAt":"2026-09-18T20:00:00Z"}}', repeat('e', 64)), null)->>'status'),
  'created', 'analyst creates a Find artifact'
);
select extensions.is(
  (api.put_point_object_project_artifact('artifact-persona-project', pg_temp.local_project(),
    pg_temp.artifact('find', 'artifact-f', 'idem-f', 1,
      '{"session":{"result":{"fixed":true},"shortlist":[{"id":"one"}],"comparisonOpen":true,"comparisonView":"mini","analysisTargetSourceFeatureId":"node/1","updatedAt":"2026-09-18T20:00:02Z"}}', repeat('f', 64)), 1)->>'status'),
  'updated', 'Find view-only state changes pass CAS'
);
select extensions.is(
  (api.put_point_object_project_artifact('artifact-persona-project', pg_temp.local_project(),
    pg_temp.artifact('find', 'artifact-f', 'idem-f', 2,
      '{"session":{"result":{"fixed":true},"shortlist":[],"comparisonOpen":false,"comparisonView":"results","analysisTargetSourceFeatureId":null,"updatedAt":"2026-09-18T20:00:03Z"}}', repeat('1', 64)), 1)->>'status'),
  'conflict', 'stale expected revision fails closed'
);
select extensions.is(
  (api.put_point_object_project_artifact('artifact-persona-project', pg_temp.local_project(),
    pg_temp.artifact('find', 'artifact-f', 'idem-f', 2,
      '{"session":{"result":{"fixed":false},"shortlist":[],"comparisonOpen":false,"comparisonView":"results","analysisTargetSourceFeatureId":null,"updatedAt":"2026-09-18T20:00:03Z"}}', repeat('7', 64)), 2)->>'status'),
  'conflict', 'Find completed result mutation is detected inside SQL'
);

select extensions.is(
  (api.put_point_object_project_artifact('artifact-persona-project', pg_temp.local_project(),
    pg_temp.artifact('create', 'artifact-c', 'idem-c', 0, '{"generated":{"fixed":true},"activeAlternativeId":"A"}', repeat('2', 64)), null)->>'status'),
  'created', 'analyst creates a Create artifact'
);
select extensions.is(
  (api.put_point_object_project_artifact('artifact-persona-project', pg_temp.local_project(),
    pg_temp.artifact('create', 'artifact-c', 'idem-c', 1, '{"generated":{"fixed":true},"activeAlternativeId":"B"}', repeat('3', 64)), 1)->>'status'),
  'updated', 'Create active alternative is the only mutable result field'
);
select extensions.is(
  (api.put_point_object_project_artifact('artifact-persona-project', pg_temp.local_project(),
    pg_temp.artifact('create', 'artifact-c', 'idem-c', 2, '{"generated":{"fixed":false},"activeAlternativeId":"A"}', repeat('4', 64)), 2)->>'status'),
  'conflict', 'Create generated result mutation is detected inside SQL'
);
select extensions.is(
  jsonb_array_length(api.list_point_object_project_artifacts('artifact-persona-project', 100, null, null)),
  3, 'list hard-clamps a caller-supplied oversized page limit'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '97000000-0000-0000-0000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"97000000-0000-0000-0000-000000000002","role":"authenticated","aal":"aal1","is_anonymous":false}', true);
select extensions.is(
  (api.put_point_object_project_artifact('artifact-persona-project', pg_temp.local_project(),
    pg_temp.artifact('analyse', 'artifact-a', 'idem-a', 0, '{"selection":{"id":"one"},"analysis":{"result":"fixed"}}', repeat('5', 64)), null)->>'status'),
  'created', 'second creator may reuse browser-local keys without collision'
);
select extensions.is(
  jsonb_array_length(api.list_point_object_project_artifacts('artifact-persona-project', 4, null, null)),
  1, 'second creator sees only the second creator row'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '97000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"97000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1","is_anonymous":false}', true);
select extensions.is(
  jsonb_array_length(api.list_point_object_project_artifacts('artifact-persona-project', 4, null, null)),
  3, 'first creator remains isolated from the second creator row'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '97000000-0000-0000-0000-000000000003', true);
select set_config('request.jwt.claims', '{"sub":"97000000-0000-0000-0000-000000000003","role":"authenticated","aal":"aal1","is_anonymous":false}', true);
select extensions.is(
  jsonb_array_length(api.list_point_object_project_artifacts('artifact-persona-project', 4, null, null)),
  0, 'viewer receives an empty creator-private page'
);
select extensions.throws_ok(
  $$select api.put_point_object_project_artifact(
    'artifact-persona-project', pg_temp.local_project(),
    pg_temp.artifact('analyse', 'viewer-artifact', 'viewer-idem', 0, '{"fixed":true}', repeat('6', 64)), null
  )$$,
  '42501',
  'project artifact write access denied',
  'viewer cannot create an artifact'
);

reset role;
update public.project_memberships
set status = 'disabled'
where user_id = '97200000-0000-0000-0000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub', '97000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"97000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1","is_anonymous":false}', true);
select extensions.throws_ok(
  $$select api.list_point_object_project_artifacts('artifact-persona-project', 4, null, null)$$,
  '42501',
  'project artifact read access denied',
  'disabled membership cannot read retained artifacts'
);

reset role;
select extensions.finish();
rollback;
