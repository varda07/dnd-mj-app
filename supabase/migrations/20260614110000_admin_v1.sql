-- ============================================================================
-- ROADMAP V1 — Phase 3 : Mode admin enrichi
-- ----------------------------------------------------------------------------
--   3.1 admin_stats()         — fonction SECURITY DEFINER : stats globales
--   3.2 annonces_globales     — annonces poussées à tous (lues par tous)
--   3.3 signalements          — signalement de contenu communautaire
--   3.5 usage_analytics       — tracking basique anonymisable
--   3.6 colonnes officiel     — contenu officiel/vérifié (lecture par tous)
--   3.7 feature_flags         — activation/désactivation de features à distance
-- Convention RLS : contrôle admin via la fonction est_admin() (SECURITY
-- DEFINER, déjà créée en 20260611120000_feedback.sql). Aucun EXISTS croisé
-- inline sur profiles.
-- ============================================================================

-- ===========================================================================
-- 3.1 — Statistiques globales (fonction SECURITY DEFINER, admin only)
-- ===========================================================================
create or replace function public.admin_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  resultat jsonb;
  series jsonb;
begin
  -- Garde-fou : réservé aux admins.
  if not public.est_admin() then
    raise exception 'Accès réservé aux administrateurs';
  end if;

  -- Série « nouveaux utilisateurs » sur 6 mois (à partir de auth.users).
  select jsonb_agg(jsonb_build_object('mois', to_char(m, 'YYYY-MM'), 'nb', coalesce(c, 0)) order by m)
  into series
  from (
    select date_trunc('month', d)::date as m
    from generate_series(date_trunc('month', now()) - interval '5 months', date_trunc('month', now()), interval '1 month') d
  ) months
  left join (
    select date_trunc('month', created_at)::date as cm, count(*) c
    from auth.users
    group by 1
  ) u on u.cm = months.m;

  resultat := jsonb_build_object(
    'utilisateurs', (select count(*) from auth.users),
    'utilisateurs_actifs_7j', (select count(*) from auth.users where last_sign_in_at > now() - interval '7 days'),
    'utilisateurs_nouveaux_30j', (select count(*) from auth.users where created_at > now() - interval '30 days'),
    'scenarios', (select count(*) from public.scenarios),
    'personnages', (select count(*) from public.personnages),
    'ennemis', (select count(*) from public.ennemis),
    'pnj', (select count(*) from public.pnj),
    'items', (select count(*) from public.items),
    'sorts', (select count(*) from public.sorts),
    'combats', (select count(*) from public.combats),
    'sessions_diffusion', (select count(*) from public.sessions_presentation),
    'tables_effets', (select count(*) from public.tables_effets_custom),
    'serie_utilisateurs', coalesce(series, '[]'::jsonb)
  );
  return resultat;
end;
$$;

