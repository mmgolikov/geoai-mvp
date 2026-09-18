-- Creator-private cloud copies of the current browser-local point-object
-- artifacts. Additive Preview slice: no existing row is rewritten or deleted.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

do $$
begin
  if to_regprocedure('geoai_private.current_profile_id()') is null
     or to_regprocedure('geoai_private.has_project_role(uuid,text[])') is null
     or to_regprocedure('api.current_project_access(text)') is null then
    raise exception using errcode = '55000', message = 'identity authorization prerequisite is missing';
  end if;
  if to_regprocedure('extensions.digest(bytea,text)') is null then
    raise exception using errcode = '55000', message = 'pgcrypto digest prerequisite is missing';
  end if;
end;
$$;

create table public.point_object_project_artifacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  project_key text not null,
  created_by uuid not null references public.profiles(id) on delete cascade,
  artifact_id text not null check (length(artifact_id) between 1 and 160),
  idempotency_key text not null check (length(idempotency_key) between 1 and 200),
  artifact_kind text not null check (artifact_kind in ('analyse', 'find', 'create')),
  local_project jsonb not null,
  artifact_json jsonb not null,
  immutable_json jsonb not null,
  payload_hash text not null check (payload_hash ~ '^[a-f0-9]{64}$'),
  immutable_hash text not null check (immutable_hash ~ '^[a-f0-9]{64}$'),
  client_payload_hash text not null check (client_payload_hash ~ '^[a-f0-9]{64}$'),
  view_revision integer not null check (view_revision between 0 and 100000),
  cloud_revision bigint not null default 1 check (cloud_revision >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint point_object_project_artifacts_project_scope_fkey
    foreign key (project_id, organization_id, project_key)
    references public.projects(id, organization_id, project_key) on delete cascade,
  constraint point_object_project_artifacts_actor_artifact_unique
    unique (project_id, created_by, artifact_id),
  constraint point_object_project_artifacts_actor_idempotency_unique
    unique (project_id, created_by, idempotency_key)
);

create index point_object_project_artifacts_creator_page_idx
  on public.point_object_project_artifacts (project_id, created_by, created_at desc, id desc);
create index point_object_project_artifacts_organization_idx
  on public.point_object_project_artifacts (organization_id);
create index point_object_project_artifacts_created_by_idx
  on public.point_object_project_artifacts (created_by);

alter table public.point_object_project_artifacts enable row level security;
alter table public.point_object_project_artifacts force row level security;

create policy point_object_project_artifacts_creator_select
on public.point_object_project_artifacts for select to authenticated
using (
  created_by = geoai_private.current_profile_id()
  and geoai_private.has_project_role(project_id, array['owner', 'admin', 'analyst', 'viewer']::text[])
);

create policy point_object_project_artifacts_creator_insert
on public.point_object_project_artifacts for insert to authenticated
with check (
  created_by = geoai_private.current_profile_id()
  and geoai_private.has_project_role(project_id, array['owner', 'admin', 'analyst']::text[])
);

create policy point_object_project_artifacts_creator_update
on public.point_object_project_artifacts for update to authenticated
using (
  created_by = geoai_private.current_profile_id()
  and geoai_private.has_project_role(project_id, array['owner', 'admin', 'analyst']::text[])
)
with check (
  created_by = geoai_private.current_profile_id()
  and geoai_private.has_project_role(project_id, array['owner', 'admin', 'analyst']::text[])
);

create or replace function geoai_private.point_object_artifact_projections(target_artifact jsonb)
returns table (full_json jsonb, immutable_json jsonb)
language plpgsql
immutable
security definer
set search_path = ''
as $$
declare
  kind text;
  mutable_payload jsonb;
  fixed_payload jsonb;
