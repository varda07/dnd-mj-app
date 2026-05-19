-- ============================================================================
-- PHASE 5 — Wild Magic (table d'effets ensorceleurs)
-- ============================================================================
-- 5.1/5.2/5.3 : la table officielle Wild Magic vit dans `app/data/`. Côté
--               base on persiste l'effet courant pour le synchroniser sur
--               l'écran joueurs via `presentation_etats.wild_magic`.
-- 5.4        : tables d'effets custom créées par le MJ (autres classes /
--              items magiques). 1 table par utilisateur, contenant un tableau
--              jsonb d'effets ({min, max, titre, description}).
-- ============================================================================

-- 1. Sync écran joueurs : champ jsonb sur presentation_etats ----------------
alter table public.presentation_etats
  add column if not exists wild_magic jsonb;

-- 2. Tables d'effets custom -------------------------------------------------
create table if not exists public.tables_effets_custom (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nom text not null,
  description text,
  effets jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists tables_effets_custom_user_id_idx
  on public.tables_effets_custom(user_id);

-- 3. RLS --------------------------------------------------------------------
alter table public.tables_effets_custom enable row level security;

drop policy if exists "tables_effets_custom_select" on public.tables_effets_custom;
create policy "tables_effets_custom_select" on public.tables_effets_custom
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "tables_effets_custom_insert" on public.tables_effets_custom;
create policy "tables_effets_custom_insert" on public.tables_effets_custom
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "tables_effets_custom_update" on public.tables_effets_custom;
create policy "tables_effets_custom_update" on public.tables_effets_custom
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "tables_effets_custom_delete" on public.tables_effets_custom;
create policy "tables_effets_custom_delete" on public.tables_effets_custom
  for delete to authenticated using (user_id = auth.uid());

comment on table public.tables_effets_custom is
  'Roadmap Post-Test 5.4 — tables d''effets aléatoires personnalisées (Wild Magic-like).';
