create extension if not exists postgis;
create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.sources (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique,
  name text not null,
  provider text not null,
  geography text not null default 'Dubai, UAE',
  category text not null,
  source_type text not null check (source_type in ('mock', 'open_data', 'official', 'commercial', 'customer')),
  integration_status text not null check (integration_status in ('connected', 'planned', 'mock', 'unavailable')),
  reliability_level text not null check (reliability_level in ('demo', 'low', 'medium', 'high')),
  used_in_current_prototype boolean not null default false,
  planned_for_pilot boolean not null default true,
  decision_grade boolean not null default false,
  license_note text,
  access_note text,
  usage_in_geoai text,
  limitations text,
  recommended_next_step text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.spatial_layers (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.sources(id) on delete set null,
  layer_key text not null unique,
  name text not null,
  geometry_type text not null,
  status text not null default 'mock',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.spatial_features (
  id uuid primary key default gen_random_uuid(),
  layer_id uuid not null references public.spatial_layers(id) on delete cascade,
  feature_key text not null,
  name text not null,
  category text,
  subtype text,
  confidence_level text,
  geometry geometry(Geometry, 4326),
  centroid geometry(Point, 4326) generated always as (st_centroid(geometry)) stored,
  area_sq_m numeric generated always as (
    case
      when geometry is not null and geometrytype(geometry) in ('POLYGON', 'MULTIPOLYGON')
      then st_area(geometry::geography)
      else null
    end
  ) stored,
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(layer_id, feature_key)
);

create table if not exists public.market_areas (
  id uuid primary key default gen_random_uuid(),
  area_key text not null unique,
  name text not null,
  geography text not null default 'Dubai, UAE',
  boundary geometry(Polygon, 4326),
  centroid geometry(Point, 4326),
  confidence_level text not null default 'demo',
  source_id uuid references public.sources(id) on delete set null,
  limitations text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.market_metrics (
  id uuid primary key default gen_random_uuid(),
  market_area_id uuid not null references public.market_areas(id) on delete cascade,
  metric_key text not null,
  metric_label text not null,
  metric_value numeric,
  metric_unit text,
  confidence_level text not null default 'demo',
  source_id uuid references public.sources(id) on delete set null,
  observed_at date,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.analysis_runs (
  id uuid primary key default gen_random_uuid(),
  run_key text not null,
  scenario_id text not null,
  selected_name text not null,
  selected_type text not null,
  selected_point jsonb not null,
  selected_object jsonb,
  result_payload jsonb not null,
  decision_posture text,
  confidence_level text,
  data_confidence_level text,
  analysis_mode text,
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  report_key text not null,
  report_type text not null check (report_type in ('analysis', 'comparison')),
  title text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.comparison_sets (
  id uuid primary key default gen_random_uuid(),
  comparison_key text not null,
  scenario_id text,
  item_count integer not null default 0,
  items jsonb not null default '[]'::jsonb,
  result_payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists sources_category_idx on public.sources(category);
create index if not exists sources_type_status_idx on public.sources(source_type, integration_status);
create index if not exists spatial_layers_source_id_idx on public.spatial_layers(source_id);
create index if not exists spatial_features_layer_id_idx on public.spatial_features(layer_id);
create index if not exists spatial_features_geometry_gix on public.spatial_features using gist(geometry);
create index if not exists spatial_features_centroid_gix on public.spatial_features using gist(centroid);
create index if not exists market_areas_centroid_gix on public.market_areas using gist(centroid);
create index if not exists market_areas_boundary_gix on public.market_areas using gist(boundary);
create index if not exists market_metrics_area_metric_idx on public.market_metrics(market_area_id, metric_key);
create index if not exists analysis_runs_created_at_idx on public.analysis_runs(created_at desc);
create index if not exists reports_created_at_idx on public.reports(created_at desc);
create index if not exists comparison_sets_created_at_idx on public.comparison_sets(created_at desc);

drop trigger if exists set_sources_updated_at on public.sources;
create trigger set_sources_updated_at before update on public.sources
for each row execute function public.set_updated_at();

drop trigger if exists set_spatial_layers_updated_at on public.spatial_layers;
create trigger set_spatial_layers_updated_at before update on public.spatial_layers
for each row execute function public.set_updated_at();

drop trigger if exists set_spatial_features_updated_at on public.spatial_features;
create trigger set_spatial_features_updated_at before update on public.spatial_features
for each row execute function public.set_updated_at();

drop trigger if exists set_market_areas_updated_at on public.market_areas;
create trigger set_market_areas_updated_at before update on public.market_areas
for each row execute function public.set_updated_at();

drop trigger if exists set_market_metrics_updated_at on public.market_metrics;
create trigger set_market_metrics_updated_at before update on public.market_metrics
for each row execute function public.set_updated_at();

comment on table public.sources is 'GeoAI v0.1 data source registry. TODO before pilot: enable RLS, auth-scoped tenancy, audit logs, and source approval workflows.';
comment on table public.spatial_layers is 'Spatial layer registry for PostGIS-backed layers. v0.1 stores metadata only; no external API sync yet.';
comment on table public.spatial_features is 'PostGIS feature store for future official/customer/demo geometries. Demo features must not be presented as official boundaries.';
comment on table public.market_areas is 'Market context geography table for future official/licensed/customer market areas.';
comment on table public.market_metrics is 'Normalized market metrics table. v0.1 supports demo-normalized metrics before official adapters are connected.';
comment on table public.analysis_runs is 'Optional persisted analysis runs. TODO: add user/workspace ownership, RLS, retention controls, and audit trails.';
comment on table public.reports is 'Optional persisted report payloads. TODO: add auth ownership, export artifact storage, and versioning.';
comment on table public.comparison_sets is 'Optional persisted comparison sets. TODO: add tenant/user ownership and RLS before production.';
