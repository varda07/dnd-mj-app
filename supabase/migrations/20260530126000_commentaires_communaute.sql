-- ============================================================================
-- Roadmap Affinement 2.14 — Commentaires sur créations communauté
-- ----------------------------------------------------------------------------
-- Commentaires sur entités partagées (scénarios, ennemis, pnj, items, sorts,
-- maps). Threading simple (parent_id self-référence).
-- Le créateur de l'entité ou l'auteur du commentaire peut supprimer.
-- ============================================================================

create table if not exists public.commentaires_communaute (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  auteur_username text not null,
  entite_type text not null,           -- 'scenario' | 'ennemi' | 'pnj' | 'item' | 'sort' | 'map'
  entite_id uuid not null,
  parent_id uuid references public.commentaires_communaute(id) on delete cascade,
  contenu text not null check (length(contenu) > 0 and length(contenu) <= 2000),
  created_at timestamptz not null default now()
);

create index if not exists commentaires_entite_idx
  on public.commentaires_communaute(entite_type, entite_id, created_at desc);
create index if not exists commentaires_user_idx
  on public.commentaires_communaute(user_id);

alter table public.commentaires_communaute enable row level security;

-- Tout le monde authentifié peut lire (les commentaires sont publics)
drop policy if exists "commentaires_select_all" on public.commentaires_communaute;
create policy "commentaires_select_all" on public.commentaires_communaute
  for select to authenticated using (true);

-- N'importe quel utilisateur connecté peut commenter
drop policy if exists "commentaires_insert_own" on public.commentaires_communaute;
create policy "commentaires_insert_own" on public.commentaires_communaute
  for insert to authenticated with check (user_id = auth.uid());

-- L'auteur peut modifier ses propres commentaires
drop policy if exists "commentaires_update_own" on public.commentaires_communaute;
create policy "commentaires_update_own" on public.commentaires_communaute
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- L'auteur du commentaire peut supprimer le sien.
-- La modération par propriétaire de l'entité doit être faite côté app
-- (sinon il faut une fonction SECURITY DEFINER qui vérifie le ownership
-- de chaque entité — coûteux ; on garde simple pour l'instant).
drop policy if exists "commentaires_delete_own" on public.commentaires_communaute;
create policy "commentaires_delete_own" on public.commentaires_communaute
  for delete to authenticated using (user_id = auth.uid());
