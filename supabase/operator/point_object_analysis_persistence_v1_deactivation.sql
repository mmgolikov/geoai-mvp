-- DEVELOPMENT-ONLY DEACTIVATION DRAFT.
-- Use only after verifying the exact non-Production target and preserving a
-- backup. This disables the exposed persistence surface without deleting
-- analysis rows or weakening the creator-ownership RLS policies.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

revoke all on function api.upsert_point_object_analysis_run(
  text, text, text, text, jsonb, text, jsonb, jsonb, jsonb, text, text, text, text, text
) from public, anon, authenticated, service_role;
revoke all on function api.list_point_object_analysis_runs(text, integer)
  from public, anon, authenticated, service_role;

drop function if exists api.upsert_point_object_analysis_run(
  text, text, text, text, jsonb, text, jsonb, jsonb, jsonb, text, text, text, text, text
);
drop function if exists api.list_point_object_analysis_runs(text, integer);

revoke all on function geoai_private.upsert_point_object_analysis_run(
  text, text, text, text, jsonb, text, jsonb, jsonb, jsonb, text, text, text, text, text
) from public, anon, authenticated, service_role;
revoke all on function geoai_private.list_point_object_analysis_runs(text, integer)
  from public, anon, authenticated, service_role;

drop function if exists geoai_private.upsert_point_object_analysis_run(
  text, text, text, text, jsonb, text, jsonb, jsonb, jsonb, text, text, text, text, text
);
drop function if exists geoai_private.list_point_object_analysis_runs(text, integer);

-- Intentionally retained:
--   * public.analysis_runs data;
--   * point-object creator-ownership restrictive RLS policies.
-- Removing either is a separate destructive/security decision.

commit;
