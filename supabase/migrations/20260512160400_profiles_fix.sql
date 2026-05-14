-- ============================================================================
-- Fix profiles : ajoute les colonnes manquantes + verrouille les policies RLS
-- ============================================================================
-- À exécuter dans le SQL Editor de Supabase. Idempotent.
--
-- Pourquoi : le code (dashboard, onboarding) lit/écrit `role` et
-- `onboarding_complete`, mais aucune migration ne créait `role`. Le upsert
-- échoue alors avec une erreur PGRST204 "column 'role' not found" ou 42703.
--
-- En plus, on remet le triplet de policies RLS minimal pour que
-- l'utilisateur puisse SELECT/INSERT/UPDATE sa propre ligne profiles.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Garantit la table profiles (sans rien casser si elle existe déjà)
-- ----------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);


-- ----------------------------------------------------------------------------
-- 2. Colonnes attendues par le code applicatif
-- ----------------------------------------------------------------------------

-- Identité affichée + rôle (mj/joueur) choisis pendant l'onboarding
alter table public.profiles
  add column if not exists username text;

alter table public.profiles
  add column if not exists role text default 'joueur';

-- Tutoriel terminé : permet de ne pas réouvrir la modale au prochain login
alter table public.profiles
  add column if not exists onboarding_complete boolean not null default false;

-- Présentes ailleurs dans le code (theme.sql / langue.sql) — défensif, on
-- s'assure qu'elles existent même si l'utilisateur n'a pas tout exécuté.
alter table public.profiles
  add column if not exists theme text default 'runique';

alter table public.profiles
  add column if not exists locale text default 'fr';

-- Favoris (épingles) — colonne ajoutée par favoris.sql, on la sécurise ici
alter table public.profiles
  add column if not exists favoris jsonb not null default '{}'::jsonb;


-- ----------------------------------------------------------------------------
-- 3. Contrainte de valeurs pour role (sans casser des lignes existantes)
-- ----------------------------------------------------------------------------
-- On normalise d'abord les valeurs hors-liste, puis on (re)pose la contrainte.

update public.profiles
  set role = 'joueur'
  where role is null or role not in ('mj', 'joueur');

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_role_check'
  ) then
    alter table public.profiles drop constraint profiles_role_check;
  end if;
end $$;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('mj', 'joueur'));


-- ----------------------------------------------------------------------------
-- 4. RLS : chaque utilisateur lit/écrit uniquement sa propre ligne
-- ----------------------------------------------------------------------------

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated
  with check (auth.uid() = id);

-- L'UPDATE doit avoir USING *et* WITH CHECK, sinon un upsert avec onConflict
-- échoue silencieusement côté supabase-js (l'erreur remonte vide).
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);


-- ----------------------------------------------------------------------------
-- 5. Vérifications utiles (à lancer manuellement après la migration)
-- ----------------------------------------------------------------------------
-- select column_name, data_type, column_default, is_nullable
--   from information_schema.columns
--   where table_schema = 'public' and table_name = 'profiles'
--   order by ordinal_position;
--
-- select polname, polcmd, pg_get_expr(polqual, polrelid) as using_expr,
--        pg_get_expr(polwithcheck, polrelid) as check_expr
--   from pg_policy
--   where polrelid = 'public.profiles'::regclass;


-- ============================================================================
-- Fin de la migration.
-- ============================================================================
