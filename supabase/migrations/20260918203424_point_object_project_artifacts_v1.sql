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

-- Root/operator-owned rollout scope. The row is disabled by default and lives
-- outside the exposed Data API schema. Neither authenticated callers nor the
-- service role receive table privileges. Enabling one exact development
-- project is a separate root-owned operator action after local acceptance.
create table geoai_private.point_object_artifact_scope_config (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default false,
  organization_id uuid,
  project_id uuid,
  project_key text,
  updated_at timestamptz not null default now(),
  constraint point_object_artifact_scope_config_state_check check (
    (not enabled and organization_id is null and project_id is null and project_key is null)
    or
    (enabled and organization_id is not null and project_id is not null and project_key is not null)
  ),
  constraint point_object_artifact_scope_config_project_fkey
    foreign key (project_id, organization_id, project_key)
    references public.projects(id, organization_id, project_key)
    on delete restrict
);

insert into geoai_private.point_object_artifact_scope_config (singleton, enabled)
values (true, false);

alter table geoai_private.point_object_artifact_scope_config enable row level security;
alter table geoai_private.point_object_artifact_scope_config force row level security;
create policy point_object_artifact_scope_config_postgres_all
on geoai_private.point_object_artifact_scope_config
for all to postgres
using (true)
with check (true);
revoke all on table geoai_private.point_object_artifact_scope_config
  from public, anon, authenticated, service_role;

