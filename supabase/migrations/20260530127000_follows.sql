-- ============================================================================
-- Roadmap Affinement 2.15 — Follow d'autres utilisateurs
-- ----------------------------------------------------------------------------
-- Relation follower → following. Permet de construire un flux des nouvelles
-- créations publiques des utilisateurs suivis.
-- ============================================================================

create table if not exists public.follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create index if not exists follows_following_idx on public.follows(following_id, created_at desc);
create index if not exists follows_follower_idx  on public.follows(follower_id, created_at desc);

alter table public.follows enable row level security;

-- Tout le monde peut voir qui suit qui (relations publiques)
drop policy if exists "follows_select_all" on public.follows;
create policy "follows_select_all" on public.follows
  for select to authenticated using (true);

-- Seul l'utilisateur peut créer/supprimer ses propres follows
drop policy if exists "follows_insert_own" on public.follows;
create policy "follows_insert_own" on public.follows
  for insert to authenticated with check (follower_id = auth.uid());

drop policy if exists "follows_delete_own" on public.follows;
create policy "follows_delete_own" on public.follows
  for delete to authenticated using (follower_id = auth.uid());
