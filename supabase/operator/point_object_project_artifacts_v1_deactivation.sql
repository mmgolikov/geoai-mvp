-- DEVELOPMENT/PREVIEW-ONLY deactivation draft.
-- This removes the callable facade and row policies while deliberately
-- retaining the table and every stored artifact row for recovery/review.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

revoke all on function api.put_point_object_project_artifact(text, jsonb, jsonb, bigint)
  from public, anon, authenticated, service_role;
revoke all on function api.list_point_object_project_artifacts(text, integer, timestamptz, uuid)
  from public, anon, authenticated, service_role;

drop function if exists api.put_point_object_project_artifact(text, jsonb, jsonb, bigint);
drop function if exists api.list_point_object_project_artifacts(text, integer, timestamptz, uuid);

revoke all on function geoai_private.put_point_object_project_artifact(text, jsonb, jsonb, bigint)
  from public, anon, authenticated, service_role;
revoke all on function geoai_private.list_point_object_project_artifacts(text, integer, timestamptz, uuid)
  from public, anon, authenticated, service_role;
revoke all on function geoai_private.point_object_artifact_projections(jsonb)
  from public, anon, authenticated, service_role;

drop function if exists geoai_private.put_point_object_project_artifact(text, jsonb, jsonb, bigint);
drop function if exists geoai_private.list_point_object_project_artifacts(text, integer, timestamptz, uuid);
drop function if exists geoai_private.point_object_artifact_projections(jsonb);

drop policy if exists point_object_project_artifacts_creator_select
  on public.point_object_project_artifacts;
drop policy if exists point_object_project_artifacts_creator_insert
  on public.point_object_project_artifacts;
drop policy if exists point_object_project_artifacts_creator_update
  on public.point_object_project_artifacts;

-- Intentionally retained without direct caller grants:
--   * public.point_object_project_artifacts;
--   * all existing rows, constraints, indexes, RLS and FORCE RLS.

commit;
