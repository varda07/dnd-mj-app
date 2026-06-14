-- ============================================================================
-- ROADMAP V1 — Phase 2 : Tables d'effets personnalisées enrichies
-- ----------------------------------------------------------------------------
-- Ajoute à tables_effets_custom :
--   • de            — type de dé (d4..d100), pour le roll configurable (2.2)
--   • public        — partage communautaire (2.5)
--   • declencheur_type / declencheur_ref — liaison à un déclencheur (2.4)
-- La pondération (2.3) est portée par le JSON `effets` (champ optionnel `poids`)
-- et ne nécessite aucun changement de schéma.
-- RLS : on ajoute la lecture des tables publiques par tout utilisateur connecté
-- (pour l'import communautaire), sans toucher aux policies existantes.
-- ============================================================================

alter table public.tables_effets_custom
  add column if not exists de text not null default 'd100'
    check (de in ('d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100')),
  add column if not exists public boolean not null default false,
  add column if not exists declencheur_type text
    check (declencheur_type is null or declencheur_type in ('sort', 'item', 'lieu')),
  add column if not exists declencheur_ref text;

create index if not exists tables_effets_custom_public_idx
  on public.tables_effets_custom(public)
  where public = true;

-- ------------------------------------------------------------------
-- RLS : lecture des tables publiques (import communautaire). La policy
-- "tables_effets_custom_select" (propriétaire) reste en place ; on ajoute
-- une policy non exclusive pour les tables marquées publiques.
-- ------------------------------------------------------------------
drop policy if exists "tables_effets_custom_select_public" on public.tables_effets_custom;
create policy "tables_effets_custom_select_public" on public.tables_effets_custom
  for select to authenticated using (public = true);

comment on column public.tables_effets_custom.de is
  'V1 2.2 — type de dé utilisé pour le roll (d4..d100).';
comment on column public.tables_effets_custom.public is
  'V1 2.5 — table partagée dans la communauté (importable par tous).';
comment on column public.tables_effets_custom.declencheur_type is
  'V1 2.4 — type de déclencheur lié (sort/item/lieu) ou NULL.';
comment on column public.tables_effets_custom.declencheur_ref is
  'V1 2.4 — référence libre du déclencheur (nom du sort/item/lieu).';
