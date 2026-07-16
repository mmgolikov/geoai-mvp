-- GeoAI Storage policy owner-path draft
-- REVIEW ONLY. This file is intentionally outside supabase/migrations.
-- Execute only through a Supabase-supported storage.objects owner path after
-- DB-01 clean replay, approved rollback and positive/negative Auth evidence.

-- Membership user_id points to profiles.id, while auth.uid() points to
-- profiles.auth_user_id. Object scope is derived from the protected
-- org/{orgId}/project/{projectId}/... path.
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
    join public.projects project
      on project.id = pm.project_id
     and project.organization_id = pm.organization_id
    where p.auth_user_id = auth.uid()
      and p.status = 'active'
      and pm.status = 'active'
      and project.organization_id::text = split_part(name, '/', 2)
      and project.id::text = split_part(name, '/', 4)
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
    join public.projects project
      on project.id = pm.project_id
     and project.organization_id = pm.organization_id
    where p.auth_user_id = auth.uid()
      and p.status = 'active'
      and pm.status = 'active'
      and project.organization_id::text = split_part(name, '/', 2)
      and project.id::text = split_part(name, '/', 4)
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
    join public.projects project
      on project.id = pm.project_id
     and project.organization_id = pm.organization_id
    where p.auth_user_id = auth.uid()
      and p.status = 'active'
      and pm.status = 'active'
      and project.organization_id::text = split_part(name, '/', 2)
      and project.id::text = split_part(name, '/', 4)
      and pm.role in ('owner', 'admin')
  )
);

comment on policy "GeoAI project evidence upload" on storage.objects is
  'Prepared pre-Auth policy; requires live positive/negative user-context verification before activation.';
