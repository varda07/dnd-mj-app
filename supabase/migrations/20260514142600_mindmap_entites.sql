-- ============================================================================
-- Carte mentale : nœuds liés à des entités existantes
-- ============================================================================
-- À exécuter dans le SQL Editor de Supabase. Idempotent.
--
-- Permet de créer un nœud de carte mentale rattaché à une entité réelle de
-- l'app (PNJ, ennemi, item, map). Le nœud porte alors :
--   - entite_type : 'pnj' | 'ennemi' | 'item' | 'map'
--   - entite_id   : uuid de la ligne dans la table correspondante
-- Pour un nœud « libre » (lieu / pnj / evenement / indice / custom) les deux
-- colonnes restent NULL.
--
-- On n'utilise pas de FK polymorphique (PostgreSQL ne les supporte pas) :
-- l'intégrité de entite_id est gérée côté application.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Étend la check constraint sur `type` pour autoriser les types entités
-- ----------------------------------------------------------------------------
-- Avant : ('lieu','pnj','evenement','indice','custom')
-- Après : + 'ennemi','item','map' (un nœud lié à un ennemi a type='ennemi'…)

do $$
declare
  cst text;
begin
  select conname into cst
    from pg_constraint
    where conrelid = 'public.mindmap_noeuds'::regclass
      and contype = 'c'
      and conname = 'mindmap_noeuds_type_check';
  if cst is not null then
    execute 'alter table public.mindmap_noeuds drop constraint mindmap_noeuds_type_check';
  end if;
end $$;

alter table public.mindmap_noeuds
  add constraint mindmap_noeuds_type_check
  check (type in ('lieu', 'pnj', 'evenement', 'indice', 'custom', 'ennemi', 'item', 'map'));


-- ----------------------------------------------------------------------------
-- 2. Colonnes entite_type / entite_id
-- ----------------------------------------------------------------------------

alter table public.mindmap_noeuds
  add column if not exists entite_type text,
  add column if not exists entite_id uuid;

-- Cohérence : soit les deux NULL (nœud libre), soit les deux renseignés avec
-- un entite_type valide.
alter table public.mindmap_noeuds
  drop constraint if exists mindmap_noeuds_entite_consistency;
alter table public.mindmap_noeuds
  add constraint mindmap_noeuds_entite_consistency
  check (
    (entite_type is null and entite_id is null)
    or (entite_type in ('pnj', 'ennemi', 'item', 'map') and entite_id is not null)
  );

create index if not exists idx_mindmap_noeuds_entite
  on public.mindmap_noeuds(entite_type, entite_id);


-- ============================================================================
-- Fin de la migration. RLS inchangée : les nœuds restent protégés via
-- mindmap_id → mindmaps → scenarios (cf. security_rls_complete.sql).
-- ============================================================================
