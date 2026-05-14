-- ============================================================================
-- Présentation — entités additionnelles affichées sur l'écran joueurs
-- ============================================================================
-- À exécuter dans le SQL Editor de Supabase. Idempotent.
--
-- Étend `presentation_etats` avec deux tableaux d'UUID :
--   - personnages_ids : PJ à afficher en plus de ceux liés au scénario
--   - ennemis_ids     : ennemis à afficher en plus de ceux liés au scénario
--
-- Le client présentation affiche = (entités où scenario_id = X) ∪ (IDs ici).
-- Permet d'inviter un PJ d'une autre table ou un ennemi du bestiaire sans
-- avoir à modifier ses scenario_id (souvent vide pour les ennemis génériques).
-- ============================================================================

alter table public.presentation_etats
  add column if not exists personnages_ids uuid[] not null default '{}';

alter table public.presentation_etats
  add column if not exists ennemis_ids uuid[] not null default '{}';

-- ============================================================================
-- Fin de la migration.
-- ============================================================================
