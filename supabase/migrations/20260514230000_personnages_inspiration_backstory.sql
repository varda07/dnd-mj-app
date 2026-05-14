-- ============================================================================
-- ROADMAP 3.6 (inspirations tracker) + 3.4 (backstory)
-- ============================================================================
-- À appliquer via `supabase db push`. Idempotent.
--
--   - inspiration_max     : nombre de points d'inspiration que le perso peut
--                           détenir (1 par défaut, configurable jusqu'à 5)
--   - inspiration_points  : points d'inspiration actuellement détenus (0..max)
--   - backstory           : récit libre du personnage (générable, éditable)
--
-- La colonne booléenne `inspiration` existante est conservée (compat) et
-- maintenue synchronisée côté client (= inspiration_points > 0).
-- RLS inchangée — les policies de `personnages` couvrent les nouvelles colonnes.
-- ============================================================================

alter table public.personnages
  add column if not exists inspiration_max integer not null default 1,
  add column if not exists inspiration_points integer not null default 0,
  add column if not exists backstory text not null default '';

-- ============================================================================
-- Fin de la migration.
-- ============================================================================
