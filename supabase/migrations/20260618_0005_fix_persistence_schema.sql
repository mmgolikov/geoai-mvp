alter table public.reports
  add column if not exists analysis_run_id uuid references public.analysis_runs(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

alter table public.analysis_runs
  add column if not exists selected_feature_key text,
  add column if not exists input_context jsonb,
  add column if not exists result_json jsonb,
  add column if not exists project_id uuid references public.projects(id) on delete set null,
  add column if not exists project_key text,
  add column if not exists project_name text;

alter table public.reports
  add column if not exists run_key text,
  add column if not exists report_json jsonb,
  add column if not exists decision_posture text,
  add column if not exists project_id uuid references public.projects(id) on delete set null,
  add column if not exists project_key text,
  add column if not exists project_name text,
  add column if not exists generated_at timestamptz default now();

create index if not exists reports_analysis_run_id_idx on public.reports(analysis_run_id);
create index if not exists reports_updated_at_idx on public.reports(updated_at desc);

drop trigger if exists set_reports_updated_at on public.reports;
create trigger set_reports_updated_at before update on public.reports
for each row execute function public.set_updated_at();

comment on column public.reports.analysis_run_id is 'Optional direct relation to analysis_runs for persisted reports. Nullable for local/demo compatibility.';
comment on column public.reports.updated_at is 'Maintenance timestamp for report payload updates.';
