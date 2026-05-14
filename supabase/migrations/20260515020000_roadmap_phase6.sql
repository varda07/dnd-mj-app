-- ============================================================================
-- ROADMAP MASTER SCREEN — Phase 6 : Combat
-- ============================================================================
-- À appliquer via `supabase db push`. Idempotent.
-- Couvre : 6.3 stratégies des ennemis, 6.4 combat de masse.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 6.3 — Stratégies des ennemis
-- ----------------------------------------------------------------------------
-- Comportement tactique libre, éditable par le MJ ; une suggestion est
-- proposée côté client selon l'INT du monstre.
alter table public.ennemis
  add column if not exists comportement_tactique text not null default '';


-- ----------------------------------------------------------------------------
-- 6.4 — Combat de masse
-- ----------------------------------------------------------------------------
-- Un ennemi peut représenter un *groupe* d'unités identiques : HP agrégés,
-- initiative unique, retrait par paquet. Les colonnes sont posées sur
-- `ennemis` (et non `combats`) car c'est l'ennemi qui porte la notion de
-- groupe — `combats` ne stocke qu'un état de tour partagé.
alter table public.ennemis
  add column if not exists est_groupe boolean not null default false,
  add column if not exists taille_groupe integer not null default 1;


-- ============================================================================
-- Fin de la migration Phase 6.
-- ============================================================================
