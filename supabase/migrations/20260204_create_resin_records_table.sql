-- Create resin_records table
create table if not exists public.resin_records (
  id text primary key,
  project_id text not null references public.projects(id) on delete cascade,
  project_name text,
  material text not null,
  with_oil boolean default false,
  total_grams numeric not null,
  component1_grams numeric not null,
  component2_grams numeric default 0,
  oil_grams numeric default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create index for efficient queries
create index if not exists resin_records_project_id_idx on public.resin_records(project_id);
create index if not exists resin_records_created_at_idx on public.resin_records(created_at);

-- Enable RLS
alter table public.resin_records enable row level security;

-- Allow authenticated users to read all resin records
create policy "Allow authenticated users to read resin records"
  on public.resin_records
  for select
  to authenticated
  using (true);

-- Allow authenticated users to insert resin records
create policy "Allow authenticated users to insert resin records"
  on public.resin_records
  for insert
  to authenticated
  with check (true);

-- Allow authenticated users to delete resin records
create policy "Allow authenticated users to delete resin records"
  on public.resin_records
  for delete
  to authenticated
  using (true);

-- Allow authenticated users to update resin records
create policy "Allow authenticated users to update resin records"
  on public.resin_records
  for update
  to authenticated
  using (true)
  with check (true);
