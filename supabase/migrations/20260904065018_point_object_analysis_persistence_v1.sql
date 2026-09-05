-- Point-to-object analysis persistence v1
-- DEVELOPMENT REVIEW DRAFT. Do not apply until the hosted migration ledger is
-- reconciled, the containment/identity migrations are applied, `api` is the
-- only exposed application schema, and real JWT persona tests pass.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

-- Fail closed if this migration is replayed without the reviewed identity and
-- authorization foundation. It must not recreate or weaken that foundation.
do $$
begin
  if to_regclass('public.analysis_runs') is null then
    raise exception using errcode = '55000', message = 'analysis_runs prerequisite is missing';
  end if;
  if to_regprocedure('geoai_private.current_profile_id()') is null
     or to_regprocedure('geoai_private.has_project_role(uuid,text[])') is null
     or to_regprocedure('api.current_project_access(text)') is null then
    raise exception using errcode = '55000', message = 'identity authorization prerequisite is missing';
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'analysis_runs'
      and policyname = 'analysis_runs_member_select'
  ) or not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'analysis_runs'
      and policyname = 'analysis_runs_analyst_insert'
  ) or not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'analysis_runs'
      and policyname = 'analysis_runs_analyst_update'
  ) then
    raise exception using errcode = '55000', message = 'analysis_runs role policies are missing';
  end if;
end;
$$;

-- These restrictive policies add creator ownership for point-to-object rows
-- without changing the behavior of other analysis scenarios. The permissive
-- project-role policies from the identity migration remain mandatory.
drop policy if exists "point object analysis owner select" on public.analysis_runs;
create policy "point object analysis owner select"
on public.analysis_runs as restrictive for select to authenticated
using (
  scenario_id is distinct from 'point_to_object'
  or (
    created_by = geoai_private.current_profile_id()
    and geoai_private.has_project_role(
      project_id,
      array['owner', 'admin', 'analyst', 'viewer']::text[]
    )
  )
);

drop policy if exists "point object analysis owner insert" on public.analysis_runs;
create policy "point object analysis owner insert"
on public.analysis_runs as restrictive for insert to authenticated
with check (
  scenario_id is distinct from 'point_to_object'
  or (
    created_by = geoai_private.current_profile_id()
    and geoai_private.has_project_role(
      project_id,
      array['owner', 'admin', 'analyst']::text[]
    )
  )
);

drop policy if exists "point object analysis owner update" on public.analysis_runs;
create policy "point object analysis owner update"
on public.analysis_runs as restrictive for update to authenticated
using (
  scenario_id is distinct from 'point_to_object'
  or (
    created_by = geoai_private.current_profile_id()
    and geoai_private.has_project_role(
      project_id,
      array['owner', 'admin', 'analyst']::text[]
    )
  )
)
with check (
  scenario_id is distinct from 'point_to_object'
  or (
    created_by = geoai_private.current_profile_id()
    and geoai_private.has_project_role(
      project_id,
      array['owner', 'admin', 'analyst']::text[]
    )
  )
);

drop policy if exists "point object analysis owner delete" on public.analysis_runs;
create policy "point object analysis owner delete"
on public.analysis_runs as restrictive for delete to authenticated
using (
  scenario_id is distinct from 'point_to_object'
  or (
    created_by = geoai_private.current_profile_id()
    and geoai_private.has_project_role(project_id, array['owner', 'admin']::text[])
  )
);

