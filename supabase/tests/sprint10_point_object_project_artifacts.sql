-- Local/ephemeral pgTAP persona coverage for cloud artifact CAS and isolation.
-- Run only on a clean local database after all migrations. The transaction
-- rolls back every fixture and must never target a hosted project.

begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(62);

select extensions.has_table('public', 'point_object_project_artifacts', 'artifact table exists');
select extensions.has_table('geoai_private', 'point_object_artifact_scope_config', 'private rollout scope table exists');
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
select extensions.ok(
  not has_table_privilege('authenticated', 'geoai_private.point_object_artifact_scope_config', 'SELECT')
  and not has_table_privilege('authenticated', 'geoai_private.point_object_artifact_scope_config', 'UPDATE'),
  'authenticated caller cannot read or edit rollout scope'
);
select extensions.ok(
  not has_table_privilege('service_role', 'geoai_private.point_object_artifact_scope_config', 'SELECT')
  and not has_table_privilege('service_role', 'geoai_private.point_object_artifact_scope_config', 'UPDATE'),
  'service role cannot read or edit rollout scope'
);
select extensions.is(
  (select enabled::text from geoai_private.point_object_artifact_scope_config where singleton),
  'false', 'rollout scope is disabled by default'
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

create function pg_temp.local_project(
  project_id text default 'project:local-1',
  project_name text default 'Local Project',
  created_at text default '2026-09-18T20:00:00.000Z'
) returns jsonb language sql immutable as $$
  select jsonb_build_object('projectId', project_id, 'name', project_name, 'createdAt', created_at)
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

create function pg_temp.analyse_artifact(artifact_id text, idempotency_key text, revision integer default 0)
returns jsonb language sql immutable as $$
  select pg_temp.artifact(
    'analyse', artifact_id, idempotency_key, revision,
    '{"selection":{"id":"one"},"analysis":{"result":"fixed"}}'::jsonb,
    repeat(substr(md5(artifact_id || idempotency_key), 1, 1), 64)
  )
$$;

create function pg_temp.padded_analyse_artifact(target_bytes integer, artifact_id text, idempotency_key text)
returns jsonb language plpgsql immutable as $$
declare
  result jsonb;
  padding_bytes integer;
begin
  result := pg_temp.analyse_artifact(artifact_id, idempotency_key, 0);
  result := jsonb_set(result, '{payload,analysis,padding}', '""'::jsonb, true);
  padding_bytes := target_bytes - octet_length(result::text);
  if padding_bytes < 0 then
    raise exception 'target is smaller than fixture envelope';
  end if;
  result := jsonb_set(result, '{payload,analysis,padding}', to_jsonb(repeat('x', padding_bytes)), false);
  if octet_length(result::text) <> target_bytes then
    raise exception 'fixture did not reach requested JSONB text size';
  end if;
  return result;
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', '97000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"97000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1","is_anonymous":false}', true);

select extensions.throws_ok(
  $$select api.list_point_object_project_artifacts('artifact-persona-project', 4, null, null)$$,
  '42501', 'point object artifact scope unavailable', 'disabled scope denies list before rollout'
);
select extensions.throws_ok(
  $$select api.put_point_object_project_artifact(
    'artifact-persona-project', pg_temp.local_project(), pg_temp.analyse_artifact('disabled-a', 'disabled-i'), null
  )$$,
  '42501', 'point object artifact scope unavailable', 'disabled scope denies put before payload parsing'
);

reset role;
update geoai_private.point_object_artifact_scope_config
set enabled = true,
    organization_id = '97100000-0000-0000-0000-000000000001',
    project_id = '97300000-0000-0000-0000-000000000001',
    project_key = 'artifact-persona-project',
    updated_at = now()
where singleton;
set local role authenticated;
select set_config('request.jwt.claim.sub', '97000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"97000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1","is_anonymous":false}', true);

