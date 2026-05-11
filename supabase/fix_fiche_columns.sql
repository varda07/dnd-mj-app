-- ============================================================================
-- Fix : toutes les colonnes utilisées par la fiche personnage
-- ----------------------------------------------------------------------------
-- À exécuter quand la sauvegarde Supabase échoue avec une erreur vide depuis
-- la fiche perso — c'est le symptôme typique d'une colonne manquante côté
-- BDD que le code essaie d'écrire à chaque autosave.
--
-- Idempotent : peut être ré-exécuté sans casser l'état existant.
-- ============================================================================

alter table public.personnages
  -- Fiche détaillée D&D 5e
  add column if not exists sous_classe text default '',
  add column if not exists historique text default '',
  add column if not exists xp int default 0,
  add column if not exists ca int default 10,
  add column if not exists vitesse int default 9,
  add column if not exists temp_hp int default 0,
  add column if not exists death_success int default 0,
  add column if not exists death_fail int default 0,
  add column if not exists de_vie_utilises int default 0,
  add column if not exists inspiration boolean default false,
  add column if not exists saves_maitrises jsonb default '{}'::jsonb,
  add column if not exists comp_maitrises jsonb default '{}'::jsonb,
  add column if not exists comp_expertise jsonb default '{}'::jsonb,
  add column if not exists armes jsonb default '[]'::jsonb,
  add column if not exists equipement text default '',
  add column if not exists traits_espece text default '',
  add column if not exists traits_classe text default '',
  add column if not exists exploits text default '',
  add column if not exists langues text default '',
  add column if not exists autres_maitrises text default '',
  -- Emplacements de sorts
  add column if not exists sorts_slots_max jsonb default '{}'::jsonb,
  add column if not exists sorts_slots_used jsonb default '{}'::jsonb,
  -- Multiclasse
  add column if not exists classes_multiples jsonb default '[]'::jsonb,
  -- Death saves (nouveau nommage)
  add column if not exists death_saves_success int default 0,
  add column if not exists death_saves_fail int default 0,
  -- Conditions (utilisé par la fiche + combat)
  add column if not exists conditions jsonb not null default '[]'::jsonb;

-- Mode de jet pour le DiceLauncher (sauvegarde de l'historique)
alter table public.jets_de_des
  add column if not exists mode text default 'normal';

-- Vérification : liste toutes les colonnes de personnages pour confirmer
select column_name, data_type, column_default
  from information_schema.columns
 where table_schema = 'public'
   and table_name = 'personnages'
 order by column_name;
