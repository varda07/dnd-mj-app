-- Table maps
create table if not exists public.maps (
  id uuid primary key default gen_random_uuid(),
  mj_id uuid not null references auth.users(id) on delete cascade,
  nom text not null,
  description text default '',
  image_url text default '',
  created_at timestamptz not null default now()
);

create index if not exists maps_mj_id_idx on public.maps(mj_id);

-- Row Level Security : chaque MJ ne voit et ne modifie que ses propres cartes
alter table public.maps enable row level security;

create policy "maps_select_own" on public.maps
  for select using (auth.uid() = mj_id);

create policy "maps_insert_own" on public.maps
  for insert with check (auth.uid() = mj_id);

create policy "maps_update_own" on public.maps
  for update using (auth.uid() = mj_id);

create policy "maps_delete_own" on public.maps
  for delete using (auth.uid() = mj_id);

-- Storage : bucket public "maps" pour les images
insert into storage.buckets (id, name, public)
values ('maps', 'maps', true)
on conflict (id) do nothing;

create policy "maps_storage_read" on storage.objects
  for select using (bucket_id = 'maps');

create policy "maps_storage_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'maps'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "maps_storage_delete_own" on storage.objects
  for delete using (
    bucket_id = 'maps'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