begin
  if target_artifact is null or jsonb_typeof(target_artifact) <> 'object' then
    raise exception using errcode = '22023', message = 'invalid artifact envelope';
  end if;
  if not (target_artifact ?& array[
       'schemaVersion', 'artifactId', 'idempotencyKey', 'payloadHash', 'completedAt',
       'updatedAt', 'viewRevision', 'kind', 'locale', 'marketKey', 'label', 'payload'
     ])
     or (select count(*) from jsonb_object_keys(target_artifact)) <> 12 then
    raise exception using errcode = '22023', message = 'invalid artifact envelope';
  end if;
  kind := target_artifact ->> 'kind';
  mutable_payload := target_artifact -> 'payload';
  if kind is null or kind not in ('analyse', 'find', 'create') or jsonb_typeof(mutable_payload) <> 'object' then
    raise exception using errcode = '22023', message = 'invalid artifact kind or payload';
  end if;

  fixed_payload := mutable_payload;
  if kind = 'find' then
    if jsonb_typeof(mutable_payload -> 'session') <> 'object' then
      raise exception using errcode = '22023', message = 'invalid find artifact session';
    end if;
    fixed_payload := jsonb_set(
      mutable_payload,
      '{session}',
      (mutable_payload -> 'session')
        - 'shortlist' - 'comparisonOpen' - 'comparisonView'
        - 'analysisTargetSourceFeatureId' - 'updatedAt',
      false
    );
  elsif kind = 'create' then
    fixed_payload := mutable_payload - 'activeAlternativeId';
  end if;

  full_json := jsonb_build_object(
    'kind', target_artifact -> 'kind',
    'locale', target_artifact -> 'locale',
    'marketKey', target_artifact -> 'marketKey',
    'payload', mutable_payload
  );
  -- Everything except the full hash, update timestamp, view revision and the
  -- explicit per-kind view fields is immutable. In particular, direct RPC
  -- callers cannot alter labels, completion time or any completed payload.
  immutable_json := jsonb_set(
    target_artifact - 'payloadHash' - 'updatedAt' - 'viewRevision',
    '{payload}',
    fixed_payload,
    false
  );
  return next;
end;
$$;

