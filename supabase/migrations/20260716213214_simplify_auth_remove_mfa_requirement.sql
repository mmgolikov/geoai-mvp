-- Product simplification: a permanent, non-anonymous Supabase identity is the
-- authentication boundary for the current MVP. The legacy require_aal2() symbol
-- is retained so existing API function bodies do not need a risky wholesale
-- rewrite, but it now delegates to a permanent-user identity check and does
-- not inspect or require an MFA assurance level.

begin;

create or replace function geoai_private.require_permanent_identity()
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'a permanent non-anonymous identity is required' using errcode = '42501';
  end if;

  if coalesce((select auth.jwt() ->> 'is_anonymous'), 'true') <> 'false' then
    raise exception 'a permanent non-anonymous identity is required' using errcode = '42501';
  end if;
end
$$;

revoke all on function geoai_private.require_permanent_identity() from public, anon, service_role;
grant execute on function geoai_private.require_permanent_identity() to authenticated;

comment on function geoai_private.require_permanent_identity() is
  'Requires a permanent non-anonymous Supabase identity. This does not assert verified email or phone ownership.';

create or replace function geoai_private.require_aal2()
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform geoai_private.require_permanent_identity();
end
$$;

comment on function geoai_private.require_aal2() is
  'Legacy compatibility wrapper. Calls require_permanent_identity(); MFA/AAL2 and verified email or phone ownership are not asserted.';

commit;
