-- GeoAI Supabase/PostGIS Durable Persistence Foundation v2.3
-- Additive MVP/pilot schema foundation. This migration does not remove data,
-- does not create broad anonymous write policies, and does not claim official
-- validation or production-grade security by itself.

create extension if not exists pgcrypto;
create extension if not exists postgis;

create or replace function public.geoai_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  status text default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid,
  email text,
  full_name text,
  avatar_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  project_key text unique not null,
  name text not null,
  description text,
  geography text,
  client_type text,
  primary_scenario text,
  status text default 'active',
  data_mode text default 'demo_normalized',
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  project_key text,
  user_id uuid references public.profiles(id) on delete cascade,
  role text not null default 'viewer' check (role in ('owner', 'admin', 'analyst', 'viewer', 'client_viewer')),
  status text not null default 'active' check (status in ('active', 'invited', 'disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.aois (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  project_id uuid references public.projects(id) on delete cascade,
  project_key text not null,
  name text not null,
  description text,
  geometry_type text default 'Polygon',
  source_type text,
  data_mode text,
  validation_status text,
  geometry geometry(Polygon, 4326),
  centroid geometry(Point, 4326),
  bbox jsonb,
  measurements jsonb not null default '{}'::jsonb,
  properties jsonb not null default '{}'::jsonb,
  caveat text default 'AOIs are user-drawn/uploaded screening geometry; official validation required.',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_decision_scores (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  project_id uuid references public.projects(id) on delete cascade,
  project_key text,
  analysis_run_key text,
  selected_aoi_id uuid references public.aois(id) on delete set null,
  mode text,
  decision_posture text,
  recommended_use text,
  suitability_score integer,
  risk_score integer,
  confidence text,
  evidence_used jsonb not null default '[]'::jsonb,
  key_drivers jsonb not null default '[]'::jsonb,
  key_risks jsonb not null default '[]'::jsonb,
  validation_required jsonb not null default '[]'::jsonb,
  next_actions jsonb not null default '[]'::jsonb,
  unsupported_claims jsonb not null default '[]'::jsonb,
  model text,
  prompt_version text,
  raw_response jsonb,
  caveat text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.analysis_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  project_id uuid references public.projects(id) on delete cascade,
  project_key text,
  run_key text unique not null,
  scenario_id text,
  selected_name text,
  selected_type text,
  selected_point jsonb,
  selected_object jsonb,
  selected_feature_key text,
  selected_aoi_id uuid references public.aois(id) on delete set null,
  selected_aoi_snapshot jsonb,
  deterministic_scores jsonb,
  result_payload jsonb,
  result_json jsonb,
  input_context jsonb,
  ai_decision_score_id uuid references public.ai_decision_scores(id) on delete set null,
  source_lineage jsonb,
  decision_posture text,
  confidence_level text,
  data_confidence_level text,
  analysis_mode text,
  custom_query text,
  project_name text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  project_id uuid references public.projects(id) on delete cascade,
  project_key text,
  report_key text unique not null,
  report_type text,
  title text,
  summary text,
  payload jsonb,
  report_json jsonb,
  linked_analysis_ids text[] not null default '{}',
  linked_comparison_id text,
  linked_aoi_ids uuid[] not null default '{}',
  source_lineage jsonb,
  printable_path text,
  analysis_run_id text,
  run_key text,
  project_name text,
  decision_posture text,
  generated_by uuid references public.profiles(id) on delete set null,
  generated_at timestamptz default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.comparison_sets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  project_id uuid references public.projects(id) on delete cascade,
  project_key text,
  comparison_key text unique not null,
  title text,
  item_count integer,
  items jsonb not null default '[]'::jsonb,
  recommendation jsonb,
  result_payload jsonb,
  payload jsonb,
  source_lineage jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.uploaded_datasets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  project_id uuid references public.projects(id) on delete cascade,
  project_key text,
  name text,
  description text,
  dataset_type text,
  file_name text,
  file_size_bytes bigint,
  mime_type text,
  storage_path text,
  schema_summary jsonb,
  preview_rows jsonb,
  source_type text,
  validation_status text,
  metadata jsonb not null default '{}'::jsonb,
  caveat text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.data_room_assets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  project_id uuid references public.projects(id) on delete cascade,
  project_key text,
  name text,
  description text,
  asset_type text,
  source_type text,
  validation_status text,
  linked_aoi_ids uuid[] not null default '{}',
  linked_analysis_ids text[] not null default '{}',
  linked_report_ids text[] not null default '{}',
  file_name text,
  file_size_bytes bigint,
  mime_type text,
  storage_path text,
  metadata jsonb not null default '{}'::jsonb,
  caveat text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.validation_checklist_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  project_id uuid references public.projects(id) on delete cascade,
  project_key text,
  title text not null,
  category text,
  status text,
  priority text,
  description text,
  linked_asset_ids uuid[] not null default '{}',
  caveat text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pilot_workflows (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  project_id uuid references public.projects(id) on delete cascade,
  project_key text,
  title text,
  client_type text,
  use_case text,
  geography text,
  decision_question text,
  pilot_stage text,
  target_decision_date date,
  owner_id uuid references public.profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  caveat text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pilot_client_inputs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  project_id uuid references public.projects(id) on delete cascade,
  project_key text,
  title text,
  input_type text,
  required boolean default false,
  status text,
  priority text,
  linked_data_room_asset_ids uuid[] not null default '{}',
  linked_aoi_ids uuid[] not null default '{}',
  notes text,
  caveat text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pilot_deliverables (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  project_id uuid references public.projects(id) on delete cascade,
  project_key text,
  title text,
  deliverable_type text,
  status text,
  linked_analysis_ids text[] not null default '{}',
  linked_report_ids text[] not null default '{}',
  linked_comparison_ids text[] not null default '{}',
  linked_aoi_ids uuid[] not null default '{}',
  linked_data_room_asset_ids uuid[] not null default '{}',
  next_action text,
  caveat text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.source_registry_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  project_id uuid references public.projects(id) on delete cascade,
  project_key text,
  source_id text,
  source_name text,
  category text,
  access_mode text,
  connection_status text,
  source_mode text,
  data_quality_tier text,
  record_count integer,
  date_range jsonb,
  quality jsonb,
  lineage jsonb,
  caveat text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.external_data_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  project_id uuid references public.projects(id) on delete cascade,
  project_key text,
  source_id text,
  category text,
  source_mode text,
  raw_file_name text,
  normalized_path text,
  record_count integer,
  quality jsonb,
  manifest jsonb,
  imported_by uuid references public.profiles(id) on delete set null,
  imported_at timestamptz default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  project_id uuid references public.projects(id) on delete cascade,
  project_key text,
  actor_user_id uuid references public.profiles(id) on delete set null,
  event_type text not null check (event_type in (
    'auth_session_checked',
    'demo_login',
    'project_viewed',
    'project_updated',
    'aoi_created',
    'aoi_updated',
    'aoi_deleted',
    'analysis_run',
    'report_generated',
    'data_room_asset_added',
    'checklist_updated',
    'pilot_input_updated',
    'pilot_deliverable_updated',
    'ai_decision_score_generated'
  )),
  entity_type text,
  entity_id text,
  action text,
  metadata jsonb not null default '{}'::jsonb,
  ip_hash text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_projects_organization_id on public.projects(organization_id);
create index if not exists idx_projects_project_key on public.projects(project_key);
create index if not exists idx_projects_client_type on public.projects(client_type);
create index if not exists idx_projects_status on public.projects(status);
create index if not exists idx_project_memberships_project_id on public.project_memberships(project_id);
create index if not exists idx_project_memberships_project_key on public.project_memberships(project_key);
create index if not exists idx_project_memberships_user_id on public.project_memberships(user_id);
create index if not exists idx_aois_geometry on public.aois using gist(geometry);
create index if not exists idx_aois_centroid on public.aois using gist(centroid);
create index if not exists idx_aois_project_id on public.aois(project_id);
create index if not exists idx_aois_project_key on public.aois(project_key);
create index if not exists idx_aois_organization_id on public.aois(organization_id);
create index if not exists idx_aois_source_type on public.aois(source_type);
create index if not exists idx_aois_validation_status on public.aois(validation_status);
create index if not exists idx_analysis_runs_project_id on public.analysis_runs(project_id);
create index if not exists idx_analysis_runs_project_key on public.analysis_runs(project_key);
create index if not exists idx_reports_project_id on public.reports(project_id);
create index if not exists idx_reports_project_key on public.reports(project_key);
create index if not exists idx_comparison_sets_project_id on public.comparison_sets(project_id);
create index if not exists idx_comparison_sets_project_key on public.comparison_sets(project_key);
create index if not exists idx_data_room_assets_project_id on public.data_room_assets(project_id);
create index if not exists idx_data_room_assets_project_key on public.data_room_assets(project_key);
create index if not exists idx_validation_items_project_id on public.validation_checklist_items(project_id);
create index if not exists idx_validation_items_project_key on public.validation_checklist_items(project_key);
create index if not exists idx_pilot_workflows_project_id on public.pilot_workflows(project_id);
create index if not exists idx_pilot_workflows_project_key on public.pilot_workflows(project_key);
create index if not exists idx_source_snapshots_project_key on public.source_registry_snapshots(project_key);
create index if not exists idx_external_snapshots_project_key on public.external_data_snapshots(project_key);
create index if not exists idx_ai_scores_project_key on public.ai_decision_scores(project_key);
create index if not exists idx_audit_events_project_key on public.audit_events(project_key);
create index if not exists idx_audit_events_event_type on public.audit_events(event_type);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'organizations',
    'profiles',
    'projects',
    'project_memberships',
    'aois',
    'analysis_runs',
    'reports',
    'comparison_sets',
    'uploaded_datasets',
    'data_room_assets',
    'validation_checklist_items',
    'pilot_workflows',
    'pilot_client_inputs',
    'pilot_deliverables',
    'source_registry_snapshots',
    'external_data_snapshots',
    'ai_decision_scores'
  ]
  loop
    execute format('drop trigger if exists trg_%I_updated_at on public.%I', table_name, table_name);
    execute format('create trigger trg_%I_updated_at before update on public.%I for each row execute function public.geoai_set_updated_at()', table_name, table_name);
  end loop;
end;
$$;

create or replace function public.geoai_current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.id
  from public.profiles p
  where p.auth_user_id = auth.uid()
  limit 1
$$;

create or replace function public.geoai_has_project_access(target_project_id uuid, target_project_key text default null)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.project_memberships pm
    join public.profiles p on p.id = pm.user_id
    where p.auth_user_id = auth.uid()
      and pm.status = 'active'
      and (
        (target_project_id is not null and pm.project_id = target_project_id)
        or (target_project_key is not null and pm.project_key = target_project_key)
      )
  )
$$;

create or replace function public.geoai_has_organization_access(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.project_memberships pm
    join public.profiles p on p.id = pm.user_id
    where p.auth_user_id = auth.uid()
      and pm.status = 'active'
      and pm.organization_id = target_organization_id
  )
$$;

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_memberships enable row level security;
alter table public.aois enable row level security;
alter table public.analysis_runs enable row level security;
alter table public.reports enable row level security;
alter table public.comparison_sets enable row level security;
alter table public.uploaded_datasets enable row level security;
alter table public.data_room_assets enable row level security;
alter table public.validation_checklist_items enable row level security;
alter table public.pilot_workflows enable row level security;
alter table public.pilot_client_inputs enable row level security;
alter table public.pilot_deliverables enable row level security;
alter table public.source_registry_snapshots enable row level security;
alter table public.external_data_snapshots enable row level security;
alter table public.ai_decision_scores enable row level security;
alter table public.audit_events enable row level security;

create policy "geoai organizations member read" on public.organizations
  for select to authenticated
  using (public.geoai_has_organization_access(id));

create policy "geoai profiles self read" on public.profiles
  for select to authenticated
  using (auth_user_id = auth.uid());

create policy "geoai projects member read" on public.projects
  for select to authenticated
  using (public.geoai_has_project_access(id, project_key));

create policy "geoai memberships self read" on public.project_memberships
  for select to authenticated
  using (user_id = public.geoai_current_profile_id() or public.geoai_has_project_access(project_id, project_key));

create policy "geoai project scoped aoi read" on public.aois
  for select to authenticated
  using (public.geoai_has_project_access(project_id, project_key));

create policy "geoai project scoped aoi write" on public.aois
  for all to authenticated
  using (public.geoai_has_project_access(project_id, project_key))
  with check (public.geoai_has_project_access(project_id, project_key));

create policy "geoai project scoped analysis read" on public.analysis_runs
  for select to authenticated
  using (public.geoai_has_project_access(project_id, project_key));

create policy "geoai project scoped reports read" on public.reports
  for select to authenticated
  using (public.geoai_has_project_access(project_id, project_key));

create policy "geoai project scoped comparisons read" on public.comparison_sets
  for select to authenticated
  using (public.geoai_has_project_access(project_id, project_key));

create policy "geoai project scoped uploads read" on public.uploaded_datasets
  for select to authenticated
  using (public.geoai_has_project_access(project_id, project_key));

create policy "geoai project scoped data room read" on public.data_room_assets
  for select to authenticated
  using (public.geoai_has_project_access(project_id, project_key));

create policy "geoai project scoped checklist read" on public.validation_checklist_items
  for select to authenticated
  using (public.geoai_has_project_access(project_id, project_key));

create policy "geoai project scoped workflow read" on public.pilot_workflows
  for select to authenticated
  using (public.geoai_has_project_access(project_id, project_key));

create policy "geoai project scoped inputs read" on public.pilot_client_inputs
  for select to authenticated
  using (public.geoai_has_project_access(project_id, project_key));

create policy "geoai project scoped deliverables read" on public.pilot_deliverables
  for select to authenticated
  using (public.geoai_has_project_access(project_id, project_key));

create policy "geoai source snapshots read" on public.source_registry_snapshots
  for select to authenticated
  using (
    (project_id is null and project_key is null)
    or public.geoai_has_project_access(project_id, project_key)
  );

create policy "geoai external snapshots read" on public.external_data_snapshots
  for select to authenticated
  using (
    (project_id is null and project_key is null)
    or public.geoai_has_project_access(project_id, project_key)
  );

create policy "geoai ai decision scores read" on public.ai_decision_scores
  for select to authenticated
  using (public.geoai_has_project_access(project_id, project_key));

create policy "geoai audit project read" on public.audit_events
  for select to authenticated
  using (
    actor_user_id = public.geoai_current_profile_id()
    or public.geoai_has_project_access(project_id, project_key)
  );

comment on table public.aois is 'GeoAI user-drawn/uploaded AOIs for screening only. Not official parcel, zoning, cadastral, planning, ownership or entitlement boundaries.';
comment on table public.audit_events is 'Audit event foundation only. Not a certified audit trail or compliance-ready logging system.';
comment on function public.geoai_has_project_access(uuid, text) is 'Future RLS helper based on configured Supabase Auth and project memberships. Demo public mode remains app-level fallback, not DB public write access.';
