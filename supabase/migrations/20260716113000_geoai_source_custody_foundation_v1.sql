-- SOURCE-01: immutable, tenant-scoped source custody foundation.
-- This migration does not connect a provider or expose write APIs. It replaces
-- mutable snapshot rows as the future authority for acquired source releases.

create table if not exists public.source_catalog (
  source_id text primary key,
  display_name text not null,
  provider_name text,
  source_category text not null,
  access_mode text not null,
  data_classification text not null default 'restricted'
    check (data_classification in ('public_open', 'licensed', 'client_confidential', 'restricted')),
  license_uri text,
  terms_reviewed_at timestamptz,
  catalog_status text not null default 'registered_unverified'
    check (catalog_status in ('registered_unverified', 'approved', 'suspended', 'retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint source_catalog_source_id_format
    check (source_id ~ '^[a-z0-9][a-z0-9._-]{2,127}$')
);

insert into public.source_catalog (
  source_id,
  display_name,
  source_category,
  access_mode,
  data_classification,
  catalog_status
)
select
  snapshot.source_id,
  coalesce(max(snapshot.source_name), snapshot.source_id),
  coalesce(max(snapshot.category), 'unclassified'),
  coalesce(max(snapshot.access_mode), 'unknown'),
  'restricted',
  'registered_unverified'
from public.source_registry_snapshots snapshot
where snapshot.source_id is not null
group by snapshot.source_id
on conflict (source_id) do nothing;

create table if not exists public.source_releases (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  project_id uuid not null,
  project_key text not null,
  source_id text not null references public.source_catalog(source_id) on delete restrict,
  release_version text not null,
  schema_version text not null,
  content_sha256 text not null,
  record_count bigint not null,
  extracted_at timestamptz not null,
  released_at timestamptz not null default now(),
  created_by uuid not null references public.profiles(id) on delete restrict,
  quality_summary jsonb not null default '{}'::jsonb,
  lineage_summary jsonb not null default '{}'::jsonb,
  caveat text not null,
  created_at timestamptz not null default now(),
  constraint source_releases_project_scope_fkey
    foreign key (project_id, organization_id, project_key)
    references public.projects(id, organization_id, project_key)
    on delete restrict,
  constraint source_releases_creator_membership_fkey
    foreign key (organization_id, created_by)
    references public.organization_memberships(organization_id, profile_id)
    on delete restrict,
  constraint source_releases_creator_project_membership_fkey
    foreign key (project_id, created_by)
    references public.project_memberships(project_id, user_id)
    on delete restrict,
  constraint source_releases_content_sha256_format
    check (content_sha256 ~ '^[0-9a-f]{64}$'),
  constraint source_releases_record_count_nonnegative
    check (record_count >= 0),
  constraint source_releases_source_version_key
    unique (organization_id, project_id, source_id, release_version),
  constraint source_releases_id_scope_key
    unique (id, organization_id, project_id, project_key)
);

create table if not exists public.source_artifacts (
  id uuid primary key default gen_random_uuid(),
  source_release_id uuid not null,
  organization_id uuid not null,
  project_id uuid not null,
  project_key text not null,
  artifact_kind text not null
    check (artifact_kind in ('raw', 'normalized', 'manifest', 'quality_report', 'schema', 'lineage')),
  storage_bucket text not null,
  storage_object_path text not null,
  content_sha256 text not null,
  byte_size bigint not null,
  media_type text not null,
  source_uri_sha256 text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint source_artifacts_release_scope_fkey
    foreign key (source_release_id, organization_id, project_id, project_key)
    references public.source_releases(id, organization_id, project_id, project_key)
    on delete restrict,
  constraint source_artifacts_creator_membership_fkey
    foreign key (organization_id, created_by)
    references public.organization_memberships(organization_id, profile_id)
    on delete restrict,
  constraint source_artifacts_creator_project_membership_fkey
    foreign key (project_id, created_by)
    references public.project_memberships(project_id, user_id)
    on delete restrict,
  constraint source_artifacts_content_sha256_format
    check (content_sha256 ~ '^[0-9a-f]{64}$'),
  constraint source_artifacts_source_uri_sha256_format
    check (source_uri_sha256 is null or source_uri_sha256 ~ '^[0-9a-f]{64}$'),
  constraint source_artifacts_byte_size_nonnegative
    check (byte_size >= 0),
  constraint source_artifacts_object_path_safe
    check (
      storage_object_path !~ '(^|/)\.\.(/|$)'
      and storage_object_path !~ '^/'
      and storage_object_path !~ '[[:cntrl:]]'
    ),
  constraint source_artifacts_release_kind_hash_key
    unique (source_release_id, artifact_kind, content_sha256)
);

create table if not exists public.source_release_status_events (
  id uuid primary key default gen_random_uuid(),
  source_release_id uuid not null,
  organization_id uuid not null,
  project_id uuid not null,
  project_key text not null,
  status text not null check (status in ('sealed', 'quarantined', 'revoked')),
  reason_code text not null,
  actor_profile_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint source_release_status_events_release_scope_fkey
    foreign key (source_release_id, organization_id, project_id, project_key)
    references public.source_releases(id, organization_id, project_id, project_key)
    on delete restrict,
  constraint source_release_status_events_actor_membership_fkey
    foreign key (organization_id, actor_profile_id)
    references public.organization_memberships(organization_id, profile_id)
    on delete restrict,
  constraint source_release_status_events_actor_project_membership_fkey
    foreign key (project_id, actor_profile_id)
    references public.project_memberships(project_id, user_id)
    on delete restrict
);

create table if not exists public.source_ingestion_receipts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  project_id uuid not null,
  project_key text not null,
  source_id text not null references public.source_catalog(source_id) on delete restrict,
  idempotency_key text not null,
  outcome text not null check (outcome in ('succeeded', 'failed', 'quarantined')),
  source_release_id uuid references public.source_releases(id) on delete restrict,
  request_sha256 text not null,
  error_code text,
  started_at timestamptz not null,
  finished_at timestamptz not null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint source_ingestion_receipts_project_scope_fkey
    foreign key (project_id, organization_id, project_key)
    references public.projects(id, organization_id, project_key)
    on delete restrict,
  constraint source_ingestion_receipts_creator_membership_fkey
    foreign key (organization_id, created_by)
    references public.organization_memberships(organization_id, profile_id)
    on delete restrict,
  constraint source_ingestion_receipts_creator_project_membership_fkey
    foreign key (project_id, created_by)
    references public.project_memberships(project_id, user_id)
    on delete restrict,
  constraint source_ingestion_receipts_release_scope_fkey
    foreign key (source_release_id, organization_id, project_id, project_key)
    references public.source_releases(id, organization_id, project_id, project_key)
    on delete restrict,
  constraint source_ingestion_receipts_request_sha256_format
    check (request_sha256 ~ '^[0-9a-f]{64}$'),
  constraint source_ingestion_receipts_time_order
    check (finished_at >= started_at),
  constraint source_ingestion_receipts_outcome_release_check
    check (
      (outcome = 'succeeded' and source_release_id is not null and error_code is null)
      or (outcome in ('failed', 'quarantined') and error_code is not null)
    ),
  constraint source_ingestion_receipts_idempotency_key
    unique (organization_id, project_id, source_id, idempotency_key)
);

create index if not exists idx_source_releases_project_time
  on public.source_releases(project_id, released_at desc, id desc);
create index if not exists idx_source_artifacts_release
  on public.source_artifacts(source_release_id, artifact_kind);
create index if not exists idx_source_release_status_events_release_time
  on public.source_release_status_events(source_release_id, created_at desc, id desc);
create index if not exists idx_source_ingestion_receipts_project_time
  on public.source_ingestion_receipts(project_id, finished_at desc, id desc);

alter table public.source_catalog enable row level security;
alter table public.source_releases enable row level security;
alter table public.source_artifacts enable row level security;
alter table public.source_release_status_events enable row level security;
alter table public.source_ingestion_receipts enable row level security;

revoke all on table public.source_catalog from public, anon, authenticated, service_role;
revoke all on table public.source_releases from public, anon, authenticated, service_role;
revoke all on table public.source_artifacts from public, anon, authenticated, service_role;
revoke all on table public.source_release_status_events from public, anon, authenticated, service_role;
revoke all on table public.source_ingestion_receipts from public, anon, authenticated, service_role;

create or replace function geoai_private.reject_source_custody_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'source custody rows are append-only'
    using errcode = '55000';
end;
$$;

revoke all on function geoai_private.reject_source_custody_mutation()
  from public, anon, authenticated, service_role;

create trigger source_releases_immutable
before update or delete on public.source_releases
for each row execute function geoai_private.reject_source_custody_mutation();

create trigger source_artifacts_immutable
before update or delete on public.source_artifacts
for each row execute function geoai_private.reject_source_custody_mutation();

create trigger source_release_status_events_immutable
before update or delete on public.source_release_status_events
for each row execute function geoai_private.reject_source_custody_mutation();

create trigger source_ingestion_receipts_immutable
before update or delete on public.source_ingestion_receipts
for each row execute function geoai_private.reject_source_custody_mutation();

create or replace function api.current_source_releases(
  target_project_key text,
  page_size integer default 25,
  before_released_at timestamptz default null,
  before_release_id uuid default null
)
returns table (
  release_id uuid,
  source_id text,
  display_name text,
  source_category text,
  release_version text,
  schema_version text,
  content_sha256 text,
  record_count bigint,
  extracted_at timestamptz,
  released_at timestamptz,
  effective_status text,
  quality_summary jsonb,
  lineage_summary jsonb,
  caveat text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    release.id,
    release.source_id,
    catalog.display_name,
    catalog.source_category,
    release.release_version,
    release.schema_version,
    release.content_sha256,
    release.record_count,
    release.extracted_at,
    release.released_at,
    coalesce(status_event.status, 'sealed'),
    release.quality_summary,
    release.lineage_summary,
    release.caveat
  from public.source_releases release
  join public.source_catalog catalog on catalog.source_id = release.source_id
  join public.projects project on project.id = release.project_id
  join lateral (
    select access.project_role
    from api.current_project_access(target_project_key) access
    where access.project_id = release.project_id
      and access.project_role in ('owner', 'admin', 'analyst', 'viewer')
    limit 1
  ) access on true
  left join lateral (
    select event.status
    from public.source_release_status_events event
    where event.source_release_id = release.id
    order by event.created_at desc, event.id desc
    limit 1
  ) status_event on true
  where target_project_key is not null
    and catalog.catalog_status = 'approved'
    and project.project_key = target_project_key
    and (
      before_released_at is null
      or (release.released_at, release.id) < (
        before_released_at,
        coalesce(before_release_id, 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid)
      )
    )
  order by release.released_at desc, release.id desc
  limit least(greatest(coalesce(page_size, 25), 1), 100)
$$;

revoke all on function api.current_source_releases(text, integer, timestamptz, uuid)
  from public, anon, authenticated, service_role;
grant execute on function api.current_source_releases(text, integer, timestamptz, uuid)
  to authenticated;

comment on table public.source_releases is
  'Immutable tenant-scoped acquired-source releases. Direct Data API grants remain closed.';
comment on table public.source_artifacts is
  'Immutable artifact custody metadata. Object paths are never returned by the public read RPC.';
comment on function api.current_source_releases(text, integer, timestamptz, uuid) is
  'Bounded caller-scoped release metadata; no object path, secret, or client_viewer access.';
