-- ============================================================================
-- MODE SESSION — Phase 2 : lancement, notification, lobby
-- ============================================================================
-- RPC de lancement d'une session (MJ), transitions de statut, et notification
-- in-app automatique à chaque joueur lié au scénario. Réutilise la table
-- `notifications` + le composant NotificationCenter existants (cf. audit §5).
--
-- 100 % idempotent. Aucune modification des tables existantes.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- start_session(scenario_id, title, setup_mode)
-- ----------------------------------------------------------------------------
-- Crée une session en statut 'lobby' + son session_state, inscrit le MJ comme
-- participant, et notifie tous les joueurs du scénario. Idempotent : s'il existe
-- déjà une session vivante pour ce scénario, la renvoie sans en recréer.

create or replace function public.start_session(
  p_scenario_id uuid,
  p_title       text default null,
  p_setup_mode  text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid          uuid := auth.uid();
  v_session_id   uuid;
  v_scenario_nom text;
  v_notified     int := 0;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if not public.fn_is_scenario_mj(p_scenario_id) then
    return jsonb_build_object('ok', false, 'error', 'not_mj');
  end if;

  -- Session vivante déjà en cours ? → on la renvoie (pas de doublon).
  select id into v_session_id
  from public.game_sessions
  where scenario_id = p_scenario_id and status <> 'ended'
  limit 1;

  if v_session_id is not null then
    -- Met à jour le setup si fourni (rebranchement du sélecteur existant).
    if p_setup_mode is not null then
      update public.game_sessions
        set setup_mode = p_setup_mode
        where id = v_session_id;
    end if;
    return jsonb_build_object('ok', true, 'session_id', v_session_id, 'already', true);
  end if;

  select nom into v_scenario_nom from public.scenarios where id = p_scenario_id;

  insert into public.game_sessions (scenario_id, mj_user_id, status, title, setup_mode)
  values (p_scenario_id, v_uid, 'lobby',
          coalesce(nullif(trim(p_title), ''), 'Session — ' || coalesce(v_scenario_nom, 'Scénario')),
          p_setup_mode)
  returning id into v_session_id;

  insert into public.session_state (session_id) values (v_session_id)
  on conflict (session_id) do nothing;

  -- Le MJ est participant.
  insert into public.session_participants (session_id, user_id, role, is_connected)
  values (v_session_id, v_uid, 'mj', true)
  on conflict (session_id, user_id) do nothing;

  -- Notification in-app à chaque joueur lié au scénario (hors MJ).
  insert into public.notifications (user_id, type, message, lien)
  select sj.joueur_id,
         'session',
         '🎲 Une session vient d''être lancée : ' || coalesce(v_scenario_nom, 'votre scénario'),
         '/session/' || v_session_id::text || '/joueur'
  from public.scenarios_joueurs sj
  where sj.scenario_id = p_scenario_id
    and sj.joueur_id <> v_uid;
  get diagnostics v_notified = row_count;

  return jsonb_build_object(
    'ok', true,
    'session_id', v_session_id,
    'already', false,
    'notified', v_notified
  );
end;
$$;

grant execute on function public.start_session(uuid, text, text) to authenticated;


-- ----------------------------------------------------------------------------
-- set_session_status(session_id, status)
-- ----------------------------------------------------------------------------
-- Transitions MJ : lobby → active → paused → ended. Gère started_at/ended_at,
-- déconnecte les participants à la fin, et journalise.

create or replace function public.set_session_status(
  p_session_id uuid,
  p_status     text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  if not public.fn_is_session_mj(p_session_id) then
    return jsonb_build_object('ok', false, 'error', 'not_mj');
  end if;
  if p_status not in ('lobby','active','paused','ended') then
    return jsonb_build_object('ok', false, 'error', 'bad_status');
  end if;

  update public.game_sessions
    set status     = p_status,
        started_at = case when p_status = 'active' and started_at is null
                          then now() else started_at end,
        ended_at   = case when p_status = 'ended' then now() else ended_at end
    where id = p_session_id;

  if p_status = 'ended' then
    update public.session_participants
      set is_connected = false
      where session_id = p_session_id;
  end if;

  insert into public.session_events (session_id, actor_user_id, type, payload)
  values (p_session_id, v_uid, 'narration',
          jsonb_build_object('status', p_status));

  return jsonb_build_object('ok', true, 'status', p_status);
end;
$$;

grant execute on function public.set_session_status(uuid, text) to authenticated;


-- ----------------------------------------------------------------------------
-- session_a_rejoindre() — bandeau d'accueil : sessions vivantes que l'utilisateur
-- peut rejoindre mais n'a pas encore rejointes (ou reprise si active).
-- ----------------------------------------------------------------------------

create or replace function public.sessions_a_rejoindre()
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb)
  from (
    select gs.id            as session_id,
           gs.scenario_id,
           gs.title,
           gs.status,
           s.nom            as scenario_nom,
           coalesce(prof.username, 'MJ') as mj_nom,
           (sp.user_id is not null) as deja_rejoint
    from public.game_sessions gs
    join public.scenarios s on s.id = gs.scenario_id
    left join public.profiles prof on prof.id = gs.mj_user_id
    left join public.session_participants sp
           on sp.session_id = gs.id and sp.user_id = auth.uid()
    where gs.status <> 'ended'
      and gs.mj_user_id <> auth.uid()
      and public.fn_has_joined_scenario(gs.scenario_id)
    order by gs.created_at desc
  ) t;
$$;

grant execute on function public.sessions_a_rejoindre() to authenticated;