select extensions.throws_ok(
  $$select api.list_point_object_project_artifacts('wrong-project', 4, null, null)$$,
  '42501', 'point object artifact scope unavailable', 'wrong project cannot select another scope'
);
select extensions.throws_ok(
  $$select api.put_point_object_project_artifact('wrong-project', '{}'::jsonb, '{}'::jsonb, null)$$,
  '42501', 'point object artifact scope unavailable', 'wrong project is denied before payload parsing'
);
select extensions.throws_ok(
  $$select api.list_point_object_project_artifacts('artifact-persona-project', 4, now(), null)$$,
  '22023', 'invalid page cursor', 'created-at-only cursor is rejected'
);
select extensions.throws_ok(
  $$select api.list_point_object_project_artifacts(
    'artifact-persona-project', 4, null, '97400000-0000-0000-0000-000000000001'
  )$$,
  '22023', 'invalid page cursor', 'id-only cursor is rejected'
);
select extensions.throws_ok(
  $$select api.put_point_object_project_artifact(
    'artifact-persona-project', pg_temp.local_project(),
    pg_temp.artifact('analyse', 'invalid-shape', 'invalid-shape', 0, '{"analysis":{}}', repeat('a', 64)), null
  )$$,
  '22023', 'invalid Analyse artifact payload', 'direct RPC enforces critical payload shape'
);

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
  (api.put_point_object_project_artifact(
    'artifact-persona-project', pg_temp.local_project('project:local-1', 'Renamed'),
    pg_temp.artifact('analyse', 'artifact-a', 'idem-a', 0, '{"selection":{"id":"one"},"analysis":{"result":"fixed"}}', repeat('a', 64)), null
  )->>'status'),
  'conflict', 'changed local project name is not misclassified as replay'
);
select extensions.is(
  (api.put_point_object_project_artifact(
    'artifact-persona-project', pg_temp.local_project('project:local-1', 'Renamed'),
    pg_temp.artifact('analyse', 'artifact-a', 'idem-a', 0, '{"selection":{"id":"one"},"analysis":{"result":"fixed"}}', repeat('a', 64)), 1
  )->>'conflictReason'),
  'local_project_identity', 'local project metadata remains immutable under CAS'
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
    pg_temp.analyse_artifact('artifact-s', 'idem-s'), null)->>'status'),
  'created', 'second key pair is created for split-key coverage'
);
select extensions.is(
  (api.put_point_object_project_artifact('artifact-persona-project', pg_temp.local_project(),
    pg_temp.analyse_artifact('artifact-a', 'idem-s'), null)->>'status'),
  'conflict', 'split artifact and idempotency keys fail closed'
);
select extensions.is(
  (api.put_point_object_project_artifact('artifact-persona-project', pg_temp.local_project(),
    pg_temp.analyse_artifact('artifact-a', 'idem-s'), null)->>'conflictReason'),
  'split_key', 'split-key conflict reports an explicit reason'
);
select extensions.is(
  (api.put_point_object_project_artifact('artifact-persona-project', pg_temp.local_project(),
    pg_temp.analyse_artifact('artifact-a', 'idem-s'), null)->>'id'),
  null::text, 'split-key conflict does not invent a current row id'
);
select extensions.is(
  (api.put_point_object_project_artifact('artifact-persona-project', pg_temp.local_project(),
    pg_temp.analyse_artifact('artifact-a', 'idem-s'), null)->>'payloadHash'),
  null::text, 'split-key conflict does not echo an invented current hash'
);
select extensions.is(
  (api.put_point_object_project_artifact('artifact-persona-project', pg_temp.local_project(),
    pg_temp.artifact('analyse', 'artifact-a', 'idem-a', 2, '{"selection":{"id":"one"},"analysis":{"result":"changed"}}', repeat('d', 64)), 2)->>'status'),
  'conflict', 'Analyse completed result is immutable even with forged client hash'
);

