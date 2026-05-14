-- ============================================================================
-- Sessions de diffusion du mode Présentation (pilotage multi-écran)
-- ============================================================================
-- À exécuter dans le SQL Editor de Supabase. Idempotent.
--
-- Une session relie l'écran de contrôle du MJ (/dashboard/presentation/pilote)
-- à l'écran joueurs public (/presentation/[sessionId]). L'écran joueurs n'exige
-- PAS de connexion : il lit la session via son code (qui est le secret).
--
--   - code_session       : code court partageable (lien + QR)
--   - narration_actuelle : dernier texte narratif poussé à l'écran
--   - image_actuelle     : URL de l'image affichée en plein écran (ou null)
--   - etat_jeu jsonb     : état libre synchronisé (actions rapides, voile
--                          mystère, pause, ambiance…) — voir le client pour le
--                          schéma exact, ex :
--                          { "voile_mystere": false, "pause": false,
--                            "ambiance": "combat"|"mystere"|"exploration"|null,
--                            "effet": { "type": "crit"|"ko"|"notif", ... } }
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Table
-- ----------------------------------------------------------------------------

create table if not exists public.sessions_presentation (
  id uuid primary key default gen_random_uuid(),
  mj_id uuid not null references auth.users(id) on delete cascade,
  scenario_id uuid references public.scenarios(id) on delete set null,
  code_session text not null unique,
  narration_actuelle text,
  image_actuelle text,
  etat_jeu jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sessions_presentation_mj_idx
  on public.sessions_presentation(mj_id);
create index if not exists sessions_presentation_code_idx
  on public.sessions_presentation(code_session);
create index if not exists sessions_presentation_scenario_idx
  on public.sessions_presentation(scenario_id);


-- ----------------------------------------------------------------------------
-- 2. RLS
-- ----------------------------------------------------------------------------
-- Lecture : PUBLIQUE (l'écran joueurs n'est pas authentifié — le code de
--           session fait office de secret, comme pour codes_invitation).
-- Écriture : le MJ propriétaire uniquement.
-- Pas de FORCE RLS (cohérent avec security_rls_complete.sql).

alter table public.sessions_presentation enable row level security;

drop policy if exists "sessions_presentation_select" on public.sessions_presentation;
create policy "sessions_presentation_select" on public.sessions_presentation
  for select using (true);

drop policy if exists "sessions_presentation_insert" on public.sessions_presentation;
create policy "sessions_presentation_insert" on public.sessions_presentation
  for insert to authenticated with check (auth.uid() = mj_id);

drop policy if exists "sessions_presentation_update" on public.sessions_presentation;
create policy "sessions_presentation_update" on public.sessions_presentation
  for update to authenticated
  using (auth.uid() = mj_id)
  with check (auth.uid() = mj_id);

drop policy if exists "sessions_presentation_delete" on public.sessions_presentation;
create policy "sessions_presentation_delete" on public.sessions_presentation
  for delete to authenticated using (auth.uid() = mj_id);


-- ----------------------------------------------------------------------------
-- 3. Réveil de updated_at à chaque écriture (pour le tri / la fraîcheur)
-- ----------------------------------------------------------------------------

create or replace function public.touch_sessions_presentation()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists sessions_presentation_touch on public.sessions_presentation;
create trigger sessions_presentation_touch
  before update on public.sessions_presentation
  for each row execute function public.touch_sessions_presentation();


-- ----------------------------------------------------------------------------
-- 4. Realtime — l'écran joueurs public reçoit les changements en direct
-- ----------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'sessions_presentation'
  ) then
    execute 'alter publication supabase_realtime add table public.sessions_presentation';
  end if;
end $$;


-- ============================================================================
-- Fin de la migration.
-- ============================================================================
