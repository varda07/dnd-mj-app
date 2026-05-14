-- ============================================================================
-- Mode Exploration : carte partagée MJ/joueurs avec brouillard de guerre
-- ============================================================================
-- À exécuter dans le SQL Editor de Supabase. Idempotent.
-- ============================================================================

create table if not exists public.explorations (
  id uuid primary key default gen_random_uuid(),
  scenario_id uuid not null references public.scenarios(id) on delete cascade,
  map_image_url text,
  revealed_areas jsonb not null default '[]'::jsonb,
  positions_pj jsonb not null default '[]'::jsonb,
  items_caches jsonb not null default '[]'::jsonb,
  ennemis_caches jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (scenario_id)
);

create index if not exists idx_explorations_scenario on public.explorations(scenario_id);


-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------

alter table public.explorations enable row level security;

-- Lecture : MJ du scénario OU joueur ayant rejoint
drop policy if exists "explorations_select" on public.explorations;
create policy "explorations_select" on public.explorations
  for select using (
    exists (
      select 1 from public.scenarios s
      where s.id = explorations.scenario_id and s.mj_id = auth.uid()
    )
    or exists (
      select 1 from public.scenarios_joueurs sj
      where sj.scenario_id = explorations.scenario_id
        and sj.joueur_id = auth.uid()
    )
  );

-- Écriture (insert/update/delete) : MJ uniquement
drop policy if exists "explorations_mj_write" on public.explorations;
create policy "explorations_mj_write" on public.explorations
  for insert with check (
    exists (
      select 1 from public.scenarios s
      where s.id = explorations.scenario_id and s.mj_id = auth.uid()
    )
  );

drop policy if exists "explorations_mj_update" on public.explorations;
create policy "explorations_mj_update" on public.explorations
  for update using (
    exists (
      select 1 from public.scenarios s
      where s.id = explorations.scenario_id and s.mj_id = auth.uid()
    )
  );

drop policy if exists "explorations_mj_delete" on public.explorations;
create policy "explorations_mj_delete" on public.explorations
  for delete using (
    exists (
      select 1 from public.scenarios s
      where s.id = explorations.scenario_id and s.mj_id = auth.uid()
    )
  );


-- ----------------------------------------------------------------------------
-- Realtime : activer la publication pour que les joueurs voient les maj live
-- ----------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'explorations'
  ) then
    execute 'alter publication supabase_realtime add table public.explorations';
  end if;
end $$;