select extensions.is(
  (api.put_point_object_project_artifact('artifact-persona-project', pg_temp.local_project(),
    pg_temp.artifact('find', 'artifact-f', 'idem-f', 0,
      '{"session":{"locale":"en","marketKey":"dubai","result":{"fixed":true},"shortlist":[],"comparisonOpen":false,"comparisonView":"results","analysisTargetSourceFeatureId":null,"updatedAt":"2026-09-18T20:00:00Z"}}', repeat('e', 64)), null)->>'status'),
  'created', 'analyst creates a Find artifact'
);
select extensions.is(
  (api.put_point_object_project_artifact('artifact-persona-project', pg_temp.local_project(),
    pg_temp.artifact('find', 'artifact-f', 'idem-f', 2,
      '{"session":{"locale":"en","marketKey":"dubai","result":{"fixed":true},"shortlist":[{"id":"one"}],"comparisonOpen":true,"comparisonView":"mini","analysisTargetSourceFeatureId":"node/1","updatedAt":"2026-09-18T20:00:02Z"}}', repeat('f', 64)), 1)->>'status'),
  'updated', 'Find explicit save accepts two local view changes from revision zero to two'
);
select extensions.is(
  (api.put_point_object_project_artifact('artifact-persona-project', pg_temp.local_project(),
    pg_temp.artifact('find', 'artifact-f', 'idem-f', 2,
      '{"session":{"locale":"en","marketKey":"dubai","result":{"fixed":true},"shortlist":[],"comparisonOpen":false,"comparisonView":"results","analysisTargetSourceFeatureId":null,"updatedAt":"2026-09-18T20:00:03Z"}}', repeat('1', 64)), 2)->>'conflictReason'),
  'stale_view_revision', 'equal Find revision with divergent mutable bytes fails closed'
);
select extensions.is(
  (api.put_point_object_project_artifact('artifact-persona-project', pg_temp.local_project(),
    pg_temp.artifact('find', 'artifact-f', 'idem-f', 3,
      '{"session":{"locale":"en","marketKey":"dubai","result":{"fixed":true},"shortlist":[],"comparisonOpen":false,"comparisonView":"results","analysisTargetSourceFeatureId":null,"updatedAt":"2026-09-18T20:00:04Z"}}', repeat('1', 64)), 1)->>'status'),
  'conflict', 'stale expected revision fails closed'
);
select extensions.is(
  (api.put_point_object_project_artifact('artifact-persona-project', pg_temp.local_project(),
    pg_temp.artifact('find', 'artifact-f', 'idem-f', 3,
      '{"session":{"locale":"en","marketKey":"dubai","result":{"fixed":true},"shortlist":[],"comparisonOpen":false,"comparisonView":"results","analysisTargetSourceFeatureId":null,"updatedAt":"2026-09-18T20:00:04Z"}}', repeat('1', 64)), 1)->>'conflictReason'),
  'stale_cloud_revision', 'monotonic Find updates still require the exact cloud CAS base'
);
select extensions.is(
  (api.put_point_object_project_artifact('artifact-persona-project', pg_temp.local_project(),
    pg_temp.artifact('find', 'artifact-f', 'idem-f', 3,
      '{"session":{"locale":"en","marketKey":"dubai","result":{"fixed":false},"shortlist":[],"comparisonOpen":false,"comparisonView":"results","analysisTargetSourceFeatureId":null,"updatedAt":"2026-09-18T20:00:04Z"}}', repeat('7', 64)), 2)->>'status'),
  'conflict', 'Find completed result mutation is detected inside SQL'
);

