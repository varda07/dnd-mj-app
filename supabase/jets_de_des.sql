-- Table jets_de_des
create table if not exists public.jets_de_des (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type_de text not null,
  nombre int not null,
  resultats int[] not null,
  partage boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists jets_de_des_created_at_idx on public.jets_de_des(created_at desc);
create index if not exists jets_de_des_user_id_idx on public.jets_de_des(user_id);

alter table public.jets_de_des enable row level security;

-- Tout le monde (connecté) peut lire les jets partagés
create policy "jets_select_partages" on public.jets_de_des
  for select using (partage = true or auth.uid() = user_id);

-- Chacun ne peut insérer que ses propres jets
create policy "jets_insert_own" on public.jets_de_des
  for insert with check (auth.uid() = user_id);

-- Chacun peut supprimer ses propres jets
create policy "jets_delete_own" on public.jets_de_des
  for delete using (auth.uid() = user_id);
