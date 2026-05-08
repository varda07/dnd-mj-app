-- ============================================================================
-- Cartes mentales multiples par scénario
-- ============================================================================
-- À exécuter dans le SQL Editor de Supabase. Idempotent.
--
-- Avant : un seul mindmap par scénario (mindmap_noeuds.scenario_id +
-- mindmap_liens.scenario_id).
-- Après : N cartes par scénario, regroupées dans la nouvelle table `mindmaps`.
-- Les noeuds et liens référencent maintenant `mindmap_id`.
--
-- Migration : pour chaque scénario qui possède des noeuds ou liens, on crée
-- automatiquement une carte par défaut (« Carte principale ») et on ré-affecte
-- les rangs existants à cette carte. Aucune donnée perdue.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Nouvelle table mindmaps
-- ----------------------------------------------------------------------------

create table if not exists public.mindmaps (
  id uuid primary key default gen_random_uuid(),
  scenario_id uuid not null references public.scenarios(id) on delete cascade,
  nom text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_mindmaps_scenario on public.mindmaps(scenario_id);

alter table public.mindmaps enable row level security;

drop policy if exists "mindmaps_all" on public.mindmaps;
create policy "mindmaps_all" on public.mindmaps
  for all
  using (
    exists (
      select 1 from public.scenarios s
      where s.id = mindmaps.scenario_id and s.mj_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.scenarios s
      where s.id = mindmaps.scenario_id and s.mj_id = auth.uid()
    )
  );


-- ----------------------------------------------------------------------------
-- 2. Ajout de la colonne mindmap_id (nullable pour la migration)
-- ----------------------------------------------------------------------------

alter table public.mindmap_noeuds
  add column if not exists mindmap_id uuid references public.mindmaps(id) on delete cascade;

alter table public.mindmap_liens
  add column if not exists mindmap_id uuid references public.mindmaps(id) on delete cascade;


-- ----------------------------------------------------------------------------
-- 3. Migration des données existantes
-- ----------------------------------------------------------------------------
-- Pour chaque scénario qui a des noeuds ou liens orphelins (mindmap_id null),
-- on crée une carte par défaut et on rattache les lignes existantes.

do $$
declare
  s_id uuid;
  m_id uuid;
begin
  -- Ne fait rien si la colonne scenario_id a déjà été supprimée (idempotence
  -- après une seconde exécution).
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'mindmap_noeuds'
      and column_name = 'scenario_id'
  ) then
    for s_id in
      select scenario_id
      from public.mindmap_noeuds
      where mindmap_id is null
      union
      select scenario_id
      from public.mindmap_liens
      where mindmap_id is null
    loop
      insert into public.mindmaps (scenario_id, nom)
        values (s_id, 'Carte principale')
        returning id into m_id;
      execute format(
        'update public.mindmap_noeuds set mindmap_id = %L where scenario_id = %L and mindmap_id is null',
        m_id, s_id
      );
      execute format(
        'update public.mindmap_liens set mindmap_id = %L where scenario_id = %L and mindmap_id is null',
        m_id, s_id
      );
    end loop;
  end if;
end $$;


-- ----------------------------------------------------------------------------
-- 4. Contrainte NOT NULL sur mindmap_id
-- ----------------------------------------------------------------------------

do $$
begin
  if exists (
    select 1 from public.mindmap_noeuds where mindmap_id is null
  ) then
    raise notice 'mindmap_noeuds : des lignes ont mindmap_id null, contrainte NOT NULL non appliquée.';
  else
    alter table public.mindmap_noeuds alter column mindmap_id set not null;
  end if;
  if exists (
    select 1 from public.mindmap_liens where mindmap_id is null
  ) then
    raise notice 'mindmap_liens : des lignes ont mindmap_id null, contrainte NOT NULL non appliquée.';
  else
    alter table public.mindmap_liens alter column mindmap_id set not null;
  end if;
end $$;


-- ----------------------------------------------------------------------------
-- 5. Suppression des anciennes RLS qui référencent scenario_id
-- ----------------------------------------------------------------------------

drop policy if exists "mindmap_noeuds_all" on public.mindmap_noeuds;
drop policy if exists "mindmap_liens_all" on public.mindmap_liens;


-- ----------------------------------------------------------------------------
-- 6. Suppression de la colonne scenario_id désormais inutile
-- ----------------------------------------------------------------------------

drop index if exists idx_mindmap_noeuds_scenario;
drop index if exists idx_mindmap_liens_scenario;

alter table public.mindmap_noeuds drop column if exists scenario_id;
alter table public.mindmap_liens drop column if exists scenario_id;

create index if not exists idx_mindmap_noeuds_mindmap on public.mindmap_noeuds(mindmap_id);
create index if not exists idx_mindmap_liens_mindmap on public.mindmap_liens(mindmap_id);


-- ----------------------------------------------------------------------------
-- 7. Nouvelles RLS via mindmaps → scenarios
-- ----------------------------------------------------------------------------

create policy "mindmap_noeuds_all" on public.mindmap_noeuds
  for all
  using (
    exists (
      select 1 from public.mindmaps mm
      join public.scenarios s on s.id = mm.scenario_id
      where mm.id = mindmap_noeuds.mindmap_id and s.mj_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.mindmaps mm
      join public.scenarios s on s.id = mm.scenario_id
      where mm.id = mindmap_noeuds.mindmap_id and s.mj_id = auth.uid()
    )
  );

create policy "mindmap_liens_all" on public.mindmap_liens
  for all
  using (
    exists (
      select 1 from public.mindmaps mm
      join public.scenarios s on s.id = mm.scenario_id
      where mm.id = mindmap_liens.mindmap_id and s.mj_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.mindmaps mm
      join public.scenarios s on s.id = mm.scenario_id
      where mm.id = mindmap_liens.mindmap_id and s.mj_id = auth.uid()
    )
  );


-- ============================================================================
-- Fin de la migration.
-- ============================================================================
