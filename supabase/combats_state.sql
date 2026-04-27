-- ============================================================================
-- Table d'état de combat : tour par tour, round, ordre d'initiative partagé
-- ============================================================================
-- À exécuter dans le SQL Editor de Supabase. Idempotent.
-- Une seule ligne par scénario (UNIQUE), upsert depuis la page combat.
-- Les joueurs liés au scénario peuvent lire pour suivre le tour en temps réel ;
-- seul le MJ peut écrire.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. TABLE
-- ----------------------------------------------------------------------------

create table if not exists public.combats (
  id uuid primary key default gen_random_uuid(),
  scenario_id uuid not null references public.scenarios(id) on delete cascade,
  round integer not null default 1,
  tour_actuel integer not null default 0,
  ordre_initiative jsonb not null default '[]'::jsonb,
  actif boolean not null default true,
  created_at timestamptz not null default now(),
  unique (scenario_id)
);

-- Migration : état KO/inconscient/death saves par participant.
-- Format : { "<piece_id>": { "status": "inconscient"|"stabilise"|"mort"|"vaincu",
--   "death_success": 0..3, "death_failure": 0..3 } }
alter table public.combats
  add column if not exists etats_combat jsonb not null default '{}'::jsonb;

create index if not exists combats_scenario_idx on public.combats(scenario_id);


-- ----------------------------------------------------------------------------
-- 2. REALTIME : activer la diffusion des changements
-- ----------------------------------------------------------------------------
-- Idempotent : on ne tente l'ALTER PUBLICATION que si la table n'y est pas
-- encore (sinon erreur "relation is already member of publication").

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'combats'
  ) then
    execute 'alter publication supabase_realtime add table public.combats';
  end if;
end $$;


-- ----------------------------------------------------------------------------
-- 3. RLS
-- ----------------------------------------------------------------------------
-- Lecture : MJ du scénario OU joueur inscrit au scénario.
-- Écriture (insert/update/delete) : MJ du scénario uniquement.

alter table public.combats enable row level security;

drop policy if exists "combats_select" on public.combats;
create policy "combats_select" on public.combats
  for select using (
    exists (
      select 1 from public.scenarios s
      where s.id = combats.scenario_id
        and (
          s.mj_id = auth.uid()
          or exists (
            select 1 from public.scenarios_joueurs sj
            where sj.scenario_id = s.id and sj.joueur_id = auth.uid()
          )
        )
    )
  );

drop policy if exists "combats_insert" on public.combats;
create policy "combats_insert" on public.combats
  for insert with check (
    exists (
      select 1 from public.scenarios s
      where s.id = combats.scenario_id and s.mj_id = auth.uid()
    )
  );

drop policy if exists "combats_update" on public.combats;
create policy "combats_update" on public.combats
  for update using (
    exists (
      select 1 from public.scenarios s
      where s.id = combats.scenario_id and s.mj_id = auth.uid()
    )
  );

drop policy if exists "combats_delete" on public.combats;
create policy "combats_delete" on public.combats
  for delete using (
    exists (
      select 1 from public.scenarios s
      where s.id = combats.scenario_id and s.mj_id = auth.uid()
    )
  );
