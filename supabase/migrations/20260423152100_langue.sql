-- ============================================================================
-- Langue préférée de l'utilisateur sur profiles
-- ============================================================================
-- À exécuter dans le SQL Editor de Supabase. Idempotent.
-- Ajoute une colonne `langue` sur profiles avec les valeurs autorisées
-- 'fr' (par défaut) ou 'en'. La contrainte est ajoutée séparément pour rester
-- idempotent même si la colonne existe déjà.
-- ============================================================================

alter table public.profiles
  add column if not exists langue text not null default 'fr';

-- Contrainte de vérification (drop & recreate pour garantir l'état voulu)
alter table public.profiles
  drop constraint if exists profiles_langue_check;

alter table public.profiles
  add constraint profiles_langue_check check (langue in ('fr', 'en'));

-- ============================================================================
-- Fin de la migration. Pour vérifier :
--   select column_name, column_default, is_nullable
--     from information_schema.columns
--     where table_schema = 'public' and table_name = 'profiles' and column_name = 'langue';
-- ============================================================================
