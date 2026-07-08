-- GeoAI DB Foundation Hardening v1
-- Applied to geoai-dev / pphdqkurxneyagvnnjdt on 2026-07-08.
-- Purpose: harden the existing persistence foundation with FK-covering indexes,
-- idempotent seed support and explicit search_path for the updated_at trigger.

create or replace function public.geoai_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create index if not exists idx_ai_decision_scores_organization_id on public.ai_decision_scores(organization_id);
create index if not exists idx_ai_decision_scores_project_id_fk on public.ai_decision_scores(project_id);
create index if not exists idx_ai_decision_scores_selected_aoi_id on public.ai_decision_scores(selected_aoi_id);

create index if not exists idx_analysis_runs_organization_id on public.analysis_runs(organization_id);
create index if not exists idx_analysis_runs_ai_decision_score_id on public.analysis_runs(ai_decision_score_id);
create index if not exists idx_analysis_runs_selected_aoi_id on public.analysis_runs(selected_aoi_id);
create index if not exists idx_analysis_runs_created_by on public.analysis_runs(created_by);

create index if not exists idx_aois_created_by on public.aois(created_by);

create index if not exists idx_audit_events_organization_id on public.audit_events(organization_id);
create index if not exists idx_audit_events_project_id on public.audit_events(project_id);
create index if not exists idx_audit_events_actor_user_id on public.audit_events(actor_user_id);

create index if not exists idx_comparison_sets_organization_id on public.comparison_sets(organization_id);
create index if not exists idx_comparison_sets_created_by on public.comparison_sets(created_by);

create index if not exists idx_data_room_assets_organization_id on public.data_room_assets(organization_id);
create index if not exists idx_data_room_assets_created_by on public.data_room_assets(created_by);

create index if not exists idx_external_data_snapshots_organization_id on public.external_data_snapshots(organization_id);
create index if not exists idx_external_data_snapshots_project_id on public.external_data_snapshots(project_id);
create index if not exists idx_external_data_snapshots_imported_by on public.external_data_snapshots(imported_by);

create index if not exists idx_pilot_client_inputs_organization_id on public.pilot_client_inputs(organization_id);
create index if not exists idx_pilot_client_inputs_project_id on public.pilot_client_inputs(project_id);

create index if not exists idx_pilot_deliverables_organization_id on public.pilot_deliverables(organization_id);
create index if not exists idx_pilot_deliverables_project_id on public.pilot_deliverables(project_id);

create index if not exists idx_pilot_workflows_organization_id on public.pilot_workflows(organization_id);
create index if not exists idx_pilot_workflows_owner_id on public.pilot_workflows(owner_id);

create index if not exists idx_project_memberships_organization_id on public.project_memberships(organization_id);
create index if not exists idx_projects_created_by on public.projects(created_by);

create index if not exists idx_reports_organization_id on public.reports(organization_id);
create index if not exists idx_reports_generated_by on public.reports(generated_by);

create index if not exists idx_source_registry_snapshots_organization_id on public.source_registry_snapshots(organization_id);
create index if not exists idx_source_registry_snapshots_project_id on public.source_registry_snapshots(project_id);

create index if not exists idx_uploaded_datasets_organization_id on public.uploaded_datasets(organization_id);
create index if not exists idx_uploaded_datasets_project_id_fk on public.uploaded_datasets(project_id);
create index if not exists idx_uploaded_datasets_created_by on public.uploaded_datasets(created_by);

create index if not exists idx_validation_checklist_items_organization_id on public.validation_checklist_items(organization_id);
create index if not exists idx_validation_checklist_items_created_by on public.validation_checklist_items(created_by);

create unique index if not exists ux_pilot_workflows_project_key
  on public.pilot_workflows(project_key)
  where project_key is not null;

create unique index if not exists ux_validation_checklist_project_title
  on public.validation_checklist_items(project_key, title)
  where project_key is not null;

create unique index if not exists ux_pilot_client_inputs_project_title
  on public.pilot_client_inputs(project_key, title)
  where project_key is not null;

create unique index if not exists ux_pilot_deliverables_project_title
  on public.pilot_deliverables(project_key, title)
  where project_key is not null;

create unique index if not exists ux_data_room_assets_project_name_type
  on public.data_room_assets(project_key, name, asset_type)
  where project_key is not null;

alter policy "geoai profiles self read" on public.profiles
  using (auth_user_id = (select auth.uid()));
