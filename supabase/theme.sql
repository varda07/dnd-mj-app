-- ============================================================================
-- Table profiles + colonne theme
-- ============================================================================
-- À exécuter dans le SQL Editor de Supabase. Idempotent.
--
-- Crée la table profiles liée 1:1 à auth.users (si absente) et ajoute la
-- colonne theme qui stocke la clé du thème visuel choisi par l'utilisateur.
-- ============================================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  theme text default 'runique',
  created_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists theme text default 'runique';


-- RLS : chaque utilisateur ne voit/modifie que sa propre ligne
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (auth.uid() = id);
