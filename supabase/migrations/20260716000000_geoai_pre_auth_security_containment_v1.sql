-- GeoAI pre-Auth security containment v1
-- Prepared for review only. Do not apply without an approved clean-replay,
-- rollback and live RLS verification plan.

-- Historical prototype tables can be created by a clean replay before the
-- canonical pilot schema. Keep them inaccessible until they are reconciled or
-- retired by the canonical migration-chain work package.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'sources',
    'spatial_layers',
    'spatial_features',
    'market_areas',
    'market_metrics',
    'uploaded_dataset_records'
  ]
  loop
    if to_regclass(format('public.%I', table_name)) is not null then
      execute format('alter table public.%I enable row level security', table_name);
      execute format('revoke all on table public.%I from public, anon, authenticated', table_name);
    end if;
  end loop;
end;
$$;

-- The historical schema omitted the profile lifecycle column already used by
-- the application access model. Add it before the fail-closed helpers so this
-- migration is replayable instead of referencing a non-existent field.
alter table public.profiles
  add column if not exists status text not null default 'active';

alter table public.profiles
  drop constraint if exists profiles_status_check;

alter table public.profiles
  add constraint profiles_status_check
  check (status in ('active', 'invited', 'disabled', 'inactive'));

-- One Auth principal must resolve to at most one profile. A foreign-key/delete
-- lifecycle is intentionally deferred to AUTH-01 because the product's
-- multi-organization profile model has not yet been approved.
create unique index if not exists ux_profiles_auth_user_id_nonnull
  on public.profiles(auth_user_id)
  where auth_user_id is not null;

-- Make future public-schema exposure opt-in. Existing managed extension
-- objects still require the operator boundary documented below.
alter default privileges for role postgres in schema public
  revoke all on tables from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke all on sequences from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke all on functions from public, anon, authenticated, service_role;

-- Managed PostGIS and Storage objects are owned by Supabase-managed roles,
-- not the normal postgres migration role. Their ACL/Data API containment is
-- an operator prerequisite documented in
-- docs/SUPABASE_DATA_API_CONTAINMENT_RUNBOOK_2026_07_16.md and must be
-- completed before this draft is considered apply-ready. Do not add owner-
-- only REVOKE statements here: they would abort the domain-table migration.

-- The historical Preview migration granted anonymous SELECT across the full
-- domain model. Retire every one of those policies and grants before Auth or
-- real client/source data can be considered. The healthcheck base table is
-- closed below; only the later allowlisted api.healthcheck() RPC may be public.
drop policy if exists "geoai organizations member read" on public.organizations;
drop policy if exists "geoai profiles self read" on public.profiles;
drop policy if exists "geoai projects member read" on public.projects;
drop policy if exists "geoai memberships self read" on public.project_memberships;
drop policy if exists "geoai project scoped aoi read" on public.aois;
drop policy if exists "geoai project scoped analysis read" on public.analysis_runs;
drop policy if exists "geoai project scoped reports read" on public.reports;
drop policy if exists "geoai project scoped comparisons read" on public.comparison_sets;
drop policy if exists "geoai project scoped uploads read" on public.uploaded_datasets;
drop policy if exists "geoai project scoped data room read" on public.data_room_assets;
drop policy if exists "geoai project scoped checklist read" on public.validation_checklist_items;
drop policy if exists "geoai project scoped workflow read" on public.pilot_workflows;
drop policy if exists "geoai project scoped inputs read" on public.pilot_client_inputs;
drop policy if exists "geoai project scoped deliverables read" on public.pilot_deliverables;
drop policy if exists "geoai source snapshots read" on public.source_registry_snapshots;
drop policy if exists "geoai external snapshots read" on public.external_data_snapshots;
drop policy if exists "geoai ai decision scores read" on public.ai_decision_scores;
drop policy if exists "geoai audit project read" on public.audit_events;
drop policy if exists "geoai preview demo organizations read" on public.organizations;
drop policy if exists "geoai preview demo profiles read" on public.profiles;
drop policy if exists "geoai preview demo projects read" on public.projects;
drop policy if exists "geoai preview demo memberships read" on public.project_memberships;
drop policy if exists "geoai preview demo aois read" on public.aois;
drop policy if exists "geoai preview demo analysis read" on public.analysis_runs;
drop policy if exists "geoai preview demo reports read" on public.reports;
drop policy if exists "geoai preview demo comparisons read" on public.comparison_sets;
drop policy if exists "geoai preview demo uploads read" on public.uploaded_datasets;
drop policy if exists "geoai preview demo data room read" on public.data_room_assets;
drop policy if exists "geoai preview demo checklist read" on public.validation_checklist_items;
drop policy if exists "geoai preview demo workflows read" on public.pilot_workflows;
drop policy if exists "geoai preview demo client inputs read" on public.pilot_client_inputs;
drop policy if exists "geoai preview demo deliverables read" on public.pilot_deliverables;
drop policy if exists "geoai preview demo ai scores read" on public.ai_decision_scores;
drop policy if exists "geoai preview demo audit read" on public.audit_events;

