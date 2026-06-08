-- ============================================================================
-- Roadmap Moteur de Combat Unifié
-- ----------------------------------------------------------------------------
--  * combats_prepares : combats pré-configurés / templates lançables en 1 clic
--    (Phase 2.3 « combat préparé » + Phase 4.1 « combats sauvegardés »).
--  * combats.demarre_a : horodatage de démarrage du combat (Phase 4.2 stats —
--    durée réelle). Idempotent.
-- RLS calquée sur public.combats (MJ propriétaire du scénario).
-- ============================================================================

-- --- COMBATS PRÉPARÉS / TEMPLATES -------------------------------------------
create table if not exists public.combats_prepares (
  id uuid primary key default gen_random_uuid(),
  scenario_id uuid references public.scenarios(id) on delete cascade,
  mj_id uuid not null references auth.users(id) on delete cascade,
  nom text not null,
  notes text,
  -- Participants pré-remplis : [{ kind:'ennemi'|'perso', ref_id, nom, image_url }]
  participants jsonb not null default '[]'::jsonb,
  carte_id uuid references public.maps(id) on delete set null,
  -- Template réutilisable (visible hors d'un scénario précis) vs combat lié.
  est_template boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists combats_prepares_scenario_idx
  on public.combats_prepares(scenario_id);
create index if not exists combats_prepares_mj_idx
  on public.combats_prepares(mj_id);

comment on table public.combats_prepares is
  'Combats pré-configurés / templates lançables depuis un scénario ou la bibliothèque.';

alter table public.combats_prepares enable row level security;

-- Le MJ gère ses propres combats préparés (mj_id = auth.uid()).
drop policy if exists "combats_prepares_select" on public.combats_prepares;
create policy "combats_prepares_select" on public.combats_prepares
  for select using (mj_id = auth.uid());

drop policy if exists "combats_prepares_insert" on public.combats_prepares;
create policy "combats_prepares_insert" on public.combats_prepares
  for insert with check (mj_id = auth.uid());

drop policy if exists "combats_prepares_update" on public.combats_prepares;
create policy "combats_prepares_update" on public.combats_prepares
  for update using (mj_id = auth.uid());

drop policy if exists "combats_prepares_delete" on public.combats_prepares;
create policy "combats_prepares_delete" on public.combats_prepares
  for delete using (mj_id = auth.uid());

-- --- COMBATS : horodatage de démarrage (durée du combat) --------------------
alter table public.combats
  add column if not exists demarre_a timestamptz;

comment on column public.combats.demarre_a is
  'Horodatage de démarrage du combat en cours (pour calculer la durée réelle).';
