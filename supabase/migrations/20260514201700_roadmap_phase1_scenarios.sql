-- ============================================================================
-- ROADMAP MASTER SCREEN — Phase 1 : Scénarios
-- ============================================================================
-- À exécuter dans le SQL Editor de Supabase. Idempotent.
-- Couvre : 1.1 embranchements mindmap, 1.2 session zéro, 1.3 notes secrètes MJ,
--          1.4 durée estimée par chapitre.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1.1 — Embranchements visuels : type de chemin sur les liens de mindmap
-- ----------------------------------------------------------------------------
-- 'principal' | 'alternatif' | 'secret' | 'echec'  + flag « exploré ».
alter table public.mindmap_liens
  add column if not exists type_chemin text not null default 'principal',
  add column if not exists explore boolean not null default false;


-- ----------------------------------------------------------------------------
-- 1.3 — Notes secrètes MJ sur le scénario
-- ----------------------------------------------------------------------------
alter table public.scenarios
  add column if not exists notes_secretes text;


-- ----------------------------------------------------------------------------
-- 1.4 — Durée estimée par chapitre (en minutes)
-- ----------------------------------------------------------------------------
alter table public.chapitres
  add column if not exists duree_estimee integer not null default 0;


-- ----------------------------------------------------------------------------
-- 1.2 — Session zéro : un document par scénario
-- ----------------------------------------------------------------------------
-- Le contenu (lignes rouges, attentes, ton, tabous, inspirations, ratios…) est
-- stocké en JSONB libre — le schéma exact vit côté client.
create table if not exists public.session_zero (
  id uuid primary key default gen_random_uuid(),
  scenario_id uuid not null unique references public.scenarios(id) on delete cascade,
  contenu jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists session_zero_scenario_idx
  on public.session_zero(scenario_id);

alter table public.session_zero enable row level security;

-- Lecture : MJ + joueurs inscrits (les joueurs peuvent contribuer).
-- Écriture : MJ + joueurs inscrits (contribution collaborative).
-- On réutilise les fonctions SECURITY DEFINER de security_rls_complete.sql.
drop policy if exists "session_zero_select" on public.session_zero;
create policy "session_zero_select" on public.session_zero
  for select to authenticated
  using (public.fn_is_scenario_member(scenario_id));

drop policy if exists "session_zero_insert" on public.session_zero;
create policy "session_zero_insert" on public.session_zero
  for insert to authenticated
  with check (public.fn_is_scenario_member(scenario_id));

drop policy if exists "session_zero_update" on public.session_zero;
create policy "session_zero_update" on public.session_zero
  for update to authenticated
  using (public.fn_is_scenario_member(scenario_id))
  with check (public.fn_is_scenario_member(scenario_id));

drop policy if exists "session_zero_delete" on public.session_zero;
create policy "session_zero_delete" on public.session_zero
  for delete to authenticated
  using (public.fn_is_scenario_mj(scenario_id));

-- Réveil de updated_at
create or replace function public.touch_session_zero()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists session_zero_touch on public.session_zero;
create trigger session_zero_touch
  before update on public.session_zero
  for each row execute function public.touch_session_zero();


-- ============================================================================
-- Fin de la migration Phase 1.
-- ============================================================================