create or replace function geoai_private.upsert_point_object_analysis_run(
  target_project_key text,
  target_run_key text,
  target_selected_name text,
  target_selected_type text,
  target_selected_point jsonb,
  target_selected_feature_key text default null,
  target_input_context jsonb default '{}'::jsonb,
  target_result_json jsonb default '{}'::jsonb,
  target_source_lineage jsonb default '[]'::jsonb,
  target_analysis_mode text default null,
  target_custom_query text default null,
  target_decision_posture text default null,
  target_confidence_level text default null,
  target_data_confidence_level text default null
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
  scope_project_name text;
  saved public.analysis_runs%rowtype;
begin
  actor_profile_id := geoai_private.current_profile_id();
  if actor_profile_id is null then
    raise exception using errcode = '42501', message = 'verified caller profile required';
  end if;

  if target_project_key is null
     or target_project_key !~ '^[A-Za-z0-9]([A-Za-z0-9._:-]{0,126}[A-Za-z0-9])?$' then
    raise exception using errcode = '22023', message = 'invalid project key';
  end if;
  if target_run_key is null
     or target_run_key !~ '^point-object:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    raise exception using errcode = '22023', message = 'invalid point-object run key';
  end if;
  if target_selected_name is null or length(target_selected_name) not between 1 and 500
     or target_selected_type is null or length(target_selected_type) not between 1 and 160 then
    raise exception using errcode = '22023', message = 'invalid selected object label';
  end if;
  if jsonb_typeof(target_selected_point) <> 'object'
     or jsonb_typeof(target_selected_point -> 'longitude') <> 'number'
     or jsonb_typeof(target_selected_point -> 'latitude') <> 'number'
     or (target_selected_point ->> 'longitude')::numeric not between -180 and 180
     or (target_selected_point ->> 'latitude')::numeric not between -90 and 90
     or pg_column_size(target_selected_point) > 4096 then
    raise exception using errcode = '22023', message = 'invalid selected point';
  end if;
  if (target_selected_feature_key is not null and length(target_selected_feature_key) > 500)
     or (target_analysis_mode is not null and length(target_analysis_mode) > 80)
     or (target_custom_query is not null and length(target_custom_query) > 8000)
     or (target_decision_posture is not null and length(target_decision_posture) > 160)
     or (target_confidence_level is not null and length(target_confidence_level) > 80)
     or (target_data_confidence_level is not null and length(target_data_confidence_level) > 80) then
    raise exception using errcode = '22023', message = 'bounded text field exceeded';
  end if;
  if jsonb_typeof(target_input_context) <> 'object'
     or jsonb_typeof(target_result_json) <> 'object'
     or jsonb_typeof(target_source_lineage) not in ('array', 'object')
     or pg_column_size(target_input_context) > 131072
     or pg_column_size(target_result_json) > 524288
     or pg_column_size(target_source_lineage) > 131072 then
    raise exception using errcode = '22023', message = 'invalid or oversized analysis JSON';
  end if;

  select project.id, project.organization_id, project.name
  into scope_project_id, scope_organization_id, scope_project_name
  from public.projects project
  join public.project_memberships project_membership
    on project_membership.project_id = project.id
   and project_membership.organization_id = project.organization_id
   and project_membership.project_key = project.project_key
  join public.organization_memberships organization_membership
    on organization_membership.organization_id = project.organization_id
   and organization_membership.profile_id = project_membership.user_id
  join public.organizations organization
    on organization.id = project.organization_id
  where project.project_key = target_project_key
    and project.status in ('active', 'demo')
    and organization.status = 'active'
    and project_membership.user_id = actor_profile_id
    and project_membership.status = 'active'
    and project_membership.role in ('owner', 'admin', 'analyst')
    and organization_membership.status = 'active'
  limit 1;

  if scope_project_id is null
     or not geoai_private.has_project_role(
       scope_project_id,
       array['owner', 'admin', 'analyst']::text[]
     ) then
    raise exception using errcode = '42501', message = 'project analysis access denied';
  end if;

  insert into public.analysis_runs (
    organization_id,
    project_id,
    project_key,
    project_name,
    run_key,
    scenario_id,
    selected_name,
    selected_type,
    selected_point,
    selected_feature_key,
    input_context,
    result_payload,
    result_json,
    source_lineage,
    decision_posture,
    confidence_level,
    data_confidence_level,
    analysis_mode,
    custom_query,
    created_by
  ) values (
    scope_organization_id,
    scope_project_id,
    target_project_key,
    scope_project_name,
    target_run_key,
    'point_to_object',
    target_selected_name,
    target_selected_type,
    target_selected_point,
    target_selected_feature_key,
    target_input_context,
    target_result_json,
    target_result_json,
    target_source_lineage,
    target_decision_posture,
    target_confidence_level,
    target_data_confidence_level,
    target_analysis_mode,
    target_custom_query,
    actor_profile_id
  )
  on conflict (run_key) do update set
    selected_name = excluded.selected_name,
    selected_type = excluded.selected_type,
    selected_point = excluded.selected_point,
    selected_feature_key = excluded.selected_feature_key,
    input_context = excluded.input_context,
    result_payload = excluded.result_payload,
    result_json = excluded.result_json,
    source_lineage = excluded.source_lineage,
    decision_posture = excluded.decision_posture,
    confidence_level = excluded.confidence_level,
    data_confidence_level = excluded.data_confidence_level,
    analysis_mode = excluded.analysis_mode,
    custom_query = excluded.custom_query,
    updated_at = now()
  where analysis_runs.scenario_id = 'point_to_object'
    and analysis_runs.project_id = scope_project_id
    and analysis_runs.created_by = actor_profile_id
  returning analysis_runs.* into saved;

  if saved.id is null then
    raise exception using errcode = '42501', message = 'analysis run ownership conflict';
  end if;

  return jsonb_build_object(
    'id', saved.id,
    'runKey', saved.run_key,
    'projectKey', saved.project_key,
    'createdAt', saved.created_at,
    'updatedAt', saved.updated_at
  );
end;
$$;

create or replace function geoai_private.list_point_object_analysis_runs(
  target_project_key text,
  target_limit integer default 10
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
     or target_project_key !~ '^[A-Za-z0-9]([A-Za-z0-9._:-]{0,126}[A-Za-z0-9])?$' then
    raise exception using errcode = '22023', message = 'invalid project key';
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
     or not geoai_private.has_project_role(
       scope_project_id,
       array['owner', 'admin', 'analyst', 'viewer']::text[]
     ) then
    raise exception using errcode = '42501', message = 'project analysis access denied';
  end if;

  bounded_limit := least(greatest(coalesce(target_limit, 10), 1), 50);
  select coalesce(jsonb_agg(to_jsonb(history) order by history.created_at desc), '[]'::jsonb)
  into result
  from (
    select
      analysis.id,
      analysis.run_key as "runKey",
      analysis.project_key as "projectKey",
      analysis.selected_name as "selectedName",
      analysis.selected_type as "selectedType",
      analysis.selected_point as "selectedPoint",
      analysis.selected_feature_key as "selectedFeatureKey",
      analysis.result_json as "resultJson",
      analysis.source_lineage as "sourceLineage",
      analysis.analysis_mode as "analysisMode",
      analysis.custom_query as "customQuery",
      analysis.created_at,
      analysis.updated_at
    from public.analysis_runs analysis
    where analysis.project_id = scope_project_id
      and analysis.created_by = actor_profile_id
      and analysis.scenario_id = 'point_to_object'
    order by analysis.created_at desc
    limit bounded_limit
  ) history;

  return result;
end;
$$;

create or replace function api.upsert_point_object_analysis_run(
  target_project_key text,
  target_run_key text,
  target_selected_name text,
  target_selected_type text,
  target_selected_point jsonb,
  target_selected_feature_key text default null,
  target_input_context jsonb default '{}'::jsonb,
  target_result_json jsonb default '{}'::jsonb,
  target_source_lineage jsonb default '[]'::jsonb,
  target_analysis_mode text default null,
  target_custom_query text default null,
  target_decision_posture text default null,
  target_confidence_level text default null,
  target_data_confidence_level text default null
)
returns jsonb
language sql
volatile
security invoker
set search_path = ''
as $$
  select geoai_private.upsert_point_object_analysis_run(
    target_project_key,
    target_run_key,
    target_selected_name,
    target_selected_type,
    target_selected_point,
    target_selected_feature_key,
    target_input_context,
    target_result_json,
    target_source_lineage,
    target_analysis_mode,
    target_custom_query,
    target_decision_posture,
    target_confidence_level,
    target_data_confidence_level
  )
$$;

create or replace function api.list_point_object_analysis_runs(
  target_project_key text,
  target_limit integer default 10
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select geoai_private.list_point_object_analysis_runs(target_project_key, target_limit)
$$;

revoke all on function geoai_private.upsert_point_object_analysis_run(
  text, text, text, text, jsonb, text, jsonb, jsonb, jsonb, text, text, text, text, text
) from public, anon, authenticated, service_role;
revoke all on function geoai_private.list_point_object_analysis_runs(text, integer)
  from public, anon, authenticated, service_role;
revoke all on function api.upsert_point_object_analysis_run(
  text, text, text, text, jsonb, text, jsonb, jsonb, jsonb, text, text, text, text, text
) from public, anon, authenticated, service_role;
revoke all on function api.list_point_object_analysis_runs(text, integer)
  from public, anon, authenticated, service_role;

grant execute on function geoai_private.upsert_point_object_analysis_run(
  text, text, text, text, jsonb, text, jsonb, jsonb, jsonb, text, text, text, text, text
) to authenticated;
grant execute on function geoai_private.list_point_object_analysis_runs(text, integer)
  to authenticated;
grant execute on function api.upsert_point_object_analysis_run(
  text, text, text, text, jsonb, text, jsonb, jsonb, jsonb, text, text, text, text, text
) to authenticated;
grant execute on function api.list_point_object_analysis_runs(text, integer)
  to authenticated;

comment on function api.upsert_point_object_analysis_run(
  text, text, text, text, jsonb, text, jsonb, jsonb, jsonb, text, text, text, text, text
) is 'Caller-bound point-to-object Preview persistence. Project, organization and creator ownership are derived from the verified Auth principal.';
comment on function api.list_point_object_analysis_runs(text, integer)
is 'Caller-owned point-to-object analysis history for one exact active project membership.';

commit;
