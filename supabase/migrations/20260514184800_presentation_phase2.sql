-- ============================================================================
-- Mode Présentation — Phase 2 : narration temps réel + actions rapides MJ
-- ============================================================================
-- À exécuter dans le SQL Editor de Supabase. Idempotent.
--
-- Ajoute à `presentation_etats` les colonnes alimentant :
--   - narration             : texte narratif actuellement poussé à l'écran
--   - narration_historique  : 3 derniers textes — [{ "texte": ..., "ts": ... }]
--   - effet                 : dernière action rapide transitoire jouée côté
--                             écran joueurs — { "type": "crit"|"ko"|"notif",
--                             "cible": text|null, "ts": number }. L'écran
--                             joueurs rejoue l'animation quand `ts` change.
--   - en_pause              : état soutenu « Intermission » (toggle Pause)
--
-- RLS : inchangée — les policies existantes de presentation_etats couvrent
-- déjà les nouvelles colonnes. La table est déjà publiée en realtime.
-- ============================================================================

alter table public.presentation_etats
  add column if not exists narration text,
  add column if not exists narration_historique jsonb not null default '[]'::jsonb,
  add column if not exists effet jsonb,
  add column if not exists en_pause boolean not null default false;

-- ============================================================================
-- Fin de la migration.
-- ============================================================================
