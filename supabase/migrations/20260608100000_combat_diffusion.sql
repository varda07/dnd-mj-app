-- ============================================================================
-- Roadmap Refonte Interface Combat (Mode Diffusion)
-- ----------------------------------------------------------------------------
-- Colonnes manquantes pour les deux vues combat synchronisées :
--   * ennemis : CA, résistances / immunités / vulnérabilités, tactique MJ
--   * combats : carte tactique (id + visibilité joueurs) + positions des jetons
-- Toutes les tables ont déjà leur RLS — pas de nouvelle policy nécessaire.
-- Idempotent (IF NOT EXISTS) pour pouvoir être rejoué sans casse.
-- ============================================================================

-- --- ENNEMIS : résistances / immunités / vulnérabilités ---------------------
-- NB : la CA des ennemis existe déjà (colonne `armure`) et le comportement
-- tactique aussi (`comportement_tactique`) — on NE les recrée PAS. On ajoute
-- uniquement les trois types de mitigation de dégâts qui manquent.
alter table public.ennemis
  add column if not exists resistances jsonb not null default '[]'::jsonb,
  add column if not exists immunites jsonb not null default '[]'::jsonb,
  add column if not exists vulnerabilites jsonb not null default '[]'::jsonb;

comment on column public.ennemis.resistances is 'Types de dégâts résistés (array de chaînes), ex ["feu","froid"].';
comment on column public.ennemis.immunites is 'Types de dégâts auxquels la créature est immunisée.';
comment on column public.ennemis.vulnerabilites is 'Types de dégâts auxquels la créature est vulnérable.';

-- --- COMBATS : carte tactique + positions des jetons ------------------------
alter table public.combats
  add column if not exists carte_id uuid references public.maps(id) on delete set null,
  add column if not exists carte_visible_joueurs boolean not null default false,
  add column if not exists positions jsonb not null default '{}'::jsonb;

comment on column public.combats.carte_id is 'Battle map optionnelle affichée pendant le combat (référence maps.id).';
comment on column public.combats.carte_visible_joueurs is 'Le MJ autorise l''affichage de la carte tactique côté joueurs.';
comment on column public.combats.positions is 'Positions des jetons par piece_id : { "perso-<id>": { "x": 0..1, "y": 0..1 } }.';