create table public.point_object_project_artifacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  project_key text not null,
  created_by uuid not null references public.profiles(id) on delete cascade,
  artifact_id text not null check (length(artifact_id) between 1 and 160),
  idempotency_key text not null check (length(idempotency_key) between 1 and 200),
  artifact_kind text not null check (artifact_kind in ('analyse', 'find', 'create')),
  local_project jsonb not null check (
    jsonb_typeof(local_project) = 'object'
    and octet_length(local_project::text) <= 4096
  ),
  artifact_json jsonb not null check (
    jsonb_typeof(artifact_json) = 'object'
    and octet_length(artifact_json::text) <= 917504
  ),
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
stable
security definer
set search_path = ''
as $$
declare
  kind text;
  mutable_payload jsonb;
  fixed_payload jsonb;
  completed_timestamp timestamptz;
  updated_timestamp timestamptz;
  session_updated_timestamp timestamptz;
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

  -- The route still owns the complete current DTO parser and full nested
  -- semantic validation. These independent SQL checks cover the security-
  -- critical envelope, bounded scalar fields and mutable projection shape so
  -- a direct RPC call cannot turn the database into an untyped blob store.
  if target_artifact ->> 'schemaVersion' is distinct from '1'
     or jsonb_typeof(target_artifact -> 'schemaVersion') is distinct from 'number'
     or coalesce(target_artifact ->> 'locale' not in ('en', 'ru'), true)
     or coalesce(target_artifact ->> 'marketKey' not in (
       'dubai', 'abu_dhabi', 'doha', 'riyadh', 'jeddah', 'kuala_lumpur',
       'singapore', 'hong_kong', 'moscow'
     ), true)
     or jsonb_typeof(target_artifact -> 'label') is distinct from 'string'
     or jsonb_typeof(target_artifact -> 'completedAt') is distinct from 'string'
     or jsonb_typeof(target_artifact -> 'updatedAt') is distinct from 'string'
     or length(btrim(target_artifact ->> 'label')) not between 1 and 240
     or (target_artifact ->> 'label') ~ '[[:cntrl:]]'
     or length(target_artifact ->> 'completedAt') not between 20 and 64
     or length(target_artifact ->> 'updatedAt') not between 20 and 64
     or (target_artifact ->> 'completedAt') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T.*(Z|[+-][0-9]{2}:[0-9]{2})$'
     or (target_artifact ->> 'updatedAt') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T.*(Z|[+-][0-9]{2}:[0-9]{2})$' then
    raise exception using errcode = '22023', message = 'invalid artifact envelope';
  end if;
  begin
    completed_timestamp := (target_artifact ->> 'completedAt')::timestamptz;
    updated_timestamp := (target_artifact ->> 'updatedAt')::timestamptz;
  exception when others then
    raise exception using errcode = '22023', message = 'invalid artifact timestamp';
  end;
  if updated_timestamp < completed_timestamp then
    raise exception using errcode = '22023', message = 'invalid artifact timestamp order';
  end if;

  kind := target_artifact ->> 'kind';
  mutable_payload := target_artifact -> 'payload';
  if kind is null or kind not in ('analyse', 'find', 'create') or jsonb_typeof(mutable_payload) <> 'object' then
    raise exception using errcode = '22023', message = 'invalid artifact kind or payload';
  end if;

  fixed_payload := mutable_payload;
  if kind = 'analyse' then
    if jsonb_typeof(mutable_payload -> 'selection') is distinct from 'object'
       or jsonb_typeof(mutable_payload -> 'analysis') is distinct from 'object' then
      raise exception using errcode = '22023', message = 'invalid Analyse artifact payload';
    end if;
  elsif kind = 'find' then
    if jsonb_typeof(mutable_payload -> 'session') is distinct from 'object'
       or jsonb_typeof(mutable_payload #> '{session,result}') is distinct from 'object'
       or jsonb_typeof(mutable_payload #> '{session,shortlist}') is distinct from 'array'
       or jsonb_array_length(mutable_payload #> '{session,shortlist}') > 3
       or jsonb_typeof(mutable_payload #> '{session,comparisonOpen}') is distinct from 'boolean'
       or coalesce(mutable_payload #>> '{session,comparisonView}' not in ('results', 'mini', 'dashboard'), true)
       or jsonb_typeof(mutable_payload #> '{session,updatedAt}') is distinct from 'string'
       or (mutable_payload #>> '{session,updatedAt}') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T.*(Z|[+-][0-9]{2}:[0-9]{2})$'
       or mutable_payload #>> '{session,locale}' is distinct from target_artifact ->> 'locale'
       or mutable_payload #>> '{session,marketKey}' is distinct from target_artifact ->> 'marketKey'
       or coalesce(not (
         jsonb_typeof(mutable_payload #> '{session,analysisTargetSourceFeatureId}') = 'null'
         or (
           jsonb_typeof(mutable_payload #> '{session,analysisTargetSourceFeatureId}') = 'string'
           and length(mutable_payload #>> '{session,analysisTargetSourceFeatureId}') between 1 and 200
         )
       ), true) then
      raise exception using errcode = '22023', message = 'invalid find artifact session';
    end if;
    begin
      session_updated_timestamp := (mutable_payload #>> '{session,updatedAt}')::timestamptz;
    exception when others then
      raise exception using errcode = '22023', message = 'invalid find artifact timestamp';
    end;
    fixed_payload := jsonb_set(
      mutable_payload,
      '{session}',
      (mutable_payload -> 'session')
        - 'shortlist' - 'comparisonOpen' - 'comparisonView'
        - 'analysisTargetSourceFeatureId' - 'updatedAt',
      false
    );
  elsif kind = 'create' then
    if jsonb_typeof(mutable_payload -> 'aoi') is distinct from 'object'
       or jsonb_typeof(mutable_payload -> 'generated') is distinct from 'object'
       or mutable_payload ->> 'generatedLocale' is distinct from target_artifact ->> 'locale'
       or coalesce(mutable_payload ->> 'activeAlternativeId' not in ('A', 'B'), true)
       or coalesce(jsonb_typeof(mutable_payload -> 'editorSnapshot') not in ('null', 'object'), true)
       or coalesce(jsonb_typeof(mutable_payload -> 'areaContext') not in ('null', 'object'), true) then
      raise exception using errcode = '22023', message = 'invalid Create artifact payload';
    end if;
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
  conflict_reason text;
  actor_artifact_count bigint;
  actor_local_project_count bigint;
  local_project_artifact_count bigint;
  actor_storage_bytes bigint;
  incoming_storage_bytes bigint;
  saved_storage_bytes bigint;
  local_created_timestamp timestamptz;
begin
  actor_profile_id := geoai_private.current_profile_id();
  if actor_profile_id is null then
    raise exception using errcode = '42501', message = 'verified caller profile required';
  end if;

  -- Fail closed before parsing any caller payload. Only the one project that a
  -- root/operator explicitly enabled after deployment is callable.
  select config.project_id, config.organization_id
  into scope_project_id, scope_organization_id
  from geoai_private.point_object_artifact_scope_config config
  where config.singleton
    and config.enabled
    and config.project_key = target_project_key;
  if scope_project_id is null then
    raise exception using errcode = '42501', message = 'point object artifact scope unavailable';
  end if;

  perform 1
  from public.projects project
  join public.project_memberships project_membership
    on project_membership.project_id = project.id
   and project_membership.organization_id = project.organization_id
   and project_membership.project_key = project.project_key
  join public.organization_memberships organization_membership
    on organization_membership.organization_id = project.organization_id
   and organization_membership.profile_id = project_membership.user_id
  join public.organizations organization on organization.id = project.organization_id
  where project.id = scope_project_id
    and project.organization_id = scope_organization_id
    and project.project_key = target_project_key
    and project.status in ('active', 'demo')
    and organization.status = 'active'
    and project_membership.user_id = actor_profile_id
    and project_membership.status = 'active'
    and project_membership.role in ('owner', 'admin', 'analyst')
    and organization_membership.status = 'active';
  if not found
     or not geoai_private.has_project_role(scope_project_id, array['owner', 'admin', 'analyst']::text[]) then
    raise exception using errcode = '42501', message = 'project artifact write access denied';
  end if;

  if target_local_project is null or jsonb_typeof(target_local_project) <> 'object' then
    raise exception using errcode = '22023', message = 'invalid local project envelope';
  end if;
  if not (target_local_project ?& array['projectId', 'name', 'createdAt'])
     or (select count(*) from jsonb_object_keys(target_local_project)) <> 3
     or jsonb_typeof(target_local_project -> 'projectId') is distinct from 'string'
     or jsonb_typeof(target_local_project -> 'name') is distinct from 'string'
     or jsonb_typeof(target_local_project -> 'createdAt') is distinct from 'string'
     or length(btrim(target_local_project ->> 'projectId')) not between 1 and 160
     or length(btrim(target_local_project ->> 'name')) not between 1 and 120
     or target_local_project ->> 'projectId' <> btrim(target_local_project ->> 'projectId')
     or target_local_project ->> 'name' <> btrim(target_local_project ->> 'name')
     or (target_local_project ->> 'projectId') ~ '[[:cntrl:]]'
     or (target_local_project ->> 'name') ~ '[[:cntrl:]]'
     or length(target_local_project ->> 'createdAt') not between 20 and 64
     or (target_local_project ->> 'createdAt') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T.*(Z|[+-][0-9]{2}:[0-9]{2})$'
     or octet_length(target_local_project::text) > 4096 then
    raise exception using errcode = '22023', message = 'invalid local project envelope';
  end if;
  begin
    local_created_timestamp := (target_local_project ->> 'createdAt')::timestamptz;
  exception when others then
    raise exception using errcode = '22023', message = 'invalid local project timestamp';
  end;
  -- The route caps the complete UTF-8 request body at 832 KiB and the browser
  -- operation before its envelope at 768 KiB. JSONB text is a distinct,
  -- whitespace-normalized representation, so SQL uses its own fixed 896 KiB
  -- ceiling rather than pretending those byte counts are interchangeable.
  if target_artifact_json is null
     or octet_length(target_artifact_json::text) > 917504 then
    raise exception using errcode = '22023', message = 'artifact envelope is too large';
  end if;

  incoming_artifact_id := target_artifact_json ->> 'artifactId';
  incoming_idempotency_key := target_artifact_json ->> 'idempotencyKey';
  incoming_kind := target_artifact_json ->> 'kind';
  incoming_client_hash := target_artifact_json ->> 'payloadHash';
  if jsonb_typeof(target_artifact_json -> 'artifactId') is distinct from 'string'
     or jsonb_typeof(target_artifact_json -> 'idempotencyKey') is distinct from 'string'
     or length(btrim(incoming_artifact_id)) not between 1 and 160
     or length(btrim(incoming_idempotency_key)) not between 1 and 200
     or incoming_artifact_id <> btrim(incoming_artifact_id)
     or incoming_idempotency_key <> btrim(incoming_idempotency_key)
     or incoming_artifact_id ~ '[[:cntrl:]]'
     or incoming_idempotency_key ~ '[[:cntrl:]]'
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

  -- One actor/project lock serializes quota accounting as well as key races.
  -- The narrower locks remain in one fixed order to document key ownership.
  perform pg_advisory_xact_lock(hashtextextended(
    'point-object-actor-quota:' || scope_project_id::text || ':' || actor_profile_id::text, 0
  ));
  perform pg_advisory_xact_lock(hashtextextended(
    'point-object-artifact:' || scope_project_id::text || ':' || actor_profile_id::text || ':' || incoming_artifact_id, 0
  ));
  perform pg_advisory_xact_lock(hashtextextended(
      'point-object-idempotency:' || scope_project_id::text || ':' || actor_profile_id::text || ':' || incoming_idempotency_key, 0
  ));

  -- Logical stored-JSON quota includes the immutable projection duplicate;
  -- it does not rely on variable TOAST compression or physical row overhead.
  incoming_storage_bytes := octet_length(target_local_project::text)
    + octet_length(target_artifact_json::text)
    + octet_length(incoming_immutable::text);
  select count(*),
    count(distinct candidate.local_project ->> 'projectId'),
    count(*) filter (where candidate.local_project ->> 'projectId' = target_local_project ->> 'projectId'),
    coalesce(sum(
      octet_length(candidate.local_project::text)
      + octet_length(candidate.artifact_json::text)
      + octet_length(candidate.immutable_json::text)
    ), 0)
  into actor_artifact_count, actor_local_project_count, local_project_artifact_count, actor_storage_bytes
  from public.point_object_project_artifacts candidate
  where candidate.project_id = scope_project_id
    and candidate.created_by = actor_profile_id;

  select array_agg(candidate.id order by candidate.id)
  into matches
  from public.point_object_project_artifacts candidate
  where candidate.project_id = scope_project_id
    and candidate.created_by = actor_profile_id
    and (candidate.artifact_id = incoming_artifact_id or candidate.idempotency_key = incoming_idempotency_key);

  if coalesce(array_length(matches, 1), 0) > 1 then
    return jsonb_build_object(
      'status', 'conflict', 'conflictReason', 'split_key',
      'id', null, 'cloudRevision', null, 'viewRevision', null,
      'payloadHash', null, 'immutableHash', null,
      'clientPayloadHash', null, 'createdAt', null, 'updatedAt', null
    );
  end if;

  if coalesce(array_length(matches, 1), 0) = 0 then
    if target_expected_cloud_revision is not null then
      return jsonb_build_object(
        'status', 'conflict', 'conflictReason', 'missing',
        'id', null, 'cloudRevision', null, 'viewRevision', null,
        'payloadHash', null, 'immutableHash', null,
        'clientPayloadHash', null, 'createdAt', null, 'updatedAt', null
      );
    end if;
    if actor_artifact_count >= 600
       or local_project_artifact_count >= 30
       or (local_project_artifact_count = 0 and actor_local_project_count >= 20)
       or actor_storage_bytes + incoming_storage_bytes > 8388608 then
      raise exception using errcode = '54000', message = 'project artifact capacity exceeded';
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
    conflict_reason := null;
  else
    select * into saved
    from public.point_object_project_artifacts
    where id = matches[1]
    for update;

    if saved.artifact_id <> incoming_artifact_id
       or saved.idempotency_key <> incoming_idempotency_key then
      outcome := 'conflict';
      conflict_reason := 'key_conflict';
    elsif saved.local_project <> target_local_project then
      outcome := 'conflict';
      conflict_reason := 'local_project_identity';
    elsif saved.payload_hash = incoming_payload_hash
       and saved.view_revision = incoming_view_revision
       and saved.immutable_json = incoming_immutable
       and saved.artifact_json = target_artifact_json
       and saved.local_project = target_local_project then
      outcome := 'replayed';
      conflict_reason := null;
    elsif saved.immutable_json <> incoming_immutable
       or (saved.artifact_kind = 'analyse' and saved.artifact_json <> target_artifact_json) then
      outcome := 'conflict';
      conflict_reason := 'immutable_or_readonly';
    elsif target_expected_cloud_revision is distinct from saved.cloud_revision then
      outcome := 'conflict';
      conflict_reason := 'stale_cloud_revision';
    elsif not (
      (saved.artifact_json = target_artifact_json and incoming_view_revision = saved.view_revision)
      or (saved.artifact_kind in ('find', 'create') and incoming_view_revision > saved.view_revision)
    ) then
      outcome := 'conflict';
      conflict_reason := 'stale_view_revision';
    else
      saved_storage_bytes := octet_length(saved.local_project::text)
        + octet_length(saved.artifact_json::text)
        + octet_length(saved.immutable_json::text);
      if actor_storage_bytes - saved_storage_bytes + incoming_storage_bytes > 8388608 then
        raise exception using errcode = '54000', message = 'project artifact capacity exceeded';
      end if;
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
      conflict_reason := null;
    end if;
  end if;

  return jsonb_build_object(
    'status', outcome,
    'conflictReason', conflict_reason,
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
  scope_organization_id uuid;
  bounded_limit integer;
  result jsonb;
begin
  actor_profile_id := geoai_private.current_profile_id();
  if actor_profile_id is null then
    raise exception using errcode = '42501', message = 'verified caller profile required';
  end if;
  select config.project_id, config.organization_id
  into scope_project_id, scope_organization_id
  from geoai_private.point_object_artifact_scope_config config
  where config.singleton
    and config.enabled
    and config.project_key = target_project_key;
  if scope_project_id is null then
    raise exception using errcode = '42501', message = 'point object artifact scope unavailable';
  end if;

  perform 1
  from public.projects project
  join public.project_memberships project_membership
    on project_membership.project_id = project.id
   and project_membership.organization_id = project.organization_id
   and project_membership.project_key = project.project_key
  join public.organization_memberships organization_membership
    on organization_membership.organization_id = project.organization_id
   and organization_membership.profile_id = project_membership.user_id
  join public.organizations organization on organization.id = project.organization_id
  where project.id = scope_project_id
    and project.organization_id = scope_organization_id
    and project.project_key = target_project_key
    and project.status in ('active', 'demo')
    and organization.status = 'active'
    and project_membership.user_id = actor_profile_id
    and project_membership.status = 'active'
    and project_membership.role in ('owner', 'admin', 'analyst', 'viewer')
    and organization_membership.status = 'active';
  if not found
     or not geoai_private.has_project_role(scope_project_id, array['owner', 'admin', 'analyst', 'viewer']::text[]) then
    raise exception using errcode = '42501', message = 'project artifact read access denied';
  end if;

  if ((target_before_created_at is null) <> (target_before_id is null)) then
    raise exception using errcode = '22023', message = 'invalid page cursor';
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
comment on table geoai_private.point_object_artifact_scope_config is
  'Root/operator-owned, default-disabled exact-project rollout scope. No client or service-role grants.';
comment on function api.put_point_object_project_artifact(text, jsonb, jsonb, bigint) is
  'Caller-bound CAS/replay facade. SQL independently enforces exact enabled scope, current account, shallow security shape, quotas and derived projections; the route retains full current DTO validation.';
comment on function api.list_point_object_project_artifacts(text, integer, timestamptz, uuid) is
  'Bounded creator-private keyset page for one exact active project membership.';

commit;
