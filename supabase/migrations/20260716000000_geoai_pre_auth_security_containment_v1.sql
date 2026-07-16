-- GeoAI pre-Auth security containment v1
-- Prepared for review only. Do not apply without an approved clean-replay,
-- rollback and live RLS verification plan.

-- Historical prototype tables can be created by a clean replay before the
-- canonical pilot schema. Keep them inaccessible until they are reconciled or
-- retired by the canonical migration-chain work package.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'sources',
    'spatial_layers',
    'spatial_features',
    'market_areas',
    'market_metrics',
    'uploaded_dataset_records'
  ]
  loop
    if to_regclass(format('public.%I', table_name)) is not null then
      execute format('alter table public.%I enable row level security', table_name);
      execute format('revoke all on table public.%I from anon, authenticated', table_name);
    end if;
  end loop;
end;
$$;

-- SECURITY DEFINER helpers are internal RLS primitives. Anonymous callers do
-- not need direct EXECUTE privileges, and PUBLIC must not inherit them.
revoke execute on function public.geoai_current_profile_id() from public, anon;
revoke execute on function public.geoai_has_organization_access(uuid) from public, anon;
revoke execute on function public.geoai_has_project_access(uuid, text) from public, anon;
grant execute on function public.geoai_current_profile_id() to authenticated;
grant execute on function public.geoai_has_organization_access(uuid) to authenticated;
grant execute on function public.geoai_has_project_access(uuid, text) to authenticated;

-- Nullable project scope is not a public-visibility model. Remove both the
-- original member/global policies and the later Preview policies, then expose
-- only records explicitly tied to seeded demo projects. A canonical visibility
-- column and private-member policies belong to DB-01.
drop policy if exists "geoai source snapshots read" on public.source_registry_snapshots;
drop policy if exists "geoai external snapshots read" on public.external_data_snapshots;
drop policy if exists "geoai preview demo source snapshots read" on public.source_registry_snapshots;
drop policy if exists "geoai preview demo external snapshots read" on public.external_data_snapshots;

create policy "geoai explicit demo source snapshots read"
on public.source_registry_snapshots
for select
to anon, authenticated
using (
  exists (
    select 1 from public.projects p
    where p.id = source_registry_snapshots.project_id
      and p.project_key = source_registry_snapshots.project_key
      and p.project_key in (
      'dubai-investment-screening-demo',
      'developer-land-pipeline-demo',
      'bank-asset-review-demo',
      'home-buyer-neighborhood-demo',
      'family-relocation-area-demo'
      )
      and p.data_mode = 'demo_normalized'
  )
);

create policy "geoai explicit demo external snapshots read"
on public.external_data_snapshots
for select
to anon, authenticated
using (
  exists (
    select 1 from public.projects p
    where p.id = external_data_snapshots.project_id
      and p.project_key = external_data_snapshots.project_key
      and p.project_key in (
      'dubai-investment-screening-demo',
      'developer-land-pipeline-demo',
      'bank-asset-review-demo',
      'home-buyer-neighborhood-demo',
      'family-relocation-area-demo'
      )
      and p.data_mode = 'demo_normalized'
  )
);

-- Replace the historical draft Storage policies. Membership user_id points to
-- profiles.id, while auth.uid() points to profiles.auth_user_id. Object scope
-- is derived from the protected org/{orgId}/project/{projectId}/... path.
drop policy if exists "GeoAI project evidence upload" on storage.objects;
drop policy if exists "GeoAI project evidence read" on storage.objects;
drop policy if exists "GeoAI project evidence delete" on storage.objects;

create policy "GeoAI project evidence upload"
on storage.objects
for insert
to authenticated
with check (
  bucket_id in ('geoai-data-room-assets', 'geoai-validation-evidence', 'geoai-report-exports', 'geoai-aoi-imports')
  and split_part(name, '/', 1) = 'org'
  and split_part(name, '/', 3) = 'project'
  and exists (
    select 1
    from public.project_memberships pm
    join public.profiles p on p.id = pm.user_id
    where p.auth_user_id = auth.uid()
      and pm.status = 'active'
      and pm.organization_id::text = split_part(name, '/', 2)
      and pm.project_id::text = split_part(name, '/', 4)
      and pm.role in ('owner', 'admin', 'analyst')
  )
);

create policy "GeoAI project evidence read"
on storage.objects
for select
to authenticated
using (
  bucket_id in ('geoai-data-room-assets', 'geoai-validation-evidence', 'geoai-report-exports', 'geoai-aoi-imports')
  and split_part(name, '/', 1) = 'org'
  and split_part(name, '/', 3) = 'project'
  and exists (
    select 1
    from public.project_memberships pm
    join public.profiles p on p.id = pm.user_id
    where p.auth_user_id = auth.uid()
      and pm.status = 'active'
      and pm.organization_id::text = split_part(name, '/', 2)
      and pm.project_id::text = split_part(name, '/', 4)
      and pm.role in ('owner', 'admin', 'analyst', 'viewer', 'client_viewer')
  )
);

create policy "GeoAI project evidence delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id in ('geoai-data-room-assets', 'geoai-validation-evidence', 'geoai-report-exports', 'geoai-aoi-imports')
  and split_part(name, '/', 1) = 'org'
  and split_part(name, '/', 3) = 'project'
  and exists (
    select 1
    from public.project_memberships pm
    join public.profiles p on p.id = pm.user_id
    where p.auth_user_id = auth.uid()
      and pm.status = 'active'
      and pm.organization_id::text = split_part(name, '/', 2)
      and pm.project_id::text = split_part(name, '/', 4)
      and pm.role in ('owner', 'admin')
  )
);

comment on policy "GeoAI project evidence upload" on storage.objects is
  'Prepared pre-Auth policy; requires live positive/negative user-context verification before activation.';
