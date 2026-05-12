-- ============================================================================
-- Quêtes — table + RLS
-- ============================================================================
-- À exécuter dans le SQL Editor de Supabase. Idempotent.
--
-- Une quête appartient à un scénario. Elle a un type (principale/secondaire/
-- personnelle), un statut (active/terminée/abandonnée/échec), des récompenses
-- structurées (XP, or, objets) et des objectifs cochables stockés en jsonb.
-- Les PNJ liés sont référencés par leur uuid dans un tableau.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Table quetes
-- ----------------------------------------------------------------------------

create table if not exists public.quetes (
  id uuid primary key default gen_random_uuid(),
  scenario_id uuid not null references public.scenarios(id) on delete cascade,
  titre text not null,
  description text,
  type text not null default 'principale'
    check (type in ('principale', 'secondaire', 'personnelle')),
  status text not null default 'active'
    check (status in ('active', 'terminee', 'abandonnee', 'echec')),
  recompense_xp integer not null default 0,
  recompense_or integer not null default 0,
  recompense_items jsonb not null default '[]'::jsonb,
  objectifs jsonb not null default '[]'::jsonb,
  pnj_lies uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists quetes_scenario_idx on public.quetes(scenario_id);
create index if not exists quetes_status_idx on public.quetes(status);


-- ----------------------------------------------------------------------------
-- 2. RLS : accès aligné sur l'ownership du scénario (modèle des chapitres)
-- ----------------------------------------------------------------------------

alter table public.quetes enable row level security;

drop policy if exists "quetes_select" on public.quetes;
create policy "quetes_select" on public.quetes
  for select using (
    exists (
      select 1 from public.scenarios s
      where s.id = quetes.scenario_id
        and (
          s.mj_id = auth.uid()
          or exists (
            select 1 from public.scenarios_joueurs sj
            where sj.scenario_id = s.id and sj.joueur_id = auth.uid()
          )
        )
    )
  );

drop policy if exists "quetes_insert" on public.quetes;
create policy "quetes_insert" on public.quetes
  for insert with check (
    exists (
      select 1 from public.scenarios s
      where s.id = quetes.scenario_id and s.mj_id = auth.uid()
    )
  );

drop policy if exists "quetes_update" on public.quetes;
create policy "quetes_update" on public.quetes
  for update using (
    exists (
      select 1 from public.scenarios s
      where s.id = quetes.scenario_id and s.mj_id = auth.uid()
    )
  );

drop policy if exists "quetes_delete" on public.quetes;
create policy "quetes_delete" on public.quetes
  for delete using (
    exists (
      select 1 from public.scenarios s
      where s.id = quetes.scenario_id and s.mj_id = auth.uid()
    )
  );


-- ============================================================================
-- Fin de la migration.
-- ============================================================================
