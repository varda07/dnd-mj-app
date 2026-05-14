-- ============================================================================
-- Carte mentale des scénarios : nœuds et liens
-- ============================================================================
-- À exécuter dans le SQL Editor de Supabase. Idempotent.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. TABLES
-- ----------------------------------------------------------------------------

create table if not exists public.mindmap_noeuds (
  id uuid primary key default gen_random_uuid(),
  scenario_id uuid not null references public.scenarios(id) on delete cascade,
  type text not null check (type in ('lieu', 'pnj', 'evenement', 'indice')),
  titre text not null default '',
  contenu text not null default '',
  position_x int not null default 0,
  position_y int not null default 0,
  couleur text,
  created_at timestamptz not null default now()
);

create table if not exists public.mindmap_liens (
  id uuid primary key default gen_random_uuid(),
  scenario_id uuid not null references public.scenarios(id) on delete cascade,
  noeud_from uuid not null references public.mindmap_noeuds(id) on delete cascade,
  noeud_to uuid not null references public.mindmap_noeuds(id) on delete cascade,
  label text,
  created_at timestamptz not null default now()
);

create index if not exists idx_mindmap_noeuds_scenario on public.mindmap_noeuds(scenario_id);
create index if not exists idx_mindmap_liens_scenario on public.mindmap_liens(scenario_id);
create index if not exists idx_mindmap_liens_from on public.mindmap_liens(noeud_from);
create index if not exists idx_mindmap_liens_to on public.mindmap_liens(noeud_to);


-- ----------------------------------------------------------------------------
-- 2. RLS : accès limité au MJ du scénario
-- ----------------------------------------------------------------------------

alter table public.mindmap_noeuds enable row level security;
alter table public.mindmap_liens enable row level security;

drop policy if exists "mindmap_noeuds_all" on public.mindmap_noeuds;
create policy "mindmap_noeuds_all" on public.mindmap_noeuds
  for all
  using (
    exists (
      select 1 from public.scenarios s
      where s.id = mindmap_noeuds.scenario_id and s.mj_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.scenarios s
      where s.id = mindmap_noeuds.scenario_id and s.mj_id = auth.uid()
    )
  );

drop policy if exists "mindmap_liens_all" on public.mindmap_liens;
create policy "mindmap_liens_all" on public.mindmap_liens
  for all
  using (
    exists (
      select 1 from public.scenarios s
      where s.id = mindmap_liens.scenario_id and s.mj_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.scenarios s
      where s.id = mindmap_liens.scenario_id and s.mj_id = auth.uid()
    )
  );
