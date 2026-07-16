-- GeoAI Secure File Storage & Evidence Uploads v2.6
-- Draft only unless applied from a trusted operator environment.
-- Buckets are private by default. Do not make evidence buckets public.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'geoai-data-room-assets',
    'geoai-data-room-assets',
    false,
    5242880,
    array[
      'application/pdf',
      'text/csv',
      'application/json',
      'application/geo+json',
      'image/png',
      'image/jpeg',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
  ),
  (
    'geoai-validation-evidence',
    'geoai-validation-evidence',
    false,
    5242880,
    array[
      'application/pdf',
      'text/csv',
      'application/json',
      'application/geo+json',
      'image/png',
      'image/jpeg',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
  ),
  (
    'geoai-report-exports',
    'geoai-report-exports',
    false,
    5242880,
    array['application/pdf', 'text/html', 'application/json']
  ),
  (
    'geoai-aoi-imports',
    'geoai-aoi-imports',
    false,
    5242880,
    array['application/geo+json', 'application/json']
  )
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Folder convention:
-- org/{organizationId}/project/{projectId}/validation/{evidenceId}/{fileId}-{safeFileName}
-- org/{organizationId}/project/{projectId}/data-room/{assetId}/{fileId}-{safeFileName}
-- demo/project/{projectKey}/validation/{evidenceId}/{fileId}-{safeFileName}

-- RLS policy draft. This assumes project_memberships and auth.uid() are active.
-- Do not rely on these policies until Supabase Auth, project memberships and RLS tests are configured.

drop policy if exists "GeoAI project evidence upload" on storage.objects;
drop policy if exists "GeoAI project evidence read" on storage.objects;
drop policy if exists "GeoAI project evidence delete" on storage.objects;

create policy "GeoAI project evidence upload"
on storage.objects
for insert
to authenticated
with check (
  bucket_id in ('geoai-data-room-assets', 'geoai-validation-evidence', 'geoai-report-exports', 'geoai-aoi-imports')
  and (
    auth.role() = 'service_role'
    or exists (
      select 1
      from public.project_memberships pm
      where pm.user_id = auth.uid()
        and pm.project_id::text = split_part(name, '/', 4)
        and pm.role in ('owner', 'admin', 'editor')
    )
  )
);

create policy "GeoAI project evidence read"
on storage.objects
for select
to authenticated
using (
  bucket_id in ('geoai-data-room-assets', 'geoai-validation-evidence', 'geoai-report-exports', 'geoai-aoi-imports')
  and (
    auth.role() = 'service_role'
    or exists (
      select 1
      from public.project_memberships pm
      where pm.user_id = auth.uid()
        and pm.project_id::text = split_part(name, '/', 4)
        and pm.role in ('owner', 'admin', 'editor', 'viewer', 'client')
    )
  )
);

create policy "GeoAI project evidence delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id in ('geoai-data-room-assets', 'geoai-validation-evidence', 'geoai-report-exports', 'geoai-aoi-imports')
  and (
    auth.role() = 'service_role'
    or exists (
      select 1
      from public.project_memberships pm
      where pm.user_id = auth.uid()
        and pm.project_id::text = split_part(name, '/', 4)
        and pm.role in ('owner', 'admin')
    )
  )
);
