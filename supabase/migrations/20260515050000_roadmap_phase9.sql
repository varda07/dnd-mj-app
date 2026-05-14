-- ============================================================================
-- ROADMAP MASTER SCREEN — Phase 9 : Communauté
-- ============================================================================
-- À appliquer via `supabase db push`. Idempotent.
-- Couvre : 9.1 profils publics, 9.2 likes, 9.3 notations de scénarios.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 9.1 — Profils publics utilisateurs
-- ----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists bio text not null default '',
  add column if not exists ville text not null default '',
  add column if not exists langues_parlees text not null default '';

-- Lecture publique des profils (nécessaire pour la page /profil/[username]).
-- On ajoute une policy de SELECT ouverte ; les colonnes sensibles ne sont pas
-- exposées par le code (la page ne sélectionne que les champs publics).
drop policy if exists "profiles_public_read" on public.profiles;
create policy "profiles_public_read" on public.profiles
  for select to anon, authenticated using (true);


-- ----------------------------------------------------------------------------
-- 9.2 — Système de likes
-- ----------------------------------------------------------------------------
-- Like polymorphe sur n'importe quelle entité partagée (scenario, item, map,
-- sort, pnj, ennemi, personnage, mindmap…).
create table if not exists public.likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entite_type text not null,
  entite_id uuid not null,
  created_at timestamptz not null default now(),
  unique (user_id, entite_type, entite_id)
);
create index if not exists likes_entite_idx on public.likes(entite_type, entite_id);
create index if not exists likes_user_idx on public.likes(user_id);

alter table public.likes enable row level security;

-- Lecture ouverte (compteurs + liste des utilisateurs ayant aimé).
drop policy if exists "likes_select" on public.likes;
create policy "likes_select" on public.likes
  for select to anon, authenticated using (true);

drop policy if exists "likes_insert" on public.likes;
create policy "likes_insert" on public.likes
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "likes_delete" on public.likes;
create policy "likes_delete" on public.likes
  for delete to authenticated using (user_id = auth.uid());


-- ----------------------------------------------------------------------------
-- 9.3 — Étoiles + commentaires sur scénarios
-- ----------------------------------------------------------------------------
create table if not exists public.notations_scenarios (
  id uuid primary key default gen_random_uuid(),
  scenario_id uuid not null references public.scenarios(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  etoiles integer not null default 5 check (etoiles between 1 and 5),
  commentaire text not null default '',
  created_at timestamptz not null default now(),
  unique (scenario_id, user_id)
);
create index if not exists notations_scenarios_scenario_idx
  on public.notations_scenarios(scenario_id);

alter table public.notations_scenarios enable row level security;

-- Lecture ouverte (moyennes + commentaires sur la fiche scénario publique).
drop policy if exists "notations_scenarios_select" on public.notations_scenarios;
create policy "notations_scenarios_select" on public.notations_scenarios
  for select to anon, authenticated using (true);

drop policy if exists "notations_scenarios_insert" on public.notations_scenarios;
create policy "notations_scenarios_insert" on public.notations_scenarios
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "notations_scenarios_update" on public.notations_scenarios;
create policy "notations_scenarios_update" on public.notations_scenarios
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "notations_scenarios_delete" on public.notations_scenarios;
create policy "notations_scenarios_delete" on public.notations_scenarios
  for delete to authenticated using (user_id = auth.uid());


-- ============================================================================
-- Fin de la migration Phase 9.
-- ============================================================================
