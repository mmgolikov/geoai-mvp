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
      execute format('revoke all on table public.%I from anon, authenticated', table_name);
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
  revoke select, insert, update, delete on tables from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke usage, select on sequences from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke execute on functions from public;

-- Managed PostGIS and Storage objects are owned by Supabase-managed roles,
-- not the normal postgres migration role. Their ACL/Data API containment is
-- an operator prerequisite documented in
-- docs/SUPABASE_DATA_API_CONTAINMENT_RUNBOOK_2026_07_16.md and must be
-- completed before this draft is considered apply-ready. Do not add owner-
-- only REVOKE statements here: they would abort the domain-table migration.

-- Make immutable project_id authoritative. A supplied denormalized key must
-- match the same project and organization; an OR between id/key is unsafe.
create or replace function public.geoai_current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.id
  from public.profiles p
  where p.auth_user_id = (select auth.uid())
    and p.status = 'active'
  limit 1
$$;

create or replace function public.geoai_has_project_access(target_project_id uuid, target_project_key text default null)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.project_memberships pm
    join public.profiles p on p.id = pm.user_id
    join public.projects project
      on project.id = pm.project_id
     and project.organization_id = pm.organization_id
    where p.auth_user_id = auth.uid()
      and p.status = 'active'
      and pm.status = 'active'
      and target_project_id is not null
      and pm.project_id = target_project_id
      and project.id = target_project_id
      and (
        target_project_key is null
        or (pm.project_key = target_project_key and project.project_key = target_project_key)
      )
  )
$$;

create or replace function public.geoai_has_organization_access(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.project_memberships pm
    join public.profiles p on p.id = pm.user_id
    join public.projects project
      on project.id = pm.project_id
     and project.organization_id = pm.organization_id
    where p.auth_user_id = auth.uid()
      and p.status = 'active'
      and pm.status = 'active'
      and pm.organization_id = target_organization_id
      and project.organization_id = target_organization_id
  )
$$;

-- SECURITY DEFINER helpers are internal RLS primitives. Anonymous callers do
-- not need direct EXECUTE privileges, and PUBLIC must not inherit them.
revoke execute on function public.geoai_current_profile_id() from public, anon;
revoke execute on function public.geoai_has_organization_access(uuid) from public, anon;
revoke execute on function public.geoai_has_project_access(uuid, text) from public, anon;
grant execute on function public.geoai_current_profile_id() to authenticated;
grant execute on function public.geoai_has_organization_access(uuid) to authenticated;
grant execute on function public.geoai_has_project_access(uuid, text) to authenticated;

-- The historical Preview migration granted anonymous SELECT across the full
-- domain model. Retire every one of those policies and grants before Auth or
-- real client/source data can be considered. Public healthcheck access is the
-- only intentionally retained anonymous table grant.
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

revoke all on table public.organizations from public, anon;
revoke all on table public.profiles from public, anon;
revoke all on table public.projects from public, anon;
revoke all on table public.project_memberships from public, anon;
revoke all on table public.aois from public, anon;
revoke all on table public.analysis_runs from public, anon;
revoke all on table public.reports from public, anon;
revoke all on table public.comparison_sets from public, anon;
revoke all on table public.uploaded_datasets from public, anon;
revoke all on table public.data_room_assets from public, anon;
revoke all on table public.validation_checklist_items from public, anon;
revoke all on table public.pilot_workflows from public, anon;
revoke all on table public.pilot_client_inputs from public, anon;
revoke all on table public.pilot_deliverables from public, anon;
revoke all on table public.source_registry_snapshots from public, anon;
revoke all on table public.external_data_snapshots from public, anon;
revoke all on table public.ai_decision_scores from public, anon;
revoke all on table public.audit_events from public, anon;

-- The public healthcheck projection is intentionally read-only. Historical
-- grants included mutation privileges; normalize them to SELECT only.
revoke all on table public.geoai_healthcheck from public, anon, authenticated;
grant select on table public.geoai_healthcheck to anon, authenticated;

-- Nullable project scope is not a public-visibility model. Remove both the
-- original member/global policies and the later Preview policies, then expose
-- only records explicitly tied to seeded demo projects for authenticated
-- callers. A canonical visibility column and private-member policies belong to
-- DB-01.
drop policy if exists "geoai source snapshots read" on public.source_registry_snapshots;
drop policy if exists "geoai external snapshots read" on public.external_data_snapshots;
drop policy if exists "geoai preview demo source snapshots read" on public.source_registry_snapshots;
drop policy if exists "geoai preview demo external snapshots read" on public.external_data_snapshots;

create policy "geoai explicit demo source snapshots read"
on public.source_registry_snapshots
for select
to authenticated
using (
  exists (
    select 1 from public.projects p
    where p.id = source_registry_snapshots.project_id
      and p.project_key = source_registry_snapshots.project_key
      and p.project_key in (
      'dubai-investment-screening-demo',
      'developer-land-pipeline-demo',
      'bank-asset-review-demo',
      'home-buyer-neighborhood-demo',
      'family-relocation-area-demo'
      )
      and p.data_mode = 'demo_normalized'
  )
);

create policy "geoai explicit demo external snapshots read"
on public.external_data_snapshots
for select
to authenticated
using (
  exists (
    select 1 from public.projects p
    where p.id = external_data_snapshots.project_id
      and p.project_key = external_data_snapshots.project_key
      and p.project_key in (
      'dubai-investment-screening-demo',
      'developer-land-pipeline-demo',
      'bank-asset-review-demo',
      'home-buyer-neighborhood-demo',
      'family-relocation-area-demo'
      )
      and p.data_mode = 'demo_normalized'
  )
);

-- storage.objects is owned by the managed supabase_storage_admin role. Its
-- policy replacement is deliberately excluded from this normal domain
-- migration so the migration cannot fail halfway through on owner-only DDL.
-- The review-only owner-path SQL is kept outside supabase/migrations at
-- supabase/operator/20260716_storage_policy_owner_path_review.sql.
