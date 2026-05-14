-- ============================================================================
-- ROADMAP MASTER SCREEN — Phase 8 : Session & Campaign
-- ============================================================================
-- À appliquer via `supabase db push`. Idempotent.
-- Couvre : 8.1 recaps de session, 8.4 memo board MJ, 8.5 achievements.
-- Dépend de `security_rls_complete.sql` (fonction `fn_is_scenario_mj`).
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 8.1 — Journal automatique de session
-- ----------------------------------------------------------------------------
-- Un récap par session. `contenu` est un JSONB libre (sections combats / pnj
-- / loot / lieux / quêtes) ; `texte` est la version éditée/finalisée.
create table if not exists public.recaps_sessions (
  id uuid primary key default gen_random_uuid(),
  scenario_id uuid not null references public.scenarios(id) on delete cascade,
  titre text not null default 'Session',
  numero integer not null default 1,
  contenu jsonb not null default '{}'::jsonb,
  texte text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists recaps_sessions_scenario_idx
  on public.recaps_sessions(scenario_id);

alter table public.recaps_sessions enable row level security;

drop policy if exists "recaps_sessions_all" on public.recaps_sessions;
create policy "recaps_sessions_all" on public.recaps_sessions
  for all to authenticated
  using (public.fn_is_scenario_mj(scenario_id))
  with check (public.fn_is_scenario_mj(scenario_id));


-- ----------------------------------------------------------------------------
-- 8.4 — Memo board pour MJ
-- ----------------------------------------------------------------------------
create table if not exists public.memos_mj (
  id uuid primary key default gen_random_uuid(),
  scenario_id uuid not null references public.scenarios(id) on delete cascade,
  texte text not null default '',
  fait boolean not null default false,
  ordre integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists memos_mj_scenario_idx on public.memos_mj(scenario_id);

alter table public.memos_mj enable row level security;

drop policy if exists "memos_mj_all" on public.memos_mj;
create policy "memos_mj_all" on public.memos_mj
  for all to authenticated
  using (public.fn_is_scenario_mj(scenario_id))
  with check (public.fn_is_scenario_mj(scenario_id));


-- ----------------------------------------------------------------------------
-- 8.5 — Achievements de campagne
-- ----------------------------------------------------------------------------
-- Catalogue global d'achievements (en lecture pour tous les utilisateurs
-- connectés ; aucune écriture client) + table de déblocage par utilisateur.
create table if not exists public.achievements (
  code text primary key,
  titre text not null,
  description text not null,
  emoji text not null default '🏆',
  ordre integer not null default 0
);

alter table public.achievements enable row level security;
drop policy if exists "achievements_read" on public.achievements;
create policy "achievements_read" on public.achievements
  for select to authenticated using (true);

create table if not exists public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_code text not null references public.achievements(code) on delete cascade,
  unlocked_at timestamptz not null default now(),
  unique (user_id, achievement_code)
);
create index if not exists user_achievements_user_idx
  on public.user_achievements(user_id);

alter table public.user_achievements enable row level security;

drop policy if exists "user_achievements_select" on public.user_achievements;
create policy "user_achievements_select" on public.user_achievements
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "user_achievements_insert" on public.user_achievements;
create policy "user_achievements_insert" on public.user_achievements
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "user_achievements_delete" on public.user_achievements;
create policy "user_achievements_delete" on public.user_achievements
  for delete to authenticated using (user_id = auth.uid());

-- Catalogue par défaut.
insert into public.achievements (code, titre, description, emoji, ordre) values
  ('premiere_mort',  'Première mort',      'Un personnage joueur est tombé pour la première fois.', '💀', 1),
  ('cent_des',       '100 dés lancés',     'Lancer 100 dés au total.',                               '🎲', 2),
  ('niveau_10',      'Niveau 10 atteint',  'Un personnage a atteint le niveau 10.',                  '🆙', 3),
  ('premier_crit',   'Coup critique',      'Obtenir un 20 naturel.',                                 '⚔️', 4),
  ('boss_vaincu',    'Tueur de boss',      'Vaincre un boss en combat.',                             '🐉', 5),
  ('dix_sessions',   '10 sessions',        'Compléter 10 sessions de jeu.',                          '📅', 6)
on conflict (code) do nothing;


-- ============================================================================
-- Fin de la migration Phase 8.
-- ============================================================================
