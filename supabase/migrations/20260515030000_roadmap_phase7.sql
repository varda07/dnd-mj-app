-- ============================================================================
-- ROADMAP MASTER SCREEN — Phase 7 : Sorts
-- ============================================================================
-- À appliquer via `supabase db push`. Idempotent.
-- Couvre : 7.3 inventaire de composantes matérielles.
-- (7.5 création de sorts custom n'a pas besoin de SQL — la table `sorts`
--  existe déjà avec toutes les colonnes nécessaires.)
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 7.3 — Composantes inventory (tracker visuel)
-- ----------------------------------------------------------------------------
-- Liste libre de composantes matérielles possédées par le personnage.
-- Format : [{ "nom": "Poudre de diamant", "quantite": 3 }, ...]
-- Aucune consommation automatique : purement informatif (✓ / ✗ sur les sorts).
alter table public.personnages
  add column if not exists composantes jsonb not null default '[]'::jsonb;


-- ============================================================================
-- Fin de la migration Phase 7.
-- ============================================================================
