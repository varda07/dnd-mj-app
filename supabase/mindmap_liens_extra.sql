-- ============================================================================
-- MindMap : couleur et annotation sur les liens
-- ============================================================================
-- À exécuter dans le SQL Editor de Supabase. Idempotent.
-- Ajoute deux colonnes à public.mindmap_liens :
--   - couleur text default 'auto' : clé de palette ou 'auto' (couleur dérivée
--     des types des deux nœuds)
--   - annotation text default ''  : label court affiché sur le lien
-- ============================================================================

alter table public.mindmap_liens
  add column if not exists couleur text default 'auto',
  add column if not exists annotation text default '';

-- ============================================================================
-- Fin de la migration.
-- ============================================================================
