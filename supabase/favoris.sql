-- ============================================================================
-- Favoris — épinglage d'éléments par utilisateur
-- ============================================================================
-- À exécuter dans le SQL Editor de Supabase. Idempotent.
--
-- Stockage en jsonb sur profiles : { "scenarios": [...uuid...], "personnages":
-- [...uuid...], "ennemis": [...], "pnj": [...], "items": [...], "maps": [...],
-- "sorts": [...] }. On reste sur du jsonb plutôt qu'une table dédiée car :
--   - lecture/écriture toujours par batch (toute la map d'un coup)
--   - pas de jointure nécessaire (on filtre côté client par .includes())
--   - une seule ligne touchée par utilisateur
-- ============================================================================

alter table public.profiles
  add column if not exists favoris jsonb not null default '{}'::jsonb;

-- ============================================================================
-- Fin de la migration.
-- ============================================================================
