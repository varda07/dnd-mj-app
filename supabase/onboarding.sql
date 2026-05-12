-- ============================================================================
-- Onboarding — flag pour savoir si l'utilisateur a complété le tutoriel
-- ============================================================================
-- À exécuter dans le SQL Editor de Supabase. Idempotent.
--
-- Ajoute la colonne onboarding_complete sur profiles. Par défaut false : tous
-- les utilisateurs existants seront considérés comme « jamais onboardés » et
-- pourront fermer la modale (qui marquera ensuite à true).
-- ============================================================================

alter table public.profiles
  add column if not exists onboarding_complete boolean not null default false;

-- ============================================================================
-- Fin de la migration.
-- ============================================================================