-- The prototype's only authenticated mutation policy allowed every project
-- member role to mutate AOIs. Keep DB writes closed until AUTH-01 defines and
-- tests action-specific SQL policies matching the application role matrix.
drop policy if exists "geoai project scoped aoi write" on public.aois;

revoke all on table public.organizations from public, anon, authenticated;
revoke all on table public.profiles from public, anon, authenticated;
revoke all on table public.projects from public, anon, authenticated;
revoke all on table public.project_memberships from public, anon, authenticated;
revoke all on table public.aois from public, anon, authenticated;
revoke all on table public.analysis_runs from public, anon, authenticated;
revoke all on table public.reports from public, anon, authenticated;
revoke all on table public.comparison_sets from public, anon, authenticated;
revoke all on table public.uploaded_datasets from public, anon, authenticated;
revoke all on table public.data_room_assets from public, anon, authenticated;
revoke all on table public.validation_checklist_items from public, anon, authenticated;
revoke all on table public.pilot_workflows from public, anon, authenticated;
revoke all on table public.pilot_client_inputs from public, anon, authenticated;
revoke all on table public.pilot_deliverables from public, anon, authenticated;
revoke all on table public.source_registry_snapshots from public, anon, authenticated;
revoke all on table public.external_data_snapshots from public, anon, authenticated;
revoke all on table public.ai_decision_scores from public, anon, authenticated;
revoke all on table public.audit_events from public, anon, authenticated;

-- Health remains closed at the base table. AUTH-01 exposes a minimal
-- api.healthcheck() RPC so public is never required as a Data API schema.
revoke all on table public.geoai_healthcheck from public, anon, authenticated, service_role;
comment on table public.geoai_healthcheck is
  'Non-sensitive liveness sentinel. Base-table access is closed; use the reviewed api.healthcheck() RPC after AUTH-01.';

-- Nullable project scope is not a public-visibility model. Keep snapshots
-- closed until SOURCE-01 introduces an explicit, non-null visibility model.
drop policy if exists "geoai preview demo source snapshots read" on public.source_registry_snapshots;
drop policy if exists "geoai preview demo external snapshots read" on public.external_data_snapshots;

-- Public SECURITY DEFINER helpers from the prototype were RPC-addressable in
-- the exposed schema. Retire them after their dependent policies are gone.
-- AUTH-01 recreates reviewed helpers in a non-exposed private schema.
drop function if exists public.geoai_has_project_access(uuid, text);
drop function if exists public.geoai_has_organization_access(uuid);
drop function if exists public.geoai_current_profile_id();

-- storage.objects is owned by the managed supabase_storage_admin role. Its
-- policy replacement is deliberately excluded from this normal domain
-- migration so the migration cannot fail halfway through on owner-only DDL.
-- The review-only owner-path SQL is kept outside supabase/migrations at
-- supabase/operator/20260716_storage_policy_owner_path_review.sql.
