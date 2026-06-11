-- ============================================================================
-- Roadmap Finalisation Phase 5 — Suggestions & problèmes (feedback)
-- ----------------------------------------------------------------------------
-- Table feedback + colonne is_admin sur profiles + RLS.
-- RLS anti-récursion : le contrôle admin passe par une fonction SECURITY
-- DEFINER (est_admin) qui lit profiles en bypassant la RLS — jamais d'EXISTS
-- croisé inline sur profiles dans les policies (cf. convention RLS du projet).
-- ============================================================================

-- ------------------------------------------------------------------
-- 5.4 — Drapeau administrateur (à mettre true manuellement sur ton compte)
-- ------------------------------------------------------------------
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- ------------------------------------------------------------------
-- 5.2 — Table feedback
-- ------------------------------------------------------------------
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  categorie text not null check (categorie in ('probleme', 'suggestion')),
  titre text not null,
  description text not null default '',
  statut text not null default 'nouveau' check (statut in ('nouveau', 'en_cours', 'resolu')),
  metadonnees jsonb not null default '{}'::jsonb, -- { route, user_agent, ecran, langue }
  reponse_admin text,                              -- note interne / réponse au retour
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists feedback_user_idx on public.feedback(user_id);
create index if not exists feedback_statut_idx on public.feedback(statut, created_at desc);

-- ------------------------------------------------------------------
-- Fonction admin (SECURITY DEFINER → pas de récursion RLS)
-- ------------------------------------------------------------------
create or replace function public.est_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- ------------------------------------------------------------------
-- updated_at auto
-- ------------------------------------------------------------------
create or replace function public.feedback_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists feedback_set_updated_at on public.feedback;
create trigger feedback_set_updated_at
  before update on public.feedback
  for each row execute function public.feedback_touch_updated_at();

-- ============================================================================
-- RLS
-- ============================================================================
alter table public.feedback enable row level security;

-- Création : un utilisateur connecté crée ses propres retours.
drop policy if exists feedback_insert_own on public.feedback;
create policy feedback_insert_own on public.feedback
  for insert to authenticated
  with check (user_id = auth.uid());

-- Lecture : son propre retour, ou tout si admin.
drop policy if exists feedback_select_own_or_admin on public.feedback;
create policy feedback_select_own_or_admin on public.feedback
  for select to authenticated
  using (user_id = auth.uid() or public.est_admin());

-- Mise à jour : admin uniquement (changement de statut, réponse interne).
drop policy if exists feedback_update_admin on public.feedback;
create policy feedback_update_admin on public.feedback
  for update to authenticated
  using (public.est_admin())
  with check (public.est_admin());

-- Suppression : propriétaire ou admin.
drop policy if exists feedback_delete_own_or_admin on public.feedback;
create policy feedback_delete_own_or_admin on public.feedback
  for delete to authenticated
  using (user_id = auth.uid() or public.est_admin());
