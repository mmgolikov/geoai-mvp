-- Reconciled pre-ledger bootstrap for clean replay.
--
-- The live development project created this table on 2026-07-04 before the
-- Supabase migration ledger began. Later immutable ledger migrations assume it
-- exists. Before any remote db push, the operator must verify the live schema
-- fingerprint and mark this version applied with `supabase migration repair`;
-- the table itself must not be recreated or overwritten on that live project.

create table if not exists public.geoai_healthcheck (
  id bigint primary key,
  name text not null,
  created_at timestamptz default now()
);

alter table public.geoai_healthcheck enable row level security;

drop policy if exists "public can read geoai healthcheck"
  on public.geoai_healthcheck;
create policy "public can read geoai healthcheck"
  on public.geoai_healthcheck
  for select
  to anon, authenticated
  using (true);

insert into public.geoai_healthcheck (id, name)
values (1, 'GeoAI Supabase connected')
on conflict (id) do nothing;

revoke all on table public.geoai_healthcheck from public, anon, authenticated;
grant select on table public.geoai_healthcheck to anon, authenticated;
