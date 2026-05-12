-- ============================================================================
-- Relations entre PNJ et autres entités (PNJ, personnages, ennemis)
-- ============================================================================
-- À exécuter dans le SQL Editor de Supabase. Idempotent.
--
-- Une relation est directionnelle (pnj_id → entite). entite_type indique vers
-- quelle table pointe entite_id (personnage / pnj / ennemi). On ne pose pas de
-- FK polymorphique : intégrité côté application.
-- L'intensité va de 0 (hostile) à 100 (dévoué).
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Table pnj_relations
-- ----------------------------------------------------------------------------

create table if not exists public.pnj_relations (
  id uuid primary key default gen_random_uuid(),
  mj_id uuid not null references auth.users(id) on delete cascade,
  pnj_id uuid not null references public.pnj(id) on delete cascade,
  entite_type text not null
    check (entite_type in ('personnage', 'pnj', 'ennemi')),
  entite_id uuid not null,
  type_relation text not null default 'neutre',
  description text,
  intensite integer not null default 50
    check (intensite >= 0 and intensite <= 100),
  created_at timestamptz not null default now()
);

create index if not exists pnj_relations_pnj_idx on public.pnj_relations(pnj_id);
create index if not exists pnj_relations_mj_idx on public.pnj_relations(mj_id);
create index if not exists pnj_relations_entite_idx on public.pnj_relations(entite_id);


-- ----------------------------------------------------------------------------
-- 2. RLS : propriétaire (MJ) en full access
-- ----------------------------------------------------------------------------

alter table public.pnj_relations enable row level security;

drop policy if exists "pnj_relations_select" on public.pnj_relations;
create policy "pnj_relations_select" on public.pnj_relations
  for select using (auth.uid() = mj_id);

drop policy if exists "pnj_relations_insert" on public.pnj_relations;
create policy "pnj_relations_insert" on public.pnj_relations
  for insert with check (auth.uid() = mj_id);

drop policy if exists "pnj_relations_update" on public.pnj_relations;
create policy "pnj_relations_update" on public.pnj_relations
  for update using (auth.uid() = mj_id);

drop policy if exists "pnj_relations_delete" on public.pnj_relations;
create policy "pnj_relations_delete" on public.pnj_relations
  for delete using (auth.uid() = mj_id);


-- ============================================================================
-- Fin de la migration.
-- ============================================================================
