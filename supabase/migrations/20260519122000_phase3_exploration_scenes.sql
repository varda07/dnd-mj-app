-- ============================================================================
-- PHASE 3.1 — Mode Exploration → Donjon Builder
-- ============================================================================
-- Nouvelle table `exploration_scenes` : permet au MJ de créer plusieurs
-- scènes d'exploration par scénario (lieu + description + rencontres possibles
-- + indices + sorties). Distincte de l'exploration "live" qui reste dans
-- `explorations` (carte, brouillard de guerre, positions).
-- ============================================================================

create table if not exists public.exploration_scenes (
  id uuid primary key default gen_random_uuid(),
  scenario_id uuid not null references public.scenarios(id) on delete cascade,
  nom text not null,
  description text,
  -- ID de la carte (table `maps`) optionnellement associée
  carte_id uuid references public.maps(id) on delete set null,
  -- Rencontres potentielles : [{ennemi_id, quantite, conditions, hidden}, ...]
  rencontres jsonb not null default '[]'::jsonb,
  -- Indices à révéler aux joueurs : [{titre, contenu, reveler_si}, ...]
  indices jsonb not null default '[]'::jsonb,
  -- Liens vers d'autres scènes : [{scene_id, label, condition}, ...]
  sorties jsonb not null default '[]'::jsonb,
  ordre int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists exploration_scenes_scenario_idx
  on public.exploration_scenes(scenario_id, ordre);

-- RLS : MJ seul (lecture/écriture). Pas de joueurs.
alter table public.exploration_scenes enable row level security;

drop policy if exists "exploration_scenes_select" on public.exploration_scenes;
create policy "exploration_scenes_select" on public.exploration_scenes
  for select to authenticated
  using (public.fn_is_scenario_mj(scenario_id));

drop policy if exists "exploration_scenes_insert" on public.exploration_scenes;
create policy "exploration_scenes_insert" on public.exploration_scenes
  for insert to authenticated
  with check (public.fn_is_scenario_mj(scenario_id));

drop policy if exists "exploration_scenes_update" on public.exploration_scenes;
create policy "exploration_scenes_update" on public.exploration_scenes
  for update to authenticated
  using (public.fn_is_scenario_mj(scenario_id))
  with check (public.fn_is_scenario_mj(scenario_id));

drop policy if exists "exploration_scenes_delete" on public.exploration_scenes;
create policy "exploration_scenes_delete" on public.exploration_scenes
  for delete to authenticated
  using (public.fn_is_scenario_mj(scenario_id));

comment on table public.exploration_scenes is
  'Roadmap Post-Test 3.1 — scènes d''exploration préparées par le MJ.';
