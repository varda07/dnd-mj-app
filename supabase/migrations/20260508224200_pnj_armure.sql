-- ============================================================================
-- PNJ : ajout de la classe d'armure
-- ============================================================================
-- À exécuter dans le SQL Editor de Supabase. Idempotent.
-- Ajoute une colonne `armure` (classe d'armure / CA) aux PNJ.
-- ============================================================================

alter table public.pnj
  add column if not exists armure integer not null default 10;

-- ============================================================================
-- Fin de la migration.
-- ============================================================================
