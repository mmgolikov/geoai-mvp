create table if not exists public.comparison_sets (
  id uuid primary key default gen_random_uuid(),
  comparison_key text not null unique,
  project_id uuid references public.projects(id) on delete set null,
  project_key text,
  title text not null,
  item_count integer not null default 0,
  items jsonb not null default '[]'::jsonb,
  recommendation text,
  source_lineage jsonb not null default '{}'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.uploaded_dataset_records (
  id uuid primary key default gen_random_uuid(),
  dataset_key text not null unique,
  project_id uuid references public.projects(id) on delete set null,
  project_key text,
  name text not null,
  dataset_type text not null,
  status text not null,
  row_count integer,
  feature_count integer,
  columns jsonb not null default '[]'::jsonb,
  source_mode text,
  official_status text,
  uploaded_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists comparison_sets_project_key_idx on public.comparison_sets(project_key);
create index if not exists comparison_sets_created_at_idx on public.comparison_sets(created_at desc);
create index if not exists uploaded_dataset_records_project_key_idx on public.uploaded_dataset_records(project_key);
create index if not exists uploaded_dataset_records_uploaded_at_idx on public.uploaded_dataset_records(uploaded_at desc);

drop trigger if exists set_comparison_sets_updated_at on public.comparison_sets;
create trigger set_comparison_sets_updated_at before update on public.comparison_sets
for each row execute function public.set_updated_at();

drop trigger if exists set_uploaded_dataset_records_updated_at on public.uploaded_dataset_records;
create trigger set_uploaded_dataset_records_updated_at before update on public.uploaded_dataset_records
for each row execute function public.set_updated_at();

comment on table public.comparison_sets is 'GeoAI comparison set payloads for project workspace v0.8. Source lineage snapshots must not include secrets.';
comment on table public.uploaded_dataset_records is 'Uploaded dataset metadata only. Large file/blob storage is intentionally out of scope for v0.8.';
