-- ============================================================================
-- Roadmap Affinement 4.3 — Tutoriels contextuels "Première fois"
-- ----------------------------------------------------------------------------
-- Ajoute une colonne tutoriels_vus à profiles (jsonb : { key: timestamp })
-- pour mémoriser les tooltips déjà affichés et ne pas les ressortir.
-- ============================================================================

alter table public.profiles
  add column if not exists tutoriels_vus jsonb not null default '{}'::jsonb;
