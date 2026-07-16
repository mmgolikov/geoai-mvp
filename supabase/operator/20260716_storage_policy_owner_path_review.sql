-- GeoAI Storage policy owner-path draft
-- REVIEW ONLY. This file is intentionally outside supabase/migrations.
-- Execute only through a Supabase-supported storage.objects owner path after
-- DB-01 clean replay, approved rollback and positive/negative Auth evidence.

-- Membership user_id points to profiles.id, while auth.uid() points to
-- profiles.auth_user_id. Object scope is derived from the protected
-- org/{orgId}/project/{projectId}/... path.
-- SELECT is operation-aware: authenticated object fetch/signing is allowed,
-- while bucket listing remains denied. client_viewer is deliberately excluded
-- until a reviewed audience-aware delivery RPC exists.
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
  and owner_id = (select auth.uid())::text
  and geoai_private.has_storage_project_role(
    split_part(name, '/', 2),
    split_part(name, '/', 4),
    array['owner', 'admin', 'analyst']::text[]
  )
);

create policy "GeoAI project evidence read"
on storage.objects
for select
to authenticated
using (
  bucket_id in ('geoai-data-room-assets', 'geoai-validation-evidence', 'geoai-report-exports', 'geoai-aoi-imports')
  and storage.allow_any_operation(array[
    'object.get_authenticated_info',
    'object.get_authenticated',
    'object.sign'
  ])
  and split_part(name, '/', 1) = 'org'
  and split_part(name, '/', 3) = 'project'
  and geoai_private.has_storage_project_role(
    split_part(name, '/', 2),
    split_part(name, '/', 4),
    array['owner', 'admin', 'analyst', 'viewer']::text[]
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
  and geoai_private.has_storage_project_role(
    split_part(name, '/', 2),
    split_part(name, '/', 4),
    array['owner', 'admin']::text[]
  )
);

comment on policy "GeoAI project evidence upload" on storage.objects is
  'Prepared pre-Auth policy; requires live positive/negative user-context verification before activation.';
