-- ============================================================================
-- Table de jonction personnage_sorts (M:N entre personnages et sorts)
-- ============================================================================
-- À exécuter dans le SQL Editor de Supabase. Idempotent.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. TABLE
-- ----------------------------------------------------------------------------

create table if not exists public.personnage_sorts (
  id uuid primary key default gen_random_uuid(),
  personnage_id uuid not null references public.personnages(id) on delete cascade,
  sort_id uuid not null references public.sorts(id) on delete cascade,
  disponible boolean not null default true,
  created_at timestamptz not null default now(),
  unique (personnage_id, sort_id)
);

create index if not exists personnage_sorts_perso_idx on public.personnage_sorts(personnage_id);
create index if not exists personnage_sorts_sort_idx on public.personnage_sorts(sort_id);


-- ----------------------------------------------------------------------------
-- 2. RLS
-- ----------------------------------------------------------------------------
-- Le propriétaire du personnage (joueur_id) peut tout faire.
-- Le MJ d'un scénario auquel le joueur participe peut lire.

alter table public.personnage_sorts enable row level security;

drop policy if exists "persorts_select" on public.personnage_sorts;
create policy "persorts_select" on public.personnage_sorts
  for select using (
    exists (
      select 1 from public.personnages p
      where p.id = personnage_sorts.personnage_id
        and (
          p.joueur_id = auth.uid()
          or exists (
            select 1 from public.scenarios_joueurs sj
            join public.scenarios s on s.id = sj.scenario_id
            where sj.joueur_id = p.joueur_id and s.mj_id = auth.uid()
          )
        )
    )
  );

drop policy if exists "persorts_insert" on public.personnage_sorts;
create policy "persorts_insert" on public.personnage_sorts
  for insert with check (
    exists (
      select 1 from public.personnages p
      where p.id = personnage_sorts.personnage_id and p.joueur_id = auth.uid()
    )
  );

drop policy if exists "persorts_update" on public.personnage_sorts;
create policy "persorts_update" on public.personnage_sorts
  for update using (
    exists (
      select 1 from public.personnages p
      where p.id = personnage_sorts.personnage_id and p.joueur_id = auth.uid()
    )
  );

drop policy if exists "persorts_delete" on public.personnage_sorts;
create policy "persorts_delete" on public.personnage_sorts
  for delete using (
    exists (
      select 1 from public.personnages p
      where p.id = personnage_sorts.personnage_id and p.joueur_id = auth.uid()
    )
  );
