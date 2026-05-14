-- ============================================================================
-- ROADMAP MASTER SCREEN — Phase 10 : Ergonomie
-- ============================================================================
-- À appliquer via `supabase db push`. Idempotent.
-- Couvre : 10.2 historique des actions, 10.4 notifications.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 10.2 — Historique des actions
-- ----------------------------------------------------------------------------
create table if not exists public.historique_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  action_type text not null,          -- creation | modification | suppression | combat | session
  entite_type text not null default '',
  entite_id uuid,
  description text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists historique_actions_user_idx
  on public.historique_actions(user_id, created_at desc);

alter table public.historique_actions enable row level security;

drop policy if exists "historique_actions_select" on public.historique_actions;
create policy "historique_actions_select" on public.historique_actions
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "historique_actions_insert" on public.historique_actions;
create policy "historique_actions_insert" on public.historique_actions
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "historique_actions_delete" on public.historique_actions;
create policy "historique_actions_delete" on public.historique_actions
  for delete to authenticated using (user_id = auth.uid());


-- ----------------------------------------------------------------------------
-- 10.4 — Notifications
-- ----------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null default 'info',
  message text not null default '',
  lien text not null default '',
  lu boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx
  on public.notifications(user_id, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "notifications_select" on public.notifications;
create policy "notifications_select" on public.notifications
  for select to authenticated using (user_id = auth.uid());

-- Insert autorisé : soit pour soi-même, soit par un autre utilisateur
-- authentifié (ex. « un joueur a rejoint ton scénario »). On reste permissif
-- côté with check car le destinataire est toujours `user_id`.
drop policy if exists "notifications_insert" on public.notifications;
create policy "notifications_insert" on public.notifications
  for insert to authenticated with check (true);

drop policy if exists "notifications_update" on public.notifications;
create policy "notifications_update" on public.notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "notifications_delete" on public.notifications;
create policy "notifications_delete" on public.notifications
  for delete to authenticated using (user_id = auth.uid());


-- ============================================================================
-- Fin de la migration Phase 10.
-- ============================================================================
