-- ============================================================================
-- MODE SESSION — Phase 1 : modèle de données
-- ============================================================================
-- Refonte « Mode Diffusion » → « Mode Session » (app/roadmap-mode-session.md).
-- Crée le socle d'une vraie session de jeu : sessions, état partagé temps réel,
-- participants, état vivant des personnages, journal d'événements.
--
-- 100 % idempotent (create ... if not exists / drop policy if exists).
-- RLS : réutilise les fonctions SECURITY DEFINER de 20260514144400_security_rls_complete
-- (fn_is_scenario_mj, fn_has_joined_scenario, fn_owns_personnage…) — ZÉRO récursion :
-- une fonction SECURITY DEFINER n'applique pas la RLS des tables qu'elle interroge.
--
-- Ne touche PAS au mode diffusion existant (sessions_presentation, presentation_etats,
-- combats) : le nouveau socle est construit À CÔTÉ. Migration/nettoyage = Phase 5.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 0. Helper : touch updated_at
-- ----------------------------------------------------------------------------

create or replace function public.mode_session_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;


-- ----------------------------------------------------------------------------
-- 1.1 game_sessions
-- ----------------------------------------------------------------------------

create table if not exists public.game_sessions (
  id           uuid primary key default gen_random_uuid(),
  scenario_id  uuid not null references public.scenarios(id) on delete cascade,
  mj_user_id   uuid not null references auth.users(id) on delete cascade,
  status       text not null default 'lobby'
                 check (status in ('lobby','active','paused','ended')),
  title        text,
  setup_mode   text,                 -- pc-tv | pc-tel | tel-tel | mj-seul (sélecteur existant)
  started_at   timestamptz,
  ended_at     timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists game_sessions_scenario_idx on public.game_sessions(scenario_id);
create index if not exists game_sessions_mj_idx on public.game_sessions(mj_user_id);

-- Une seule session « vivante » (non terminée) par scénario à la fois.
create unique index if not exists game_sessions_one_live_per_scenario
  on public.game_sessions(scenario_id)
  where status <> 'ended';

drop trigger if exists trg_game_sessions_touch on public.game_sessions;
create trigger trg_game_sessions_touch
  before update on public.game_sessions
  for each row execute function public.mode_session_touch_updated_at();


-- ----------------------------------------------------------------------------
-- 1.2 session_state (1-1 avec game_sessions) — état partagé temps réel
-- ----------------------------------------------------------------------------

create table if not exists public.session_state (
  session_id          uuid primary key references public.game_sessions(id) on delete cascade,
  current_chapter_id  uuid,          -- pas de FK dure (chapitres gérés hors de ce périmètre)
  current_location_id uuid,
  broadcast_image_url text,
  broadcast_text      text,
  ambient_sound       jsonb,         -- { piste, volume, en_lecture }
  active_combat_id    uuid references public.combats(id) on delete set null,
  updated_at          timestamptz not null default now()
);

drop trigger if exists trg_session_state_touch on public.session_state;
create trigger trg_session_state_touch
  before update on public.session_state
  for each row execute function public.mode_session_touch_updated_at();


-- ----------------------------------------------------------------------------
-- 1.3 session_participants
-- ----------------------------------------------------------------------------

create table if not exists public.session_participants (
  session_id   uuid not null references public.game_sessions(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  character_id uuid references public.personnages(id) on delete set null,
  role         text not null default 'joueur' check (role in ('mj','joueur')),
  is_ready     boolean not null default false,
  is_connected boolean not null default true,
  joined_at    timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (session_id, user_id)
);

create index if not exists session_participants_user_idx on public.session_participants(user_id);
create index if not exists session_participants_character_idx on public.session_participants(character_id);


-- ----------------------------------------------------------------------------
-- 1.4 character_live_state — état vivant du personnage EN séance
-- ----------------------------------------------------------------------------
-- Superpose l'état de séance par-dessus la fiche `personnages`. Hydraté depuis
-- la fiche à l'entrée en session (RPC join_session). Source de vérité temps réel
-- MJ ↔ PJ pendant la partie. Comble les manques de la fiche (ressources de classe,
-- concentration) + ajoute auteur/horodatage de modification.

create table if not exists public.character_live_state (
  session_id           uuid not null references public.game_sessions(id) on delete cascade,
  character_id         uuid not null references public.personnages(id) on delete cascade,
  current_hp           int,
  temp_hp              int not null default 0,
  max_hp_override      int,
  spell_slots_used     jsonb not null default '{}'::jsonb,
  class_resources_used jsonb not null default '{}'::jsonb,
  conditions           jsonb not null default '[]'::jsonb,
  concentration_spell  text,
  death_saves          jsonb not null default '{"success":0,"fail":0}'::jsonb,
  updated_at           timestamptz not null default now(),
  updated_by           uuid references auth.users(id) on delete set null,
  primary key (session_id, character_id)
);

create index if not exists character_live_state_session_idx on public.character_live_state(session_id);

drop trigger if exists trg_character_live_state_touch on public.character_live_state;
create trigger trg_character_live_state_touch
  before update on public.character_live_state
  for each row execute function public.mode_session_touch_updated_at();


-- ----------------------------------------------------------------------------
-- 1.5 session_events — journal de session
-- ----------------------------------------------------------------------------

create table if not exists public.session_events (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references public.game_sessions(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  character_id  uuid references public.personnages(id) on delete set null,
  type          text not null
                  check (type in ('hp_change','resource_used','dice_roll','condition',
                                  'join','leave','combat_start','combat_end','narration')),
  payload       jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists session_events_session_idx
  on public.session_events(session_id, created_at desc);


-- ----------------------------------------------------------------------------
-- 1.6 notifications — DÉJÀ EXISTANT (20260515060000 + 20260519130000)
-- ----------------------------------------------------------------------------
-- La table public.notifications, sa RLS et son Realtime existent déjà.
-- Rien à créer ici (cf. docs/audit-mode-session.md §5). L'émission de la notif
-- « session lancée » est ajoutée en Phase 2.


-- ============================================================================
-- 1.7 SÉCURITÉ (RLS)
-- ============================================================================

-- Helpers SECURITY DEFINER propres à la session (zéro récursion). ---------------

-- L'utilisateur courant est le MJ de la session.
create or replace function public.fn_is_session_mj(p_session_id uuid)
returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1 from public.game_sessions gs
    where gs.id = p_session_id and gs.mj_user_id = auth.uid()
  );
$$;

-- L'utilisateur courant est MJ de la session OU membre (joueur inscrit) du scénario.
create or replace function public.fn_is_session_member(p_session_id uuid)
returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1 from public.game_sessions gs
    where gs.id = p_session_id
      and (gs.mj_user_id = auth.uid()
           or public.fn_has_joined_scenario(gs.scenario_id))
  );
$$;

grant execute on function public.fn_is_session_mj(uuid) to authenticated;
grant execute on function public.fn_is_session_member(uuid) to authenticated;


-- Activation RLS -------------------------------------------------------------
alter table public.game_sessions        enable row level security;
alter table public.session_state         enable row level security;
alter table public.session_participants  enable row level security;
alter table public.character_live_state  enable row level security;
alter table public.session_events        enable row level security;


-- game_sessions --------------------------------------------------------------
drop policy if exists game_sessions_select on public.game_sessions;
create policy game_sessions_select on public.game_sessions
  for select to authenticated
  using (mj_user_id = auth.uid() or public.fn_is_scenario_member(scenario_id));

drop policy if exists game_sessions_insert on public.game_sessions;
create policy game_sessions_insert on public.game_sessions
  for insert to authenticated
  with check (mj_user_id = auth.uid() and public.fn_is_scenario_mj(scenario_id));

drop policy if exists game_sessions_update on public.game_sessions;
create policy game_sessions_update on public.game_sessions
  for update to authenticated
  using (mj_user_id = auth.uid())
  with check (mj_user_id = auth.uid());

drop policy if exists game_sessions_delete on public.game_sessions;
create policy game_sessions_delete on public.game_sessions
  for delete to authenticated
  using (mj_user_id = auth.uid());


-- session_state --------------------------------------------------------------
drop policy if exists session_state_select on public.session_state;
create policy session_state_select on public.session_state
  for select to authenticated
  using (public.fn_is_session_member(session_id));

drop policy if exists session_state_write on public.session_state;
create policy session_state_write on public.session_state
  for all to authenticated
  using (public.fn_is_session_mj(session_id))
  with check (public.fn_is_session_mj(session_id));


-- session_participants -------------------------------------------------------
drop policy if exists session_participants_select on public.session_participants;
create policy session_participants_select on public.session_participants
  for select to authenticated
  using (public.fn_is_session_member(session_id));

drop policy if exists session_participants_insert on public.session_participants;
create policy session_participants_insert on public.session_participants
  for insert to authenticated
  with check (
    public.fn_is_session_mj(session_id)
    or (user_id = auth.uid() and public.fn_is_session_member(session_id))
  );

drop policy if exists session_participants_update on public.session_participants;
create policy session_participants_update on public.session_participants
  for update to authenticated
  using (user_id = auth.uid() or public.fn_is_session_mj(session_id))
  with check (user_id = auth.uid() or public.fn_is_session_mj(session_id));

drop policy if exists session_participants_delete on public.session_participants;
create policy session_participants_delete on public.session_participants
  for delete to authenticated
  using (user_id = auth.uid() or public.fn_is_session_mj(session_id));


-- character_live_state -------------------------------------------------------
-- Lecture : tout membre de la session (le MJ voit les PV exacts ; côté PJ, le
-- masquage qualitatif des AUTRES est géré à l'affichage). Écriture : le MJ pour
-- n'importe quel perso, le joueur pour SON perso uniquement.
drop policy if exists character_live_state_select on public.character_live_state;
create policy character_live_state_select on public.character_live_state
  for select to authenticated
  using (public.fn_is_session_member(session_id));

drop policy if exists character_live_state_insert on public.character_live_state;
create policy character_live_state_insert on public.character_live_state
  for insert to authenticated
  with check (
    public.fn_is_session_mj(session_id)
    or public.fn_owns_personnage(character_id)
  );

drop policy if exists character_live_state_update on public.character_live_state;
create policy character_live_state_update on public.character_live_state
  for update to authenticated
  using (
    public.fn_is_session_mj(session_id)
    or public.fn_owns_personnage(character_id)
  )
  with check (
    public.fn_is_session_mj(session_id)
    or public.fn_owns_personnage(character_id)
  );

drop policy if exists character_live_state_delete on public.character_live_state;
create policy character_live_state_delete on public.character_live_state
  for delete to authenticated
  using (public.fn_is_session_mj(session_id));


-- session_events -------------------------------------------------------------
drop policy if exists session_events_select on public.session_events;
create policy session_events_select on public.session_events
  for select to authenticated
  using (public.fn_is_session_member(session_id));

drop policy if exists session_events_insert on public.session_events;
create policy session_events_insert on public.session_events
  for insert to authenticated
  with check (public.fn_is_session_member(session_id));

drop policy if exists session_events_delete on public.session_events;
create policy session_events_delete on public.session_events
  for delete to authenticated
  using (public.fn_is_session_mj(session_id));


-- ============================================================================
-- 1.7 RPC atomique join_session
-- ============================================================================
-- Vérifie que l'utilisateur est lié au scénario, crée/réactive la ligne
-- session_participants, initialise l'état vivant du personnage (hydraté depuis
-- la fiche), écrit un session_event 'join'. Le tout dans une transaction.

create or replace function public.join_session(
  p_session_id   uuid,
  p_character_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid         uuid := auth.uid();
  v_scenario_id uuid;
  v_status      text;
  v_mj          uuid;
  v_role        text;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select scenario_id, status, mj_user_id
    into v_scenario_id, v_status, v_mj
  from public.game_sessions
  where id = p_session_id;

  if v_scenario_id is null then
    return jsonb_build_object('ok', false, 'error', 'session_not_found');
  end if;

  if v_status = 'ended' then
    return jsonb_build_object('ok', false, 'error', 'session_ended');
  end if;

  v_role := case when v_mj = v_uid then 'mj' else 'joueur' end;

  -- L'utilisateur doit être lié au scénario (MJ ou joueur inscrit).
  if v_role <> 'mj' and not public.fn_has_joined_scenario(v_scenario_id) then
    return jsonb_build_object('ok', false, 'error', 'not_member');
  end if;

  -- Le personnage éventuel doit appartenir à l'utilisateur.
  if p_character_id is not null then
    if not exists (
      select 1 from public.personnages
      where id = p_character_id and joueur_id = v_uid
    ) then
      return jsonb_build_object('ok', false, 'error', 'not_owner');
    end if;
  end if;

  -- Participant : upsert (réactive la connexion à la reconnexion).
  insert into public.session_participants
    (session_id, user_id, character_id, role, is_connected, last_seen_at)
  values
    (p_session_id, v_uid, p_character_id, v_role, true, now())
  on conflict (session_id, user_id) do update
    set character_id = coalesce(excluded.character_id, session_participants.character_id),
        is_connected = true,
        last_seen_at = now();

  -- État vivant : initialisé depuis la fiche s'il n'existe pas encore.
  if p_character_id is not null then
    insert into public.character_live_state
      (session_id, character_id, current_hp, temp_hp, spell_slots_used,
       conditions, death_saves, updated_by)
    select
      p_session_id,
      p.id,
      p.hp_actuel,
      coalesce(p.temp_hp, 0),
      coalesce(p.sorts_slots_used, '{}'::jsonb),
      coalesce(p.conditions, '[]'::jsonb),
      jsonb_build_object('success', coalesce(p.death_success, 0),
                         'fail',    coalesce(p.death_fail, 0)),
      v_uid
    from public.personnages p
    where p.id = p_character_id
    on conflict (session_id, character_id) do nothing;
  end if;

  -- Journal.
  insert into public.session_events (session_id, actor_user_id, character_id, type, payload)
  values (p_session_id, v_uid, p_character_id, 'join',
          jsonb_build_object('role', v_role));

  return jsonb_build_object('ok', true, 'session_id', p_session_id, 'role', v_role);
end;
$$;

grant execute on function public.join_session(uuid, uuid) to authenticated;


-- ============================================================================
-- REALTIME — cœur de la synchro MJ ↔ PJ
-- ============================================================================
-- replica identity full : indispensable pour que les payloads UPDATE/DELETE
-- portent les colonnes de filtre (session_id) côté client.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'game_sessions'
  ) then
    alter publication supabase_realtime add table public.game_sessions;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'session_state'
  ) then
    alter publication supabase_realtime add table public.session_state;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'session_participants'
  ) then
    alter publication supabase_realtime add table public.session_participants;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'character_live_state'
  ) then
    alter publication supabase_realtime add table public.character_live_state;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'session_events'
  ) then
    alter publication supabase_realtime add table public.session_events;
  end if;
end $$;

alter table public.game_sessions        replica identity full;
alter table public.session_state         replica identity full;
alter table public.session_participants  replica identity full;
alter table public.character_live_state  replica identity full;
alter table public.session_events        replica identity full;
