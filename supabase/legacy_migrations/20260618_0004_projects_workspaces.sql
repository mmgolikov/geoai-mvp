create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  project_key text unique not null,
  name text not null,
  description text,
  geography text default 'Dubai / UAE',
  client_type text check (client_type in ('developer', 'fund', 'family_office', 'bank', 'government', 'demo')),
  primary_scenario text,
  status text default 'active' check (status in ('active', 'archived', 'demo')),
  data_mode text default 'demo_normalized',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.analysis_runs
  add column if not exists project_id uuid references public.projects(id) on delete set null,
  add column if not exists project_key text,
  add column if not exists project_name text;

alter table public.reports
  add column if not exists project_id uuid references public.projects(id) on delete set null,
  add column if not exists project_key text,
  add column if not exists project_name text;

alter table public.comparison_sets
  add column if not exists project_id uuid references public.projects(id) on delete set null,
  add column if not exists project_key text,
  add column if not exists project_name text;

create index if not exists projects_project_key_idx on public.projects(project_key);
create index if not exists projects_status_idx on public.projects(status);
create index if not exists projects_client_type_idx on public.projects(client_type);
create index if not exists analysis_runs_project_id_idx on public.analysis_runs(project_id);
create index if not exists analysis_runs_project_key_idx on public.analysis_runs(project_key);
create index if not exists reports_project_id_idx on public.reports(project_id);
create index if not exists reports_project_key_idx on public.reports(project_key);
create index if not exists comparison_sets_project_id_idx on public.comparison_sets(project_id);
create index if not exists comparison_sets_project_key_idx on public.comparison_sets(project_key);

drop trigger if exists set_projects_updated_at on public.projects;
create trigger set_projects_updated_at before update on public.projects
for each row execute function public.set_updated_at();

insert into public.projects (
  project_key,
  name,
  description,
  geography,
  client_type,
  primary_scenario,
  status,
  data_mode,
  metadata
) values
  (
    'dubai-investment-screening-demo',
    'Dubai Investment Screening Demo',
    'Demo project for site screening, comparison and investment memo workflow.',
    'Dubai / UAE',
    'fund',
    'investmentSiteSelection',
    'demo',
    'demo_normalized',
    '{"default":true}'::jsonb
  ),
  (
    'developer-land-pipeline-demo',
    'Developer Land Pipeline Demo',
    'Demo project for development potential screening and due diligence planning.',
    'Dubai / UAE',
    'developer',
    'realEstateDevelopment',
    'demo',
    'demo_normalized',
    '{}'::jsonb
  ),
  (
    'bank-asset-review-demo',
    'Bank Asset Review Demo',
    'Demo project for portfolio, collateral and spatial risk review.',
    'Dubai / UAE',
    'bank',
    'assetPortfolioIntelligence',
    'demo',
    'demo_normalized',
    '{}'::jsonb
  )
on conflict (project_key) do update set
  name = excluded.name,
  description = excluded.description,
  geography = excluded.geography,
  client_type = excluded.client_type,
  primary_scenario = excluded.primary_scenario,
  status = excluded.status,
  data_mode = excluded.data_mode,
  metadata = excluded.metadata,
  updated_at = now();

comment on table public.projects is 'GeoAI project/workspace model v0.1. No auth or multi-tenancy yet; RLS, organization ownership, user roles and workspace permissions are required before production.';
comment on column public.analysis_runs.project_id is 'Optional project/workspace link. Nullable for backwards compatibility and local/demo fallback.';
comment on column public.reports.project_id is 'Optional project/workspace link. Nullable for backwards compatibility and local/demo fallback.';
comment on column public.comparison_sets.project_id is 'Optional project/workspace link. Nullable for backwards compatibility and local/demo fallback.';
