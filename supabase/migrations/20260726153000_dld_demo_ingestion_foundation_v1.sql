-- DLD demo ingestion foundation v1.
-- Approved for geoai-dev demo ingestion only. This migration does not activate
-- Production, public Product APIs, credentials, or source-dependent scoring.

create schema if not exists geoai_dld_private;
create schema if not exists geoai_dld_feature;

revoke all on schema geoai_dld_private from public, anon, authenticated, service_role;
revoke all on schema geoai_dld_feature from public, anon, authenticated, service_role;

comment on schema geoai_dld_private is
  'Restricted DLD/Dubai Pulse demo ingestion facts, dimensions and receipts. Not exposed through the public Data API.';
comment on schema geoai_dld_feature is
  'Privacy-minimized DLD demo feature mart. Product activation requires a separate approved API and scoring change.';

create table if not exists geoai_dld_private.ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  run_key text not null unique,
  permission_scope text not null check (permission_scope in ('demo_only')),
  permission_receipt_ref text not null,
  catalog_version text not null,
  started_at timestamptz not null,
  finished_at timestamptz,
  selected_dataset_count integer not null check (selected_dataset_count >= 0),
  parsed_dataset_count integer not null default 0 check (parsed_dataset_count >= 0),
  failed_dataset_count integer not null default 0 check (failed_dataset_count >= 0),
  total_rows_parsed bigint not null default 0 check (total_rows_parsed >= 0),
  total_bytes_parsed bigint not null default 0 check (total_bytes_parsed >= 0),
  manifest jsonb not null default '{}'::jsonb,
  status text not null check (status in ('running','completed','completed_with_warnings','failed')),
  caveat text not null,
  created_at timestamptz not null default now()
);

create table if not exists geoai_dld_private.dataset_releases (
  id uuid primary key default gen_random_uuid(),
  ingestion_run_id uuid not null references geoai_dld_private.ingestion_runs(id) on delete restrict,
  dataset_id text not null,
  source_family text not null,
  source_url text not null,
  final_url text,
  observed_file_name text,
  permission_scope text not null check (permission_scope in ('demo_only')),
  permission_receipt_ref text not null,
  retrieved_at timestamptz not null,
  source_updated_at timestamptz,
  byte_size bigint not null check (byte_size >= 0),
  content_sha256 char(64) not null check (content_sha256 ~ '^[0-9a-f]{64}$'),
  record_count bigint not null check (record_count >= 0),
  malformed_row_count bigint not null default 0 check (malformed_row_count >= 0),
  min_observation_month date,
  max_observation_month date,
  parse_status text not null check (parse_status in ('accepted_for_demo_aggregation','warning','rejected')),
  raw_snapshot_retained boolean not null default false,
  schema_summary jsonb not null default '{}'::jsonb,
  quality_summary jsonb not null default '{}'::jsonb,
  caveat text not null,
  created_at timestamptz not null default now(),
  unique (dataset_id, content_sha256)
);

create index if not exists idx_dld_dataset_releases_dataset_time
  on geoai_dld_private.dataset_releases(dataset_id, retrieved_at desc);
create index if not exists idx_dld_dataset_releases_run
  on geoai_dld_private.dataset_releases(ingestion_run_id);

create table if not exists geoai_dld_private.areas (
  dataset_release_id uuid not null references geoai_dld_private.dataset_releases(id) on delete restrict,
  dataset_id text not null,
  stable_area_key text not null,
  source_area_id text,
  source_area_name text,
  record_count bigint not null default 0 check (record_count >= 0),
  loaded_at timestamptz not null default now(),
  primary key (dataset_release_id, stable_area_key)
);

create index if not exists idx_dld_areas_source_id
  on geoai_dld_private.areas(source_area_id);
create index if not exists idx_dld_areas_source_name
  on geoai_dld_private.areas(lower(source_area_name));

create table if not exists geoai_dld_private.sanitized_records (
  dataset_release_id uuid not null references geoai_dld_private.dataset_releases(id) on delete restrict,
  dataset_id text not null,
  source_row_hash char(64) not null check (source_row_hash ~ '^[0-9a-f]{64}$'),
  fields jsonb not null,
  loaded_at timestamptz not null default now(),
  primary key (dataset_release_id, source_row_hash)
);

create index if not exists idx_dld_sanitized_records_dataset
  on geoai_dld_private.sanitized_records(dataset_id);
create index if not exists idx_dld_sanitized_records_fields
  on geoai_dld_private.sanitized_records using gin(fields jsonb_path_ops);

