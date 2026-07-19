-- GeoAI Storage Buckets v1
-- Applied to geoai-dev / pphdqkurxneyagvnnjdt on 2026-07-08.
-- Purpose: create private Supabase Storage buckets required for evidence, data-room assets, report exports and AOI imports.
-- This does not enable production-ready or pilot-ready secure storage by itself.

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
    array[
      'application/pdf',
      'application/json',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
  ),
  (
    'geoai-aoi-imports',
    'geoai-aoi-imports',
    false,
    5242880,
    array[
      'application/json',
      'application/geo+json',
      'text/csv'
    ]
  )
on conflict (id) do update set
  name = excluded.name,
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types,
  updated_at = now();
