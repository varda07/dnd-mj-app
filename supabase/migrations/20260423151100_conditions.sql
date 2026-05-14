-- ============================================================================
-- Conditions D&D 5e sur personnages et ennemis
-- ============================================================================
-- À exécuter dans le SQL Editor de Supabase. Idempotent.
-- Ajoute une colonne JSONB `conditions` (tableau de clés de conditions) à
-- personnages et ennemis. Le détail (icône, description, effets) vit côté
-- client dans app/data/conditions.ts — la base ne stocke que les clés.
-- ============================================================================

alter table public.personnages
  add column if not exists conditions jsonb not null default '[]'::jsonb;

alter table public.ennemis
  add column if not exists conditions jsonb not null default '[]'::jsonb;

-- Index GIN pour accélérer d'éventuelles requêtes "créatures avec condition X".
create index if not exists personnages_conditions_gin on public.personnages using gin (conditions);
create index if not exists ennemis_conditions_gin on public.ennemis using gin (conditions);

-- ============================================================================
-- Fin de la migration. Pour vérifier :
--   select column_name, data_type, column_default
--     from information_schema.columns
--     where table_schema = 'public'
--       and column_name = 'conditions'
--       and table_name in ('personnages', 'ennemis');
-- ============================================================================
