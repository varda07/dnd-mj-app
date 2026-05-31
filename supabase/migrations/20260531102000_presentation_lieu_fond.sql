-- ============================================================================
-- Roadmap Modes 1.7 — Image de fond du lieu en mode présentation
-- ----------------------------------------------------------------------------
-- Étend presentation_etats avec :
--   - lieu_image_fond text  : URL de l'image de fond
--   - lieu_image_visible boolean : toggle MJ pour afficher aux joueurs
-- ============================================================================

alter table public.presentation_etats
  add column if not exists lieu_image_fond text,
  add column if not exists lieu_image_visible boolean not null default true;
