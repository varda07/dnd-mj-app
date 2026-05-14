-- ============================================================================
-- PNJ (personnages non-joueurs) — table + RLS + lien scénarios
-- ============================================================================
-- À exécuter dans le SQL Editor de Supabase. Idempotent.
--
-- Crée la table `pnj` sur le modèle des ennemis mais avec des champs
-- narratifs supplémentaires (role, personnalite, secrets). Ajoute aussi
-- 'pnj' comme element_type valide dans scenario_liens.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Table pnj
-- ----------------------------------------------------------------------------

create table if not exists public.pnj (
  id uuid primary key default gen_random_uuid(),
  mj_id uuid not null references auth.users(id) on delete cascade,
  nom text not null,
  race text,
  role text,
  description text,
  personnalite text,
  secrets text,
  image_url text,
  hp_max integer not null default 10,
  hp_actuel integer not null default 10,
  force integer not null default 10,
  dexterite integer not null default 10,
  constitution integer not null default 10,
  intelligence integer not null default 10,
  sagesse integer not null default 10,
  charisme integer not null default 10,
  notes text,
  public boolean not null default false,
  nb_copies integer not null default 0,
  auteur_username text,
  created_at timestamptz not null default now()
);

create index if not exists pnj_mj_id_idx on public.pnj(mj_id);
create index if not exists pnj_public_idx on public.pnj(public) where public = true;


-- ----------------------------------------------------------------------------
-- 2. RLS — propriétaire full, lecture publique si public=true
-- ----------------------------------------------------------------------------

alter table public.pnj enable row level security;

drop policy if exists "pnj_select" on public.pnj;
create policy "pnj_select" on public.pnj
  for select using (auth.uid() = mj_id or public = true);

drop policy if exists "pnj_insert" on public.pnj;
create policy "pnj_insert" on public.pnj
  for insert with check (auth.uid() = mj_id);

drop policy if exists "pnj_update" on public.pnj;
create policy "pnj_update" on public.pnj
  for update using (auth.uid() = mj_id);

drop policy if exists "pnj_delete" on public.pnj;
create policy "pnj_delete" on public.pnj
  for delete using (auth.uid() = mj_id);


-- ----------------------------------------------------------------------------
-- 3. RPC incrementer_nb_copies : ajoute 'pnj' à la liste blanche
-- ----------------------------------------------------------------------------
-- La fonction existait déjà avec ('scenarios','personnages','ennemis','items',
-- 'maps','sorts'). On la recrée avec 'pnj' en plus.

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
  if p_table not in ('scenarios', 'personnages', 'ennemis', 'items', 'maps', 'sorts', 'pnj') then
    raise exception 'Table invalide : %', p_table;
  end if;
  execute format(
    'update public.%I set nb_copies = coalesce(nb_copies, 0) + 1 where id = $1 and public = true',
    p_table
  ) using p_id;
end;
$$;

grant execute on function public.incrementer_nb_copies(text, uuid) to authenticated;


-- ----------------------------------------------------------------------------
-- 4. scenario_liens : accepte 'pnj' comme element_type
-- ----------------------------------------------------------------------------
-- On drop la contrainte existante (nom auto-généré) puis on la recrée avec
-- 'pnj' ajouté. On trouve le nom exact de la contrainte via information_schema
-- pour rester robuste à une future variation.

do $$
declare
  cst text;
begin
  select conname into cst
    from pg_constraint
    where conrelid = 'public.scenario_liens'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%element_type%';
  if cst is not null then
    execute format('alter table public.scenario_liens drop constraint %I', cst);
  end if;
end $$;

alter table public.scenario_liens
  add constraint scenario_liens_element_type_check
  check (element_type in ('ennemi', 'item', 'map', 'pnj'));


-- ============================================================================
-- Fin de la migration.
-- ============================================================================
