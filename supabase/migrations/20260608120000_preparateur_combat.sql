-- ============================================================================
-- Roadmap Préparateur de Combat — Phase 2.1
-- ----------------------------------------------------------------------------
-- Enrichit la table combats_prepares (créée en 20260608110000) avec les champs
-- nécessaires à la préparation complète d'un combat :
--   * pj_ids            : PJ impliqués (array d'uuid personnages)
--   * positions         : positions des jetons pré-placés { piece_id: {x,y} }
--   * conditions_depart : conditions initiales / surprise (jsonb)
--   * initiative_preset : ordre d'initiative préset optionnel (jsonb array)
--   * avec_carte        : utilise une battle map (toggle)
-- (nom, scenario_id, mj_id, notes, participants, carte_id, est_template, created_at
--  existent déjà). Idempotent — RLS inchangée (déjà MJ-propriétaire).
-- ============================================================================

alter table public.combats_prepares
  add column if not exists pj_ids jsonb not null default '[]'::jsonb,
  add column if not exists positions jsonb not null default '{}'::jsonb,
  add column if not exists conditions_depart jsonb not null default '{}'::jsonb,
  add column if not exists initiative_preset jsonb,
  add column if not exists avec_carte boolean not null default false,
  add column if not exists updated_at timestamptz not null default now();

comment on column public.combats_prepares.pj_ids is 'PJ impliqués : array d''uuid personnages.';
comment on column public.combats_prepares.positions is 'Positions pré-placées des jetons : { "perso-<id>"|"ennemi-<id>": {x,y} } (0..1).';
comment on column public.combats_prepares.conditions_depart is 'Conditions de départ : { surprise: bool, caches: string[], conditions: { piece_id: string[] }, note: string }.';
comment on column public.combats_prepares.initiative_preset is 'Ordre d''initiative préset optionnel (sinon rollé au lancement).';
comment on column public.combats_prepares.avec_carte is 'Le combat préparé utilise une battle map (placement de jetons).';