select extensions.is(
  (api.put_point_object_project_artifact('artifact-persona-project', pg_temp.local_project(),
    pg_temp.artifact('create', 'artifact-c', 'idem-c', 1, '{"aoi":{"id":"aoi-1"},"editorSnapshot":null,"generated":{"fixed":true},"generatedLocale":"en","activeAlternativeId":"B","areaContext":null}', repeat('2', 64)), null)->>'status'),
  'created', 'analyst creates a revision-one Create artifact'
);
select extensions.is(
  (api.put_point_object_project_artifact('artifact-persona-project', pg_temp.local_project(),
    pg_temp.artifact('create', 'artifact-c', 'idem-c', 3, '{"aoi":{"id":"aoi-1"},"editorSnapshot":null,"generated":{"fixed":true},"generatedLocale":"en","activeAlternativeId":"A","areaContext":null}', repeat('3', 64)), 1)->>'status'),
  'updated', 'Create explicit save accepts two local view changes from revision one to three'
);
select extensions.is(
  (api.put_point_object_project_artifact('artifact-persona-project', pg_temp.local_project(),
    pg_temp.artifact('create', 'artifact-c', 'idem-c', 3, '{"aoi":{"id":"aoi-1"},"editorSnapshot":null,"generated":{"fixed":true},"generatedLocale":"en","activeAlternativeId":"B","areaContext":null}', repeat('5', 64)), 2)->>'conflictReason'),
  'stale_view_revision', 'equal Create revision with divergent mutable bytes fails closed'
);
select extensions.is(
  (api.put_point_object_project_artifact('artifact-persona-project', pg_temp.local_project(),
    pg_temp.artifact('create', 'artifact-c', 'idem-c', 4, '{"aoi":{"id":"aoi-1"},"editorSnapshot":null,"generated":{"fixed":false},"generatedLocale":"en","activeAlternativeId":"A","areaContext":null}', repeat('4', 64)), 2)->>'status'),
  'conflict', 'Create generated result mutation is detected inside SQL'
);
select extensions.is(
  jsonb_array_length(api.list_point_object_project_artifacts('artifact-persona-project', 100, null, null)),
  4, 'list hard-clamps a caller-supplied oversized page limit'
);
select extensions.is(
  jsonb_array_length(api.list_point_object_project_artifacts('artifact-persona-project', 2, null, null)),
  2, 'first keyset page is bounded'
);
select extensions.is(
  jsonb_array_length(api.list_point_object_project_artifacts(
    'artifact-persona-project', 2,
    (api.list_point_object_project_artifacts('artifact-persona-project', 2, null, null)->1->>'createdAt')::timestamptz,
    (api.list_point_object_project_artifacts('artifact-persona-project', 2, null, null)->1->>'id')::uuid
  )),
  2, 'second keyset page returns the remaining creator rows'
);
select extensions.ok(
  not exists (
    select 1
    from jsonb_array_elements(api.list_point_object_project_artifacts('artifact-persona-project', 2, null, null)) as first_page(item)
    join jsonb_array_elements(api.list_point_object_project_artifacts(
      'artifact-persona-project', 2,
      (api.list_point_object_project_artifacts('artifact-persona-project', 2, null, null)->1->>'createdAt')::timestamptz,
      (api.list_point_object_project_artifacts('artifact-persona-project', 2, null, null)->1->>'id')::uuid
    )) as second_page(item) on second_page.item->>'id' = first_page.item->>'id'
  ),
  'adjacent keyset pages do not overlap'
);
select extensions.is(
  jsonb_array_length(api.list_point_object_project_artifacts(
    'artifact-persona-project', 4, '1970-01-01T00:00:00Z', '97400000-0000-0000-0000-000000000001'
  )),
  0, 'forged but well-formed cursor remains bounded to the creator page'
);

select extensions.is(
  (api.put_point_object_project_artifact(
    'artifact-persona-project', pg_temp.local_project(),
    pg_temp.padded_analyse_artifact(917504, 'artifact-boundary', 'idem-boundary'), null
  )->>'status'),
  'created', 'exact SQL JSONB byte ceiling is accepted'
);
select extensions.throws_ok(
  $$select api.put_point_object_project_artifact(
    'artifact-persona-project', pg_temp.local_project(),
    pg_temp.padded_analyse_artifact(917505, 'artifact-over', 'idem-over'), null
  )$$,
  '22023', 'artifact envelope is too large', 'one byte over the SQL JSONB ceiling is rejected'
);

