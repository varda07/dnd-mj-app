-- ============================================================================
-- Roadmap Modes 1.6 — Bibliothèque sonore personnelle (sound library)
-- ----------------------------------------------------------------------------
-- Table sons_user : URLs de sons (uploadés dans Storage ou externes) tagués
-- par catégorie. Utilisés par le mode auto ambiance.
-- ============================================================================

create table if not exists public.sons_user (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  categorie text not null check (categorie in (
    'combat','exploration','dialogue','suspense','repos','boss','city','nature','dungeon','horror'
  )),
  nom text not null,
  url text not null,
  tags text[] not null default '{}'::text[],
  volume int not null default 60 check (volume between 0 and 100),
  created_at timestamptz not null default now()
);
create index if not exists sons_user_owner_idx on public.sons_user(user_id, categorie, created_at desc);

alter table public.sons_user enable row level security;

drop policy if exists "sons_user_owner_select" on public.sons_user;
create policy "sons_user_owner_select" on public.sons_user
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "sons_user_owner_insert" on public.sons_user;
create policy "sons_user_owner_insert" on public.sons_user
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "sons_user_owner_update" on public.sons_user;
create policy "sons_user_owner_update" on public.sons_user
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "sons_user_owner_delete" on public.sons_user;
create policy "sons_user_owner_delete" on public.sons_user
  for delete to authenticated using (user_id = auth.uid());

-- Note : si tu veux uploader des fichiers, crée aussi un bucket Storage
-- "sons" (public read, write authenticated) via le dashboard Supabase.
