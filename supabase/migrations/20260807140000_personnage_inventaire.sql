-- ============================================================================
-- MODE SESSION — Phase 2.5 : inventaire des personnages
-- ============================================================================
-- Préalable à l'onglet « Sac » de l'interface PJ (Phase 3). La fiche stockait
-- l'équipement en texte libre (`personnages.equipement`) et l'or dans
-- `personnages.pieces_or`. On ajoute un inventaire STRUCTURÉ + les 5 monnaies.
--
-- 100 % idempotent. RLS via les fonctions fn_* SECURITY DEFINER existantes
-- (fn_owns_personnage, fn_is_mj_of_personnage) → zéro récursion.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- Helper touch updated_at (idempotent : identique à la migration Phase 1).
-- ----------------------------------------------------------------------------
create or replace function public.mode_session_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;


-- ----------------------------------------------------------------------------
-- Table personnage_inventaire
-- ----------------------------------------------------------------------------
create table if not exists public.personnage_inventaire (
  id              uuid primary key default gen_random_uuid(),
  personnage_id   uuid not null references public.personnages(id) on delete cascade,
  nom             text not null default '',
  type            text not null default 'objet'
                    check (type in ('arme','armure','consommable','outil','objet')),
  quantite        int not null default 1,
  usages_max      int,
  usages_utilises int not null default 0,
  description     text not null default '',
  equipe          boolean not null default false,
  ordre           int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists personnage_inventaire_personnage_idx
  on public.personnage_inventaire(personnage_id, ordre);

drop trigger if exists trg_personnage_inventaire_touch on public.personnage_inventaire;
create trigger trg_personnage_inventaire_touch
  before update on public.personnage_inventaire
  for each row execute function public.mode_session_touch_updated_at();


-- ----------------------------------------------------------------------------
-- Monnaie : 5 colonnes sur personnages (pc/pa/pe/po/pp)
-- ----------------------------------------------------------------------------
-- pc = cuivre, pa = argent, pe = électrum, po = or, pp = platine.
alter table public.personnages
  add column if not exists pc int not null default 0,
  add column if not exists pa int not null default 0,
  add column if not exists pe int not null default 0,
  add column if not exists po int not null default 0,
  add column if not exists pp int not null default 0;

-- Reprise (best-effort) de l'or historique `pieces_or` vers la nouvelle `po`.
update public.personnages
  set po = pieces_or
  where coalesce(pieces_or, 0) > 0 and coalesce(po, 0) = 0;


-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------
-- Joueur propriétaire : lecture/écriture. MJ d'un scénario que ce joueur a
-- rejoint : lecture/écriture (dégâts/loot en séance). Personne d'autre.
alter table public.personnage_inventaire enable row level security;

drop policy if exists personnage_inventaire_select on public.personnage_inventaire;
create policy personnage_inventaire_select on public.personnage_inventaire
  for select to authenticated
  using (
    public.fn_owns_personnage(personnage_id)
    or public.fn_is_mj_of_personnage(personnage_id)
  );

drop policy if exists personnage_inventaire_insert on public.personnage_inventaire;
create policy personnage_inventaire_insert on public.personnage_inventaire
  for insert to authenticated
  with check (
    public.fn_owns_personnage(personnage_id)
    or public.fn_is_mj_of_personnage(personnage_id)
  );

drop policy if exists personnage_inventaire_update on public.personnage_inventaire;
create policy personnage_inventaire_update on public.personnage_inventaire
  for update to authenticated
  using (
    public.fn_owns_personnage(personnage_id)
    or public.fn_is_mj_of_personnage(personnage_id)
  )
  with check (
    public.fn_owns_personnage(personnage_id)
    or public.fn_is_mj_of_personnage(personnage_id)
  );

drop policy if exists personnage_inventaire_delete on public.personnage_inventaire;
create policy personnage_inventaire_delete on public.personnage_inventaire
  for delete to authenticated
  using (
    public.fn_owns_personnage(personnage_id)
    or public.fn_is_mj_of_personnage(personnage_id)
  );


-- ----------------------------------------------------------------------------
-- Realtime (le MJ et le joueur peuvent tous deux éditer → synchro live).
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'personnage_inventaire'
  ) then
    alter publication supabase_realtime add table public.personnage_inventaire;
  end if;
end $$;

alter table public.personnage_inventaire replica identity full;
