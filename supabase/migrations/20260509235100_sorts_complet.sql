-- ============================================================================
-- Sorts complets D&D 5e : composantes V/S/M, concentration, rituel, classes,
-- type d'action ; emplacements de sorts par perso ; flag "préparé".
-- ============================================================================
-- À exécuter dans le SQL Editor de Supabase. Idempotent.
--
-- Étend la refonte des sorts (sorts_refonte.sql) avec les champs PHB 5e
-- nécessaires pour afficher / lancer un sort correctement dans l'app.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. SORTS — composantes, concentration, rituel, classes, type d'action
-- ----------------------------------------------------------------------------

alter table public.sorts
  add column if not exists composantes_verbal boolean not null default false,
  add column if not exists composantes_somatique boolean not null default false,
  add column if not exists composantes_materiel text not null default '',
  add column if not exists concentration boolean not null default false,
  add column if not exists rituel boolean not null default false,
  add column if not exists classes_compatibles text[] not null default '{}',
  add column if not exists action_type text not null default 'action';

-- Index utile pour les filtres de la modale d'import (par niveau / école).
create index if not exists sorts_niveau_idx on public.sorts(niveau);
create index if not exists sorts_ecole_idx on public.sorts(ecole);


-- ----------------------------------------------------------------------------
-- 2. PERSONNAGES — emplacements de sorts max / utilisés (jsonb pour flexibilité)
-- ----------------------------------------------------------------------------
-- Format attendu : { "1": 4, "2": 3, ... } pour sorts_slots_max
-- Format attendu : { "1": 2, "2": 0, ... } pour sorts_slots_used

alter table public.personnages
  add column if not exists sorts_slots_max jsonb not null default '{}'::jsonb,
  add column if not exists sorts_slots_used jsonb not null default '{}'::jsonb;


-- ----------------------------------------------------------------------------
-- 3. PERSONNAGE_SORTS — flag "préparé"
-- ----------------------------------------------------------------------------
-- Utilisé par les classes qui préparent leurs sorts (Clerc, Druide, Magicien,
-- Paladin, Artificier). Pour les autres (Barde, Ensorceleur, Sorcier, Rôdeur)
-- le flag est ignoré ou toujours true selon l'UI.

alter table public.personnage_sorts
  add column if not exists prepare boolean not null default true;


-- ----------------------------------------------------------------------------
-- 4. RLS — pas de changement nécessaire (les nouvelles colonnes sont couvertes
--           par les policies existantes sur sorts / personnage_sorts).
-- ----------------------------------------------------------------------------


-- ============================================================================
-- Vérifications :
--   select column_name, data_type from information_schema.columns
--     where table_schema='public' and table_name='sorts'
--       and column_name in ('composantes_verbal','composantes_somatique',
--         'composantes_materiel','concentration','rituel','classes_compatibles',
--         'action_type');
--   -- doit lister les 7 colonnes.
--
--   select column_name from information_schema.columns
--     where table_schema='public' and table_name='personnages'
--       and column_name in ('sorts_slots_max','sorts_slots_used');
--   -- doit lister les 2 colonnes.
--
--   select column_name from information_schema.columns
--     where table_schema='public' and table_name='personnage_sorts'
--       and column_name='prepare';
-- ============================================================================