-- ===========================================================================
-- 3.2 — Annonces globales (lues par tous, écrites par les admins)
-- ===========================================================================
create table if not exists public.annonces_globales (
  id uuid primary key default gen_random_uuid(),
  auteur_id uuid references auth.users(id) on delete set null,
  titre text not null,
  message text not null default '',
  type text not null default 'info' check (type in ('info', 'maintenance', 'nouveaute')),
  lien text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists annonces_globales_active_idx
  on public.annonces_globales(active, created_at desc);

alter table public.annonces_globales enable row level security;

-- Lecture : tout utilisateur connecté voit les annonces actives ; un admin
-- voit tout (y compris l'historique désactivé).
drop policy if exists annonces_select on public.annonces_globales;
create policy annonces_select on public.annonces_globales
  for select to authenticated
  using (active = true or public.est_admin());

-- Écriture / mise à jour / suppression : admin uniquement.
drop policy if exists annonces_insert_admin on public.annonces_globales;
create policy annonces_insert_admin on public.annonces_globales
  for insert to authenticated with check (public.est_admin());

drop policy if exists annonces_update_admin on public.annonces_globales;
create policy annonces_update_admin on public.annonces_globales
  for update to authenticated using (public.est_admin()) with check (public.est_admin());

drop policy if exists annonces_delete_admin on public.annonces_globales;
create policy annonces_delete_admin on public.annonces_globales
  for delete to authenticated using (public.est_admin());

-- ===========================================================================
-- 3.3 / 3.4 — Signalements de contenu communautaire
-- ===========================================================================
create table if not exists public.signalements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  contenu_type text not null,          -- scenario | commentaire | table_effet | ...
  contenu_id text not null,
  raison text not null check (raison in ('inapproprie', 'spam', 'plagiat', 'autre')),
  description text not null default '',
  statut text not null default 'nouveau' check (statut in ('nouveau', 'traite', 'rejete')),
  note_admin text,
  created_at timestamptz not null default now()
);
create index if not exists signalements_statut_idx on public.signalements(statut, created_at desc);

alter table public.signalements enable row level security;

-- Création : tout utilisateur connecté peut signaler.
drop policy if exists signalements_insert on public.signalements;
create policy signalements_insert on public.signalements
  for insert to authenticated with check (user_id = auth.uid());

-- Lecture : son propre signalement, ou tout si admin.
drop policy if exists signalements_select on public.signalements;
create policy signalements_select on public.signalements
  for select to authenticated using (user_id = auth.uid() or public.est_admin());

-- Mise à jour (changement de statut, note) : admin uniquement.
drop policy if exists signalements_update_admin on public.signalements;
create policy signalements_update_admin on public.signalements
  for update to authenticated using (public.est_admin()) with check (public.est_admin());

drop policy if exists signalements_delete_admin on public.signalements;
create policy signalements_delete_admin on public.signalements
  for delete to authenticated using (user_id = auth.uid() or public.est_admin());

-- ===========================================================================
-- 3.5 — Analytics d'usage (tracking basique, anonymisable)
-- ===========================================================================
create table if not exists public.usage_analytics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  action text not null,                -- ex. 'page_view', 'feature:combat_lance'
  metadonnees jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists usage_analytics_action_idx on public.usage_analytics(action, created_at desc);

alter table public.usage_analytics enable row level security;

-- Écriture : tout utilisateur connecté logge ses propres actions (ou anonyme).
drop policy if exists usage_insert on public.usage_analytics;
create policy usage_insert on public.usage_analytics
  for insert to authenticated
  with check (user_id is null or user_id = auth.uid());

-- Lecture : admin uniquement (agrégats).
drop policy if exists usage_select_admin on public.usage_analytics;
create policy usage_select_admin on public.usage_analytics
  for select to authenticated using (public.est_admin());

-- Agrégat top-features pour la page admin (SECURITY DEFINER, admin only).
create or replace function public.admin_analytics_top(jours int default 30)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  resultat jsonb;
begin
  if not public.est_admin() then
    raise exception 'Accès réservé aux administrateurs';
  end if;
  select jsonb_agg(jsonb_build_object('action', action, 'nb', nb) order by nb desc)
  into resultat
  from (
    select action, count(*) nb
    from public.usage_analytics
    where created_at > now() - (jours || ' days')::interval
    group by action
    order by nb desc
    limit 50
  ) t;
  return coalesce(resultat, '[]'::jsonb);
end;
$$;

-- ===========================================================================
-- 3.7 — Feature flags
-- ===========================================================================
create table if not exists public.feature_flags (
  id uuid primary key default gen_random_uuid(),
  nom text not null unique,
  actif boolean not null default true,
  description text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.feature_flags enable row level security;

-- Lecture : tout le monde (pour masquer une feature désactivée côté client).
drop policy if exists feature_flags_select on public.feature_flags;
create policy feature_flags_select on public.feature_flags
  for select to authenticated using (true);

-- Écriture : admin uniquement.
drop policy if exists feature_flags_write_admin on public.feature_flags;
create policy feature_flags_write_admin on public.feature_flags
  for all to authenticated using (public.est_admin()) with check (public.est_admin());

-- ===========================================================================
-- 3.6 — Contenu officiel (colonnes + lecture publique des contenus officiels)
-- ===========================================================================
alter table public.scenarios   add column if not exists officiel boolean not null default false;
alter table public.ennemis     add column if not exists officiel boolean not null default false;
alter table public.sorts       add column if not exists officiel boolean not null default false;
alter table public.items       add column if not exists officiel boolean not null default false;
alter table public.pnj         add column if not exists officiel boolean not null default false;

-- Lecture publique additive du contenu marqué officiel (non récursive : simple
-- prédicat booléen, pas d'EXISTS croisé). Les policies existantes restent.
drop policy if exists scenarios_select_officiel on public.scenarios;
create policy scenarios_select_officiel on public.scenarios
  for select to authenticated using (officiel = true);

drop policy if exists ennemis_select_officiel on public.ennemis;
create policy ennemis_select_officiel on public.ennemis
  for select to authenticated using (officiel = true);

drop policy if exists sorts_select_officiel on public.sorts;
create policy sorts_select_officiel on public.sorts
  for select to authenticated using (officiel = true);

drop policy if exists items_select_officiel on public.items;
create policy items_select_officiel on public.items
  for select to authenticated using (officiel = true);

drop policy if exists pnj_select_officiel on public.pnj;
create policy pnj_select_officiel on public.pnj
  for select to authenticated using (officiel = true);

-- Mise à jour du drapeau officiel : admin uniquement (policies additives).
drop policy if exists scenarios_update_officiel_admin on public.scenarios;
create policy scenarios_update_officiel_admin on public.scenarios
  for update to authenticated using (public.est_admin()) with check (public.est_admin());

drop policy if exists ennemis_update_officiel_admin on public.ennemis;
create policy ennemis_update_officiel_admin on public.ennemis
  for update to authenticated using (public.est_admin()) with check (public.est_admin());

drop policy if exists sorts_update_officiel_admin on public.sorts;
create policy sorts_update_officiel_admin on public.sorts
  for update to authenticated using (public.est_admin()) with check (public.est_admin());

drop policy if exists items_update_officiel_admin on public.items;
create policy items_update_officiel_admin on public.items
  for update to authenticated using (public.est_admin()) with check (public.est_admin());

drop policy if exists pnj_update_officiel_admin on public.pnj;
create policy pnj_update_officiel_admin on public.pnj
  for update to authenticated using (public.est_admin()) with check (public.est_admin());

comment on function public.admin_stats() is 'V1 3.1 — stats globales plateforme (admin only).';
comment on table public.annonces_globales is 'V1 3.2 — annonces poussées à tous les utilisateurs.';
comment on table public.signalements is 'V1 3.3/3.4 — signalements de contenu communautaire.';
comment on table public.usage_analytics is 'V1 3.5 — tracking d''usage anonymisable.';
comment on table public.feature_flags is 'V1 3.7 — activation/désactivation de features à distance.';
