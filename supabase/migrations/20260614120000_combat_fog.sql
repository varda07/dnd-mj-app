-- ============================================================================
-- ROADMAP V1 — Phase 1.2 : Brouillard de guerre en combat
-- ----------------------------------------------------------------------------
-- Stocke le brouillard de la carte tactique de combat directement sur la ligne
-- combats (comme `positions`), pour profiter de la synchro realtime existante
-- (MJ → snapshot → écran joueurs). Forme : { cols, rows, hidden:[indices] }.
-- Vide = aucune zone masquée (aucun changement de comportement pour l'existant).
-- ============================================================================

alter table public.combats
  add column if not exists fog jsonb not null default '{}'::jsonb;

comment on column public.combats.fog is
  'V1 1.2 — brouillard de guerre carte tactique : { cols, rows, hidden:int[] }.';
