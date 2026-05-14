-- ============================================================================
-- Bibliothèque communautaire : partage d'éléments entre utilisateurs
-- ============================================================================
-- À exécuter dans le SQL Editor de Supabase. Idempotent.
-- Ajoute public / nb_copies / auteur_username sur scenarios, personnages,
-- ennemis, items, maps, sorts. Ouvre la lecture des éléments publics à tous
-- les utilisateurs connectés, et expose une RPC pour incrémenter les copies
-- sans donner de droit d'écriture complet sur les lignes d'autrui.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. COLONNES COMMUNAUTAIRES
-- ----------------------------------------------------------------------------

alter table public.scenarios
  add column if not exists public boolean not null default false,
  add column if not exists nb_copies integer not null default 0,
  add column if not exists auteur_username text;

alter table public.personnages
  add column if not exists public boolean not null default false,
  add column if not exists nb_copies integer not null default 0,
  add column if not exists auteur_username text;

alter table public.ennemis
  add column if not exists public boolean not null default false,
  add column if not exists nb_copies integer not null default 0,
  add column if not exists auteur_username text;

alter table public.items
  add column if not exists public boolean not null default false,
  add column if not exists nb_copies integer not null default 0,
  add column if not exists auteur_username text;

alter table public.maps
  add column if not exists public boolean not null default false,
  add column if not exists nb_copies integer not null default 0,
  add column if not exists auteur_username text;

alter table public.sorts
  add column if not exists public boolean not null default false,
  add column if not exists nb_copies integer not null default 0,
  add column if not exists auteur_username text;


-- ----------------------------------------------------------------------------
-- 2. INDEXES pour accélérer le filtrage "public = true"
-- ----------------------------------------------------------------------------

create index if not exists scenarios_public_idx on public.scenarios(public) where public = true;
create index if not exists personnages_public_idx on public.personnages(public) where public = true;
create index if not exists ennemis_public_idx on public.ennemis(public) where public = true;
create index if not exists items_public_idx on public.items(public) where public = true;
create index if not exists maps_public_idx on public.maps(public) where public = true;
create index if not exists sorts_public_idx on public.sorts(public) where public = true;


-- ----------------------------------------------------------------------------
-- 3. RLS : lecture publique en plus des policies existantes
-- ----------------------------------------------------------------------------
-- Les policies sont permissives par défaut : un utilisateur peut lire une
-- ligne si N'IMPORTE LAQUELLE des policies SELECT l'autorise. On ajoute donc
-- une policy dédiée "public read" qui n'écrase pas les droits existants du
-- propriétaire mais ajoute le cas "public = true".

drop policy if exists "scenarios_public_read" on public.scenarios;
create policy "scenarios_public_read" on public.scenarios
  for select using (public = true);

drop policy if exists "personnages_public_read" on public.personnages;
create policy "personnages_public_read" on public.personnages
  for select using (public = true);

drop policy if exists "ennemis_public_read" on public.ennemis;
create policy "ennemis_public_read" on public.ennemis
  for select using (public = true);

drop policy if exists "items_public_read" on public.items;
create policy "items_public_read" on public.items
  for select using (public = true);

drop policy if exists "maps_public_read" on public.maps;
create policy "maps_public_read" on public.maps
  for select using (public = true);

drop policy if exists "sorts_public_read" on public.sorts;
create policy "sorts_public_read" on public.sorts
  for select using (public = true);


-- ----------------------------------------------------------------------------
-- 4. RPC : incrémenter nb_copies sans donner de droit UPDATE général
-- ----------------------------------------------------------------------------
-- SECURITY DEFINER permet d'incrémenter la colonne nb_copies d'une ligne
-- publique appartenant à un autre utilisateur, sans ouvrir un UPDATE général
-- sur la table (qui laisserait modifier n'importe quel champ).
-- L'appelant doit être authentifié. Le nom de table est validé contre une
-- liste blanche pour éviter toute injection.

create or replace function public.incrementer_nb_copies(p_table text, p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentification requise';
  end if;
  if p_table not in ('scenarios', 'personnages', 'ennemis', 'items', 'maps', 'sorts') then
    raise exception 'Table invalide : %', p_table;
  end if;
  execute format(
    'update public.%I set nb_copies = coalesce(nb_copies, 0) + 1 where id = $1 and public = true',
    p_table
  ) using p_id;
end;
$$;

grant execute on function public.incrementer_nb_copies(text, uuid) to authenticated;


-- ============================================================================
-- Fin de la migration. Pour vérifier :
--   select column_name from information_schema.columns
--     where table_schema = 'public'
--       and table_name = 'scenarios'
--       and column_name in ('public', 'nb_copies', 'auteur_username');
-- Doit retourner 3 lignes. Idem pour personnages / ennemis / items / maps / sorts.
-- ============================================================================
