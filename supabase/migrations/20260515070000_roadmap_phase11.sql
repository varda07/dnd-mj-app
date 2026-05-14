-- ============================================================================
-- ROADMAP MASTER SCREEN — Phase 11 : Personnalisation
-- ============================================================================
-- À appliquer via `supabase db push`. Idempotent.
-- Couvre : 11.1 thèmes custom, 11.2 wallpapers par scénario, 11.3 emojis
-- de conditions personnalisés.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 11.1 — Custom themes
-- ----------------------------------------------------------------------------
-- `variables` : map { "--nom-variable-css": "valeur" } appliquée au :root.
create table if not exists public.themes_custom (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nom text not null default 'Mon thème',
  variables jsonb not null default '{}'::jsonb,
  public boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists themes_custom_user_idx on public.themes_custom(user_id);

alter table public.themes_custom enable row level security;

-- Lecture : ses propres thèmes OU les thèmes publics.
drop policy if exists "themes_custom_select" on public.themes_custom;
create policy "themes_custom_select" on public.themes_custom
  for select to authenticated
  using (user_id = auth.uid() or public = true);

drop policy if exists "themes_custom_insert" on public.themes_custom;
create policy "themes_custom_insert" on public.themes_custom
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "themes_custom_update" on public.themes_custom;
create policy "themes_custom_update" on public.themes_custom
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "themes_custom_delete" on public.themes_custom;
create policy "themes_custom_delete" on public.themes_custom
  for delete to authenticated using (user_id = auth.uid());


-- ----------------------------------------------------------------------------
-- 11.2 — Wallpapers par scénario
-- ----------------------------------------------------------------------------
-- NB : `bg_image_url` existe déjà (image de fond de combat). `wallpaper_url`
-- est distinct : fond d'ambiance affiché quand le scénario est actif.
alter table public.scenarios
  add column if not exists wallpaper_url text;


-- ----------------------------------------------------------------------------
-- 11.3 — Custom emojis pour conditions
-- ----------------------------------------------------------------------------
-- Map { "<code_condition>": "<emoji>" } : surcharge les emojis par défaut des
-- conditions D&D. Vide = emojis par défaut.
alter table public.profiles
  add column if not exists emojis_conditions jsonb not null default '{}'::jsonb;


-- ============================================================================
-- Fin de la migration Phase 11.
-- ============================================================================
