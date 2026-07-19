drop policy if exists "geoai preview demo organizations read" on public.organizations;
create policy "geoai preview demo organizations read"
  on public.organizations
  for select
  to anon, authenticated
  using (slug = 'geoai-demo');

drop policy if exists "geoai preview demo profiles read" on public.profiles;
create policy "geoai preview demo profiles read"
  on public.profiles
  for select
  to anon, authenticated
  using (email = 'geoai-demo-system@geoai.local');

drop policy if exists "geoai preview demo projects read" on public.projects;
create policy "geoai preview demo projects read"
  on public.projects
  for select
  to anon, authenticated
  using (project_key like '%-demo' and data_mode = 'demo_normalized');

drop policy if exists "geoai preview demo memberships read" on public.project_memberships;
create policy "geoai preview demo memberships read"
  on public.project_memberships
  for select
  to anon, authenticated
  using (project_key like '%-demo');

drop policy if exists "geoai preview demo aois read" on public.aois;
create policy "geoai preview demo aois read"
  on public.aois
  for select
  to anon, authenticated
  using (
    project_key like '%-demo'
    or project_id in (select id from public.projects where project_key like '%-demo' and data_mode = 'demo_normalized')
  );

drop policy if exists "geoai preview demo analysis read" on public.analysis_runs;
create policy "geoai preview demo analysis read"
  on public.analysis_runs
  for select
  to anon, authenticated
  using (
    project_key like '%-demo'
    or project_id in (select id from public.projects where project_key like '%-demo' and data_mode = 'demo_normalized')
  );

drop policy if exists "geoai preview demo reports read" on public.reports;
create policy "geoai preview demo reports read"
  on public.reports
  for select
  to anon, authenticated
  using (
    project_key like '%-demo'
    or project_id in (select id from public.projects where project_key like '%-demo' and data_mode = 'demo_normalized')
  );

drop policy if exists "geoai preview demo comparisons read" on public.comparison_sets;
create policy "geoai preview demo comparisons read"
  on public.comparison_sets
  for select
  to anon, authenticated
  using (
    project_key like '%-demo'
    or project_id in (select id from public.projects where project_key like '%-demo' and data_mode = 'demo_normalized')
  );

drop policy if exists "geoai preview demo uploads read" on public.uploaded_datasets;
create policy "geoai preview demo uploads read"
  on public.uploaded_datasets
  for select
  to anon, authenticated
  using (
    project_key like '%-demo'
    or project_id in (select id from public.projects where project_key like '%-demo' and data_mode = 'demo_normalized')
  );

drop policy if exists "geoai preview demo data room read" on public.data_room_assets;
create policy "geoai preview demo data room read"
  on public.data_room_assets
  for select
  to anon, authenticated
  using (
    project_key like '%-demo'
    or project_id in (select id from public.projects where project_key like '%-demo' and data_mode = 'demo_normalized')
  );

drop policy if exists "geoai preview demo checklist read" on public.validation_checklist_items;
create policy "geoai preview demo checklist read"
  on public.validation_checklist_items
  for select
  to anon, authenticated
  using (
    project_key like '%-demo'
    or project_id in (select id from public.projects where project_key like '%-demo' and data_mode = 'demo_normalized')
  );

drop policy if exists "geoai preview demo workflows read" on public.pilot_workflows;
create policy "geoai preview demo workflows read"
  on public.pilot_workflows
  for select
  to anon, authenticated
  using (
    project_key like '%-demo'
    or project_id in (select id from public.projects where project_key like '%-demo' and data_mode = 'demo_normalized')
  );

drop policy if exists "geoai preview demo client inputs read" on public.pilot_client_inputs;
create policy "geoai preview demo client inputs read"
  on public.pilot_client_inputs
  for select
  to anon, authenticated
  using (
    project_key like '%-demo'
    or project_id in (select id from public.projects where project_key like '%-demo' and data_mode = 'demo_normalized')
  );

drop policy if exists "geoai preview demo deliverables read" on public.pilot_deliverables;
create policy "geoai preview demo deliverables read"
  on public.pilot_deliverables
  for select
  to anon, authenticated
  using (
    project_key like '%-demo'
    or project_id in (select id from public.projects where project_key like '%-demo' and data_mode = 'demo_normalized')
  );

drop policy if exists "geoai preview demo source snapshots read" on public.source_registry_snapshots;
create policy "geoai preview demo source snapshots read"
  on public.source_registry_snapshots
  for select
  to anon, authenticated
  using (
    project_key is null
    or project_key like '%-demo'
    or project_id in (select id from public.projects where project_key like '%-demo' and data_mode = 'demo_normalized')
  );

drop policy if exists "geoai preview demo external snapshots read" on public.external_data_snapshots;
create policy "geoai preview demo external snapshots read"
  on public.external_data_snapshots
  for select
  to anon, authenticated
  using (
    project_key is null
    or project_key like '%-demo'
    or project_id in (select id from public.projects where project_key like '%-demo' and data_mode = 'demo_normalized')
  );

drop policy if exists "geoai preview demo ai scores read" on public.ai_decision_scores;
create policy "geoai preview demo ai scores read"
  on public.ai_decision_scores
  for select
  to anon, authenticated
  using (
    project_key like '%-demo'
    or project_id in (select id from public.projects where project_key like '%-demo' and data_mode = 'demo_normalized')
  );

drop policy if exists "geoai preview demo audit read" on public.audit_events;
create policy "geoai preview demo audit read"
  on public.audit_events
  for select
  to anon, authenticated
  using (
    project_key like '%-demo'
    or project_id in (select id from public.projects where project_key like '%-demo' and data_mode = 'demo_normalized')
    or entity_id = 'geoai_demo_project_baseline_seed_v1'
  );
