alter table public.analysis_runs
  add column if not exists selected_feature_key text,
  add column if not exists input_context jsonb,
  add column if not exists result_json jsonb;

update public.analysis_runs
set result_json = result_payload
where result_json is null and result_payload is not null;

alter table public.analysis_runs
  alter column result_payload drop not null,
  alter column result_json set default '{}'::jsonb;

alter table public.reports
  add column if not exists run_key text,
  add column if not exists report_json jsonb,
  add column if not exists decision_posture text,
  add column if not exists generated_at timestamptz;

update public.reports
set report_json = payload
where report_json is null and payload is not null;

update public.reports
set generated_at = created_at
where generated_at is null;

alter table public.reports
  alter column payload drop not null,
  alter column report_json set default '{}'::jsonb,
  alter column generated_at set default now();

create unique index if not exists analysis_runs_run_key_uidx on public.analysis_runs(run_key);
create unique index if not exists reports_report_key_uidx on public.reports(report_key);
create index if not exists analysis_runs_selected_feature_key_idx on public.analysis_runs(selected_feature_key);
create index if not exists reports_run_key_idx on public.reports(run_key);

comment on column public.analysis_runs.input_context is 'Structured request context used to generate the analysis. Avoid storing secrets or unredacted customer data.';
comment on column public.analysis_runs.result_json is 'Structured GeoAI analysis result JSON used for dashboard/history restoration.';
comment on column public.reports.report_json is 'Structured report/memo JSON. Binary PDF storage is intentionally out of scope for v0.1.';
