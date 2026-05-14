-- ============================================================================
-- Personnalisation de la page d'accueil
-- ============================================================================
-- À exécuter dans le SQL Editor de Supabase. Idempotent.
--
-- Stockage côté `profiles` :
--   dashboard_config : jsonb
--     { "active": "uuid-de-config-active-ou-null",
--       "configs": [
--         { "id": "uuid", "nom": "Setup combat",
--           "widgets": [
--             { "type": "carte_mentale", "x": 0, "y": 0, "w": 2, "h": 2 },
--             { "type": "combat", "x": 2, "y": 0, "w": 2, "h": 1 },
--             ...
--           ]
--         }
--       ]
--     }
--
-- "active": null signifie "utiliser le dashboard par défaut".
-- ============================================================================

alter table public.profiles
  add column if not exists dashboard_config jsonb not null default '{"active":null,"configs":[]}'::jsonb;

-- ============================================================================
-- Fin de la migration.
-- ============================================================================
