-- ============================================================================
-- Refonte scénarios : chapitres, liens modulaires ennemi/item/map
-- ============================================================================
-- À exécuter dans le SQL Editor de Supabase. Idempotent.
--
-- Objectif : un scénario devient un document structuré en chapitres, chacun
-- avec son propre contenu texte et ses éléments liés (ennemis, items, maps).
-- Les éléments (ennemi, item, map, personnage) existent indépendamment d'un
-- scénario — leur `scenario_id` devient purement informatif et nullable.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. FKs scenario_id nullable (défensif — déjà le cas dans setup.sql)
-- ----------------------------------------------------------------------------

alter table public.ennemis      alter column scenario_id drop not null;
alter table public.items        alter column scenario_id drop not null;
alter table public.personnages  alter column scenario_id drop not null;
-- public.maps n'a pas de colonne scenario_id, rien à faire.


-- ----------------------------------------------------------------------------
-- 2. Table chapitres
-- ----------------------------------------------------------------------------

create table if not exists public.chapitres (
  id uuid primary key default gen_random_uuid(),
  scenario_id uuid not null references public.scenarios(id) on delete cascade,
  titre text not null default 'Sans titre',
  contenu text not null default '',
  ordre integer not null default 0,
  parent_id uuid references public.chapitres(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists chapitres_scenario_idx on public.chapitres(scenario_id);
create index if not exists chapitres_parent_idx on public.chapitres(parent_id);


-- ----------------------------------------------------------------------------
-- 3. Table scenario_liens (ennemis / items / maps reliés)
-- ----------------------------------------------------------------------------
-- On n'utilise pas de FK polymorphique (PostgreSQL ne les supporte pas), mais
-- on valide le type via check constraint. L'intégrité côté element_id est
-- laissée à l'application (unknown-type reference).

create table if not exists public.scenario_liens (
  id uuid primary key default gen_random_uuid(),
  scenario_id uuid not null references public.scenarios(id) on delete cascade,
  element_type text not null check (element_type in ('ennemi', 'item', 'map')),
  element_id uuid not null,
  chapitre_id uuid references public.chapitres(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (scenario_id, element_type, element_id, chapitre_id)
);

create index if not exists scenario_liens_scenario_idx on public.scenario_liens(scenario_id);
create index if not exists scenario_liens_chapitre_idx on public.scenario_liens(chapitre_id);


-- ----------------------------------------------------------------------------
-- 4. RLS : chapitres alignés sur l'ownership du scénario
-- ----------------------------------------------------------------------------

alter table public.chapitres enable row level security;

drop policy if exists "chapitres_select" on public.chapitres;
create policy "chapitres_select" on public.chapitres
  for select using (
    exists (
      select 1 from public.scenarios s
      where s.id = chapitres.scenario_id
        and (
          s.mj_id = auth.uid()
          or exists (
            select 1 from public.scenarios_joueurs sj
            where sj.scenario_id = s.id and sj.joueur_id = auth.uid()
          )
        )
    )
  );

drop policy if exists "chapitres_insert" on public.chapitres;
create policy "chapitres_insert" on public.chapitres
  for insert with check (
    exists (
      select 1 from public.scenarios s
      where s.id = chapitres.scenario_id and s.mj_id = auth.uid()
    )
  );

drop policy if exists "chapitres_update" on public.chapitres;
create policy "chapitres_update" on public.chapitres
  for update using (
    exists (
      select 1 from public.scenarios s
      where s.id = chapitres.scenario_id and s.mj_id = auth.uid()
    )
  );

drop policy if exists "chapitres_delete" on public.chapitres;
create policy "chapitres_delete" on public.chapitres
  for delete using (
    exists (
      select 1 from public.scenarios s
      where s.id = chapitres.scenario_id and s.mj_id = auth.uid()
    )
  );


-- ----------------------------------------------------------------------------
-- 5. RLS : scenario_liens — idem
-- ----------------------------------------------------------------------------

alter table public.scenario_liens enable row level security;

drop policy if exists "scenario_liens_select" on public.scenario_liens;
create policy "scenario_liens_select" on public.scenario_liens
  for select using (
    exists (
      select 1 from public.scenarios s
      where s.id = scenario_liens.scenario_id
        and (
          s.mj_id = auth.uid()
          or exists (
            select 1 from public.scenarios_joueurs sj
            where sj.scenario_id = s.id and sj.joueur_id = auth.uid()
          )
        )
    )
  );

drop policy if exists "scenario_liens_insert" on public.scenario_liens;
create policy "scenario_liens_insert" on public.scenario_liens
  for insert with check (
    exists (
      select 1 from public.scenarios s
      where s.id = scenario_liens.scenario_id and s.mj_id = auth.uid()
    )
  );

drop policy if exists "scenario_liens_update" on public.scenario_liens;
create policy "scenario_liens_update" on public.scenario_liens
  for update using (
    exists (
      select 1 from public.scenarios s
      where s.id = scenario_liens.scenario_id and s.mj_id = auth.uid()
    )
  );

drop policy if exists "scenario_liens_delete" on public.scenario_liens;
create policy "scenario_liens_delete" on public.scenario_liens
  for delete using (
    exists (
      select 1 from public.scenarios s
      where s.id = scenario_liens.scenario_id and s.mj_id = auth.uid()
    )
  );


-- ============================================================================
-- Fin de la migration.
-- ============================================================================
