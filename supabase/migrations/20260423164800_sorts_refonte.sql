-- ============================================================================
-- Refonte des sorts : modèles réutilisables + junction M:N avec personnages
-- ============================================================================
-- À exécuter dans le SQL Editor de Supabase. Idempotent.
--
-- Avant : 1 sort = 1 personnage. Colonne `disponible` sur `sorts`.
-- Après : 1 sort = 1 modèle possédé par un user, partageable entre plusieurs
--         personnages via la table `personnage_sorts` (qui porte le
--         `disponible` par personnage).
--
-- La colonne `sorts.personnage_id` est rendue nullable et conservée pour la
-- compatibilité descendante (les anciennes lignes restent lisibles). La colonne
-- `sorts.disponible` est conservée comme fallback mais n'est plus utilisée.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. COLONNES : user_id sur sorts, personnage_id nullable
-- ----------------------------------------------------------------------------

alter table public.sorts
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- Backfill : pour chaque sort existant lié à un perso, user_id = joueur_id du perso.
update public.sorts s
set user_id = p.joueur_id
from public.personnages p
where s.personnage_id = p.id
  and s.user_id is null;

-- Rend personnage_id nullable (peut être not null dans la version initiale).
alter table public.sorts
  alter column personnage_id drop not null;

create index if not exists sorts_user_id_idx on public.sorts(user_id);


-- ----------------------------------------------------------------------------
-- 2. TABLE personnage_sorts (junction M:N)
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
-- 3. MIGRATION : peuple personnage_sorts depuis l'ancien lien 1:N
-- ----------------------------------------------------------------------------
-- On insère une ligne de junction pour chaque (sort_id, personnage_id) existant,
-- en propageant le `disponible` historique. `on conflict do nothing` au cas où
-- la migration est rejouée.

insert into public.personnage_sorts (personnage_id, sort_id, disponible)
select s.personnage_id, s.id, coalesce(s.disponible, true)
from public.sorts s
where s.personnage_id is not null
on conflict (personnage_id, sort_id) do nothing;


-- ----------------------------------------------------------------------------
-- 4. RLS : sorts — propriétaire via user_id (+ fallback via personnage pour
--         les lignes historiques non migrées user_id = null)
-- ----------------------------------------------------------------------------

alter table public.sorts enable row level security;

drop policy if exists "sorts_select" on public.sorts;
create policy "sorts_select" on public.sorts
  for select using (
    auth.uid() = user_id
    or exists (
      select 1 from public.personnages p
      where p.id = sorts.personnage_id
        and (
          p.joueur_id = auth.uid()
          or exists (
            select 1 from public.scenarios_joueurs sj
            join public.scenarios s on s.id = sj.scenario_id
            where sj.joueur_id = p.joueur_id and s.mj_id = auth.uid()
          )
        )
    )
    -- Lecture aussi autorisée pour les sorts attribués à un perso appartenant
    -- au joueur connecté, même si la junction est la source de vérité.
    or exists (
      select 1 from public.personnage_sorts ps
      join public.personnages p2 on p2.id = ps.personnage_id
      where ps.sort_id = sorts.id
        and (
          p2.joueur_id = auth.uid()
          or exists (
            select 1 from public.scenarios_joueurs sj2
            join public.scenarios s2 on s2.id = sj2.scenario_id
            where sj2.joueur_id = p2.joueur_id and s2.mj_id = auth.uid()
          )
        )
    )
    -- Lecture des sorts publics (fonctionnalité communautaire existante).
    or public = true
  );

drop policy if exists "sorts_insert" on public.sorts;
create policy "sorts_insert" on public.sorts
  for insert with check (
    auth.uid() = user_id
    or exists (
      select 1 from public.personnages p
      where p.id = sorts.personnage_id and p.joueur_id = auth.uid()
    )
  );

drop policy if exists "sorts_update" on public.sorts;
create policy "sorts_update" on public.sorts
  for update using (
    auth.uid() = user_id
    or exists (
      select 1 from public.personnages p
      where p.id = sorts.personnage_id and p.joueur_id = auth.uid()
    )
  );

drop policy if exists "sorts_delete" on public.sorts;
create policy "sorts_delete" on public.sorts
  for delete using (
    auth.uid() = user_id
    or exists (
      select 1 from public.personnages p
      where p.id = sorts.personnage_id and p.joueur_id = auth.uid()
    )
  );


-- ----------------------------------------------------------------------------
-- 5. RLS : personnage_sorts — accès aligné sur l'ownership du perso
-- ----------------------------------------------------------------------------

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


-- ============================================================================
-- Fin de la migration. Vérifications :
--
--   select column_name, is_nullable from information_schema.columns
--     where table_schema='public' and table_name='sorts'
--       and column_name in ('user_id','personnage_id');
--   -- personnage_id doit être YES, user_id doit exister.
--
--   select count(*) from public.personnage_sorts;
--   -- >= nombre de sorts historiques liés à un perso.
-- ============================================================================
