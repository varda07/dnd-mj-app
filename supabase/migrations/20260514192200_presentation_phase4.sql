-- ============================================================================
-- Mode Présentation — Phase 4 : galerie d'images, ambiance sonore, ambiance
-- visuelle
-- ============================================================================
-- À exécuter dans le SQL Editor de Supabase. Idempotent.
--
-- Ajoute à `presentation_etats` :
--   - image_plein_ecran  : URL de l'image affichée plein écran (ou null)
--   - lieu_son           : URL d'une ambiance sonore jouée en boucle (ou null)
--   - lieu_son_volume    : volume 0–100 de cette ambiance
--   - ambiance           : 'auto' | 'combat' | 'mystere' | 'exploration' —
--                          pilote le dégradé cinématique du fond
--
-- RLS inchangée — les policies existantes de presentation_etats couvrent les
-- nouvelles colonnes. La table est déjà publiée en realtime.
-- ============================================================================

alter table public.presentation_etats
  add column if not exists image_plein_ecran text,
  add column if not exists lieu_son text,
  add column if not exists lieu_son_volume integer not null default 50,
  add column if not exists ambiance text not null default 'auto';

-- ============================================================================
-- Fin de la migration.
-- ============================================================================
