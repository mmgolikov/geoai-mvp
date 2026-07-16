-- GeoAI foreign-key index hardening v1
-- Covers every currently unindexed domain FK in the canonical schema. These
-- indexes protect parent UPDATE/DELETE and tenant/project joins from full scans.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '120s';

create index if not exists idx_fk_ai_scores_project_scope
  on public.ai_decision_scores (project_id, organization_id, project_key);
create index if not exists idx_fk_analysis_runs_project_scope
  on public.analysis_runs (project_id, organization_id, project_key);
create index if not exists idx_fk_aois_project_scope
  on public.aois (project_id, organization_id, project_key);
create index if not exists idx_fk_clients_created_by
  on public.clients (created_by);
create index if not exists idx_fk_comparison_sets_project_scope
  on public.comparison_sets (project_id, organization_id, project_key);
create index if not exists idx_fk_data_room_assets_project_scope
  on public.data_room_assets (project_id, organization_id, project_key);
create index if not exists idx_fk_invitations_accepted_by
  on public.invitations (accepted_by);
create index if not exists idx_fk_invitations_created_by
  on public.invitations (created_by);
create index if not exists idx_fk_invitations_project_scope
  on public.invitations (project_id, organization_id);
create index if not exists idx_fk_pilot_inputs_project_scope
  on public.pilot_client_inputs (project_id, organization_id, project_key);
create index if not exists idx_fk_pilot_deliverables_project_scope
  on public.pilot_deliverables (project_id, organization_id, project_key);
create index if not exists idx_fk_pilot_workflows_project_scope
  on public.pilot_workflows (project_id, organization_id, project_key);
create index if not exists idx_fk_platform_memberships_created_by
  on public.platform_memberships (created_by);
create index if not exists idx_fk_project_memberships_org_profile
  on public.project_memberships (organization_id, user_id);
create index if not exists idx_fk_project_memberships_project_scope
  on public.project_memberships (project_id, organization_id, project_key);
create index if not exists idx_fk_projects_client_scope
  on public.projects (client_id, organization_id);
create index if not exists idx_fk_reports_project_scope
  on public.reports (project_id, organization_id, project_key);
create index if not exists idx_fk_source_artifacts_created_by
  on public.source_artifacts (created_by);
create index if not exists idx_fk_source_artifacts_org_creator
  on public.source_artifacts (organization_id, created_by);
create index if not exists idx_fk_source_artifacts_project_creator
  on public.source_artifacts (project_id, created_by);
create index if not exists idx_fk_source_artifacts_release_scope
  on public.source_artifacts (source_release_id, organization_id, project_id, project_key);
create index if not exists idx_fk_ingestion_receipts_created_by
  on public.source_ingestion_receipts (created_by);
create index if not exists idx_fk_ingestion_receipts_org_creator
  on public.source_ingestion_receipts (organization_id, created_by);
create index if not exists idx_fk_ingestion_receipts_project_creator
  on public.source_ingestion_receipts (project_id, created_by);
create index if not exists idx_fk_ingestion_receipts_project_scope
  on public.source_ingestion_receipts (project_id, organization_id, project_key);
create index if not exists idx_fk_ingestion_receipts_release_scope
  on public.source_ingestion_receipts (source_release_id, organization_id, project_id, project_key);
create index if not exists idx_fk_ingestion_receipts_source_id
  on public.source_ingestion_receipts (source_id);
create index if not exists idx_fk_ingestion_receipts_release_id
  on public.source_ingestion_receipts (source_release_id);
create index if not exists idx_fk_release_events_org_actor
  on public.source_release_status_events (organization_id, actor_profile_id);
create index if not exists idx_fk_release_events_actor
  on public.source_release_status_events (actor_profile_id);
create index if not exists idx_fk_release_events_project_actor
  on public.source_release_status_events (project_id, actor_profile_id);
create index if not exists idx_fk_release_events_release_scope
  on public.source_release_status_events (source_release_id, organization_id, project_id, project_key);
create index if not exists idx_fk_source_releases_created_by
  on public.source_releases (created_by);
create index if not exists idx_fk_source_releases_org_creator
  on public.source_releases (organization_id, created_by);
create index if not exists idx_fk_source_releases_project_creator
  on public.source_releases (project_id, created_by);
create index if not exists idx_fk_source_releases_project_scope
  on public.source_releases (project_id, organization_id, project_key);
create index if not exists idx_fk_source_releases_source_id
  on public.source_releases (source_id);
create index if not exists idx_fk_uploaded_datasets_project_scope
  on public.uploaded_datasets (project_id, organization_id, project_key);
create index if not exists idx_fk_validation_items_project_scope
  on public.validation_checklist_items (project_id, organization_id, project_key);

commit;
