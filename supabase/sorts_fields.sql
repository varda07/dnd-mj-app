-- ============================================================================
-- Ajout des colonnes étendues à la table sorts
-- ============================================================================
-- À exécuter dans le SQL Editor de Supabase. Idempotent (IF NOT EXISTS).
-- Ajoute trois colonnes textuelles permettant de décrire un sort comme une
-- vraie carte D&D : temps d'incantation, portée, durée.
-- ============================================================================

ALTER TABLE sorts
  ADD COLUMN IF NOT EXISTS temps_incantation text,
  ADD COLUMN IF NOT EXISTS portee text,
  ADD COLUMN IF NOT EXISTS duree text;