do $$
declare
  counter integer;
begin
  for counter in 6..30 loop
    perform api.put_point_object_project_artifact(
      'artifact-persona-project', pg_temp.local_project(),
      pg_temp.analyse_artifact('artifact-local-' || counter, 'idem-local-' || counter), null
    );
  end loop;
end;
$$;
select extensions.throws_ok(
  $$select api.put_point_object_project_artifact(
    'artifact-persona-project', pg_temp.local_project(),
    pg_temp.analyse_artifact('artifact-local-31', 'idem-local-31'), null
  )$$,
  '54000', 'project artifact capacity exceeded', 'thirty-first artifact in one local project is rejected'
);

do $$
declare
  counter integer;
begin
  for counter in 2..20 loop
    perform api.put_point_object_project_artifact(
      'artifact-persona-project', pg_temp.local_project('project:local-' || counter, 'Local Project ' || counter),
      pg_temp.analyse_artifact('artifact-project-' || counter, 'idem-project-' || counter), null
    );
  end loop;
end;
$$;
select extensions.throws_ok(
  $$select api.put_point_object_project_artifact(
    'artifact-persona-project', pg_temp.local_project('project:local-21', 'Local Project 21'),
    pg_temp.analyse_artifact('artifact-project-21', 'idem-project-21'), null
  )$$,
  '54000', 'project artifact capacity exceeded', 'twenty-first local project is rejected'
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
do $$
declare
  counter integer;
begin
  for counter in 1..4 loop
    perform api.put_point_object_project_artifact(
      'artifact-persona-project', pg_temp.local_project(),
      pg_temp.padded_analyse_artifact(917504, 'artifact-bytes-' || counter, 'idem-bytes-' || counter), null
    );
  end loop;
end;
$$;
select extensions.throws_ok(
  $$select api.put_point_object_project_artifact(
    'artifact-persona-project', pg_temp.local_project(),
    pg_temp.padded_analyse_artifact(917504, 'artifact-bytes-5', 'idem-bytes-5'), null
  )$$,
  '54000', 'project artifact capacity exceeded', 'per-actor bounded-byte quota is enforced transactionally'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '97000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"97000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1","is_anonymous":false}', true);
select extensions.is(
  jsonb_array_length(api.list_point_object_project_artifacts('artifact-persona-project', 4, null, null)),
  4, 'first creator page remains isolated from the second creator rows'
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
update auth.users
set banned_until = now() + interval '1 day'
where id = '97000000-0000-0000-0000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub', '97000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"97000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1","is_anonymous":false}', true);
select extensions.throws_ok(
  $$select api.list_point_object_project_artifacts('artifact-persona-project', 4, null, null)$$,
  '42501', 'verified caller profile required', 'old JWT cannot list after the current account is banned'
);
select extensions.throws_ok(
  $$select api.put_point_object_project_artifact(
    'artifact-persona-project', pg_temp.local_project(), pg_temp.analyse_artifact('banned-artifact', 'banned-idem'), null
  )$$,
  '42501', 'verified caller profile required', 'old JWT cannot put after the current account is banned'
);

reset role;
update auth.users set banned_until = null where id = '97000000-0000-0000-0000-000000000001';
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
update geoai_private.point_object_artifact_scope_config
set enabled = false, organization_id = null, project_id = null, project_key = null, updated_at = now()
where singleton;
set local role authenticated;
select set_config('request.jwt.claim.sub', '97000000-0000-0000-0000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"97000000-0000-0000-0000-000000000002","role":"authenticated","aal":"aal1","is_anonymous":false}', true);
select extensions.throws_ok(
  $$select api.list_point_object_project_artifacts('artifact-persona-project', 4, null, null)$$,
  '42501', 'point object artifact scope unavailable', 'disabling rollout scope immediately closes reads'
);

reset role;
select extensions.finish();
rollback;
