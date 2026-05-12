-- ============================================================================
-- Préférences d'accessibilité
-- ============================================================================
-- À exécuter dans le SQL Editor de Supabase. Idempotent.
--
-- Stockage côté `profiles` :
--   accessibilite : jsonb
--     {
--       "daltonien": "off" | "deuteranopie" | "protanopie" | "tritanopie",
--       "dyslexique": true | false,
--       "fontScale": 100,                  -- pourcentage (80-150)
--       "hautContraste": true | false,
--       "reduireAnimations": true | false,
--       "ariaImproved": true | false
--     }
-- ============================================================================

alter table public.profiles
  add column if not exists accessibilite jsonb not null default
    '{"daltonien":"off","dyslexique":false,"fontScale":100,"hautContraste":false,"reduireAnimations":false,"ariaImproved":false}'::jsonb;

-- ============================================================================
-- Fin de la migration.
-- ============================================================================