create table if not exists geoai_dld_feature.area_month_metrics (
  dataset_release_id uuid not null references geoai_dld_private.dataset_releases(id) on delete restrict,
  dataset_id text not null,
  source_family text not null,
  stable_area_key text not null,
  source_area_id text,
  source_area_name text,
  observation_month date,
  period_key text not null,
  record_count bigint not null default 0 check (record_count >= 0),
  amount_count bigint not null default 0 check (amount_count >= 0),
  amount_total numeric(28,2),
  amount_average numeric(28,4),
  size_count bigint not null default 0 check (size_count >= 0),
  size_total numeric(28,4),
  size_average numeric(28,4),
  amount_per_area_count bigint not null default 0 check (amount_per_area_count >= 0),
  amount_per_area_average numeric(28,4),
  method_version text not null default 'dld-demo-generic-aggregate-v2',
  confidence numeric(8,6) not null default 0.65 check (confidence between 0 and 1),
  caveat text not null,
  generated_at timestamptz not null default now(),
  primary key (dataset_release_id, stable_area_key, period_key, method_version)
);

create index if not exists idx_dld_area_month_dataset_area_time
  on geoai_dld_feature.area_month_metrics(dataset_id, stable_area_key, observation_month);
create index if not exists idx_dld_area_month_source_area
  on geoai_dld_feature.area_month_metrics(source_area_id, observation_month);

create table if not exists geoai_dld_feature.category_metrics (
  dataset_release_id uuid not null references geoai_dld_private.dataset_releases(id) on delete restrict,
  dataset_id text not null,
  source_family text not null,
  category_kind text not null check (category_kind in ('property_type','event_type')),
  category_value text not null,
  record_count bigint not null check (record_count >= 0),
  method_version text not null default 'dld-demo-category-v1',
  caveat text not null,
  generated_at timestamptz not null default now(),
  primary key (dataset_release_id, category_kind, category_value, method_version)
);

create table if not exists geoai_dld_feature.scoring_features (
  feature_id uuid primary key default gen_random_uuid(),
  stable_area_key text not null,
  source_area_id text,
  source_area_name text,
  feature_date date not null,
  feature_code text not null,
  feature_value numeric(28,6),
  normalized_value numeric(8,6) check (normalized_value is null or normalized_value between 0 and 1),
  confidence numeric(8,6) not null check (confidence between 0 and 1),
  source_release_ids uuid[] not null check (cardinality(source_release_ids) > 0),
  method_version text not null,
  activation_status text not null default 'prepared_demo_only'
    check (activation_status in ('prepared_demo_only','approved_demo_scoring','retired')),
  limitations jsonb not null default '[]'::jsonb,
  caveat text not null,
  generated_at timestamptz not null default now(),
  unique (stable_area_key, feature_date, feature_code, method_version)
);

create index if not exists idx_dld_scoring_features_area_date
  on geoai_dld_feature.scoring_features(stable_area_key, feature_date desc);
create index if not exists idx_dld_scoring_features_code_date
  on geoai_dld_feature.scoring_features(feature_code, feature_date desc);

alter table geoai_dld_private.ingestion_runs enable row level security;
alter table geoai_dld_private.dataset_releases enable row level security;
alter table geoai_dld_private.areas enable row level security;
alter table geoai_dld_private.sanitized_records enable row level security;
alter table geoai_dld_feature.area_month_metrics enable row level security;
alter table geoai_dld_feature.category_metrics enable row level security;
alter table geoai_dld_feature.scoring_features enable row level security;

revoke all on all tables in schema geoai_dld_private from public, anon, authenticated, service_role;
revoke all on all tables in schema geoai_dld_feature from public, anon, authenticated, service_role;
revoke all on all sequences in schema geoai_dld_private from public, anon, authenticated, service_role;
revoke all on all sequences in schema geoai_dld_feature from public, anon, authenticated, service_role;

comment on table geoai_dld_private.dataset_releases is
  'Immutable-style DLD demo release receipts and quality metadata. Raw files are not represented as retained unless separate Storage custody is proven.';
comment on table geoai_dld_private.sanitized_records is
  'PII/contact-excluded records for small approved demo datasets only. No public Product grants.';
comment on table geoai_dld_feature.area_month_metrics is
  'Generic all-row DLD demo aggregates by source area and month. Not a valuation or legal conclusion.';
comment on table geoai_dld_feature.scoring_features is
  'Prepared demo-only DLD feature mart. Runtime scoring activation requires a separate approved change.';