create or replace function geoai_private.put_point_object_project_artifact(
  target_project_key text,
  target_local_project jsonb,
  target_artifact_json jsonb,
  target_expected_cloud_revision bigint default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  actor_profile_id uuid;
  scope_project_id uuid;
  scope_organization_id uuid;
  incoming_full jsonb;
  incoming_immutable jsonb;
  incoming_payload_hash text;
  incoming_immutable_hash text;
  incoming_client_hash text;
  incoming_artifact_id text;
  incoming_idempotency_key text;
  incoming_kind text;
  incoming_view_revision integer;
  matches uuid[];
  saved public.point_object_project_artifacts%rowtype;
  outcome text;
begin
  actor_profile_id := geoai_private.current_profile_id();
  if actor_profile_id is null then
    raise exception using errcode = '42501', message = 'verified caller profile required';
  end if;
  if target_project_key is null
     or target_project_key !~ '^[A-Za-z0-9]([A-Za-z0-9._:-]{0,126}[A-Za-z0-9])?$' then
    raise exception using errcode = '22023', message = 'invalid project key';
  end if;
  if target_local_project is null or jsonb_typeof(target_local_project) <> 'object' then
    raise exception using errcode = '22023', message = 'invalid local project envelope';
  end if;
  if not (target_local_project ?& array['projectId', 'name', 'createdAt'])
     or (select count(*) from jsonb_object_keys(target_local_project)) <> 3
     or length(btrim(target_local_project ->> 'projectId')) not between 1 and 160
     or length(btrim(target_local_project ->> 'name')) not between 1 and 120
     or (target_local_project ->> 'createdAt')::timestamptz is null
     or pg_column_size(target_local_project) > 4096 then
    raise exception using errcode = '22023', message = 'invalid local project envelope';
  end if;
  if pg_column_size(target_artifact_json) > 786432 then
    raise exception using errcode = '22023', message = 'artifact envelope is too large';
  end if;

  incoming_artifact_id := target_artifact_json ->> 'artifactId';
  incoming_idempotency_key := target_artifact_json ->> 'idempotencyKey';
  incoming_kind := target_artifact_json ->> 'kind';
  incoming_client_hash := target_artifact_json ->> 'payloadHash';
  if length(btrim(incoming_artifact_id)) not between 1 and 160
     or length(btrim(incoming_idempotency_key)) not between 1 and 200
     or incoming_client_hash !~ '^[a-f0-9]{64}$'
     or jsonb_typeof(target_artifact_json -> 'viewRevision') <> 'number'
     or (target_artifact_json ->> 'viewRevision') !~ '^[0-9]{1,6}$' then
    raise exception using errcode = '22023', message = 'invalid artifact identity or revision';
  end if;
  incoming_view_revision := (target_artifact_json ->> 'viewRevision')::integer;
  if incoming_view_revision not between 0 and 100000 then
    raise exception using errcode = '22023', message = 'invalid artifact view revision';
  end if;
  if target_expected_cloud_revision is not null and target_expected_cloud_revision < 1 then
    raise exception using errcode = '22023', message = 'invalid expected cloud revision';
  end if;

  select projection.full_json, projection.immutable_json
  into incoming_full, incoming_immutable
  from geoai_private.point_object_artifact_projections(target_artifact_json) projection;
  incoming_payload_hash := encode(extensions.digest(convert_to(incoming_full::text, 'UTF8'), 'sha256'), 'hex');
  incoming_immutable_hash := encode(extensions.digest(convert_to(incoming_immutable::text, 'UTF8'), 'sha256'), 'hex');

  select project.id, project.organization_id
  into scope_project_id, scope_organization_id
  from public.projects project
  join public.project_memberships project_membership
    on project_membership.project_id = project.id
   and project_membership.organization_id = project.organization_id
   and project_membership.project_key = project.project_key
  join public.organization_memberships organization_membership
    on organization_membership.organization_id = project.organization_id
   and organization_membership.profile_id = project_membership.user_id
  join public.organizations organization on organization.id = project.organization_id
  where project.project_key = target_project_key
    and project.status in ('active', 'demo')
    and organization.status = 'active'
    and project_membership.user_id = actor_profile_id
    and project_membership.status = 'active'
    and project_membership.role in ('owner', 'admin', 'analyst')
    and organization_membership.status = 'active'
  limit 1;
  if scope_project_id is null
     or not geoai_private.has_project_role(scope_project_id, array['owner', 'admin', 'analyst']::text[]) then
    raise exception using errcode = '42501', message = 'project artifact write access denied';
  end if;

  -- Serialize every actor-scoped artifact/idempotency key independently. This
  -- makes a concurrent byte-identical retry replay rather than race the unique
  -- constraints, while split-key collisions still fail closed.
  perform pg_advisory_xact_lock(hashtextextended(
    'point-object-artifact:' || scope_project_id::text || ':' || actor_profile_id::text || ':' || incoming_artifact_id, 0
  ));
  perform pg_advisory_xact_lock(hashtextextended(
    'point-object-idempotency:' || scope_project_id::text || ':' || actor_profile_id::text || ':' || incoming_idempotency_key, 0
  ));

  select array_agg(candidate.id order by candidate.id)
  into matches
  from public.point_object_project_artifacts candidate
  where candidate.project_id = scope_project_id
    and candidate.created_by = actor_profile_id
    and (candidate.artifact_id = incoming_artifact_id or candidate.idempotency_key = incoming_idempotency_key);

  if coalesce(array_length(matches, 1), 0) > 1 then
    return jsonb_build_object(
      'status', 'conflict', 'id', null, 'cloudRevision', 0, 'viewRevision', incoming_view_revision,
      'payloadHash', incoming_payload_hash, 'immutableHash', incoming_immutable_hash,
      'clientPayloadHash', incoming_client_hash, 'createdAt', null, 'updatedAt', null
    );
  end if;

  if coalesce(array_length(matches, 1), 0) = 0 then
    if target_expected_cloud_revision is not null then
      return jsonb_build_object(
        'status', 'conflict', 'id', null, 'cloudRevision', 0, 'viewRevision', incoming_view_revision,
        'payloadHash', incoming_payload_hash, 'immutableHash', incoming_immutable_hash,
        'clientPayloadHash', incoming_client_hash, 'createdAt', null, 'updatedAt', null
      );
    end if;
    insert into public.point_object_project_artifacts (
      organization_id, project_id, project_key, created_by, artifact_id, idempotency_key,
      artifact_kind, local_project, artifact_json, immutable_json, payload_hash,
      immutable_hash, client_payload_hash, view_revision
    ) values (
      scope_organization_id, scope_project_id, target_project_key, actor_profile_id,
      incoming_artifact_id, incoming_idempotency_key, incoming_kind, target_local_project,
      target_artifact_json, incoming_immutable, incoming_payload_hash,
      incoming_immutable_hash, incoming_client_hash, incoming_view_revision
    ) returning * into saved;
    outcome := 'created';
  else
    select * into saved
    from public.point_object_project_artifacts
    where id = matches[1]
    for update;

    if saved.artifact_id <> incoming_artifact_id
       or saved.idempotency_key <> incoming_idempotency_key
       or saved.local_project ->> 'projectId' <> target_local_project ->> 'projectId'
       or saved.local_project ->> 'createdAt' <> target_local_project ->> 'createdAt' then
      outcome := 'conflict';
    elsif saved.payload_hash = incoming_payload_hash
       and saved.view_revision = incoming_view_revision
       and saved.immutable_json = incoming_immutable then
      outcome := 'replayed';
    elsif saved.artifact_kind = 'analyse'
       or saved.immutable_json <> incoming_immutable
       or target_expected_cloud_revision is distinct from saved.cloud_revision
       or incoming_view_revision <> saved.view_revision + 1 then
      outcome := 'conflict';
    else
      update public.point_object_project_artifacts
      set local_project = target_local_project,
          artifact_json = target_artifact_json,
          payload_hash = incoming_payload_hash,
          immutable_hash = incoming_immutable_hash,
          client_payload_hash = incoming_client_hash,
          view_revision = incoming_view_revision,
          cloud_revision = cloud_revision + 1,
          updated_at = now()
      where id = saved.id
      returning * into saved;
      outcome := 'updated';
    end if;
  end if;

  return jsonb_build_object(
    'status', outcome,
    'id', saved.id,
    'cloudRevision', saved.cloud_revision,
    'viewRevision', saved.view_revision,
    'payloadHash', saved.payload_hash,
    'immutableHash', saved.immutable_hash,
    'clientPayloadHash', saved.client_payload_hash,
    'createdAt', saved.created_at,
    'updatedAt', saved.updated_at
  );
end;
$$;

create or replace function geoai_private.list_point_object_project_artifacts(
  target_project_key text,
  target_limit integer default 4,
  target_before_created_at timestamptz default null,
  target_before_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor_profile_id uuid;
  scope_project_id uuid;
  bounded_limit integer;
  result jsonb;
begin
  actor_profile_id := geoai_private.current_profile_id();
  if actor_profile_id is null then
    raise exception using errcode = '42501', message = 'verified caller profile required';
  end if;
  if target_project_key is null
     or target_project_key !~ '^[A-Za-z0-9]([A-Za-z0-9._:-]{0,126}[A-Za-z0-9])?$'
     or ((target_before_created_at is null) <> (target_before_id is null)) then
    raise exception using errcode = '22023', message = 'invalid project key or page cursor';
  end if;

  select project.id into scope_project_id
  from public.projects project
  join public.project_memberships project_membership
    on project_membership.project_id = project.id
   and project_membership.organization_id = project.organization_id
   and project_membership.project_key = project.project_key
  join public.organization_memberships organization_membership
    on organization_membership.organization_id = project.organization_id
   and organization_membership.profile_id = project_membership.user_id
  join public.organizations organization on organization.id = project.organization_id
  where project.project_key = target_project_key
    and project.status in ('active', 'demo')
    and organization.status = 'active'
    and project_membership.user_id = actor_profile_id
    and project_membership.status = 'active'
    and project_membership.role in ('owner', 'admin', 'analyst', 'viewer')
    and organization_membership.status = 'active'
  limit 1;
  if scope_project_id is null
     or not geoai_private.has_project_role(scope_project_id, array['owner', 'admin', 'analyst', 'viewer']::text[]) then
    raise exception using errcode = '42501', message = 'project artifact read access denied';
  end if;

  bounded_limit := least(greatest(coalesce(target_limit, 4), 1), 4);
  select coalesce(jsonb_agg(to_jsonb(page) order by page."createdAt" desc, page.id desc), '[]'::jsonb)
  into result
  from (
    select artifact.id,
      artifact.cloud_revision as "cloudRevision",
      artifact.payload_hash as "payloadHash",
      artifact.immutable_hash as "immutableHash",
      artifact.created_at as "createdAt",
      artifact.updated_at as "updatedAt",
      artifact.local_project as "localProject",
      artifact.artifact_json as artifact
    from public.point_object_project_artifacts artifact
    where artifact.project_id = scope_project_id
      and artifact.created_by = actor_profile_id
      and (
        target_before_created_at is null
        or (artifact.created_at, artifact.id) < (target_before_created_at, target_before_id)
      )
    order by artifact.created_at desc, artifact.id desc
    limit bounded_limit
  ) page;
  return result;
end;
$$;

create or replace function api.put_point_object_project_artifact(
  target_project_key text,
  target_local_project jsonb,
  target_artifact_json jsonb,
  target_expected_cloud_revision bigint default null
)
returns jsonb
language sql
volatile
security invoker
set search_path = ''
as $$
  select geoai_private.put_point_object_project_artifact(
    target_project_key, target_local_project, target_artifact_json, target_expected_cloud_revision
  )
$$;

create or replace function api.list_point_object_project_artifacts(
  target_project_key text,
  target_limit integer default 4,
  target_before_created_at timestamptz default null,
  target_before_id uuid default null
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select geoai_private.list_point_object_project_artifacts(
    target_project_key, target_limit, target_before_created_at, target_before_id
  )
$$;

revoke all on table public.point_object_project_artifacts from public, anon, authenticated, service_role;
revoke all on function geoai_private.point_object_artifact_projections(jsonb) from public, anon, authenticated, service_role;
revoke all on function geoai_private.put_point_object_project_artifact(text, jsonb, jsonb, bigint) from public, anon, authenticated, service_role;
revoke all on function geoai_private.list_point_object_project_artifacts(text, integer, timestamptz, uuid) from public, anon, authenticated, service_role;
revoke all on function api.put_point_object_project_artifact(text, jsonb, jsonb, bigint) from public, anon, authenticated, service_role;
revoke all on function api.list_point_object_project_artifacts(text, integer, timestamptz, uuid) from public, anon, authenticated, service_role;

grant execute on function geoai_private.put_point_object_project_artifact(text, jsonb, jsonb, bigint) to authenticated;
grant execute on function geoai_private.list_point_object_project_artifacts(text, integer, timestamptz, uuid) to authenticated;
grant execute on function api.put_point_object_project_artifact(text, jsonb, jsonb, bigint) to authenticated;
grant execute on function api.list_point_object_project_artifacts(text, integer, timestamptz, uuid) to authenticated;

comment on table public.point_object_project_artifacts is
  'Creator-private cloud copies of validated browser-local Analyse, Find and Create artifacts. No direct Data API grants.';
comment on function api.put_point_object_project_artifact(text, jsonb, jsonb, bigint) is
  'Caller-bound CAS/replay facade. Scope and creator come only from verified Auth; SQL recomputes immutable/full projections.';
comment on function api.list_point_object_project_artifacts(text, integer, timestamptz, uuid) is
  'Bounded creator-private keyset page for one exact active project membership.';

commit;
