-- ============================================================================
-- Corrections V1 Vague 2 — 1.1 : flux d'invitation joueur simplifié
-- ----------------------------------------------------------------------------
-- Deux fonctions SECURITY DEFINER (contournent la RLS de manière contrôlée,
-- cf. règle anti-récursion : pas d'EXISTS croisé inline dans les policies) :
--
--   • infos_scenario_via_code(code) : renvoie le nom du scénario ciblé par un
--     code d'invitation, même à un joueur pas encore inscrit (la policy
--     scenarios_select_mj interdit sinon la lecture). Le code EST le secret.
--
--   • rejoindre_scenario_via_code(code, personnage_id?) : inscrit le joueur
--     courant (auth.uid) dans scenarios_joueurs ET, si fourni, lie l'un de SES
--     personnages au scénario, atomiquement. Le code d'invitation de scénario
--     reste RÉUTILISABLE (un même lien sert à inviter plusieurs joueurs).
-- ============================================================================

create or replace function public.infos_scenario_via_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invit    record;
  v_scenario record;
begin
  select * into v_invit
  from codes_invitation
  where code = upper(trim(p_code))
  limit 1;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'code_not_found');
  end if;
  if v_invit.scenario_id is null then
    return jsonb_build_object('ok', false, 'error', 'code_not_scenario');
  end if;

  select id, nom into v_scenario from scenarios where id = v_invit.scenario_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'scenario_not_found');
  end if;

  return jsonb_build_object(
    'ok', true,
    'scenario_id', v_scenario.id,
    'scenario_nom', v_scenario.nom
  );
end;
$$;

create or replace function public.rejoindre_scenario_via_code(
  p_code text,
  p_personnage_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_invit record;
  v_perso record;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select * into v_invit
  from codes_invitation
  where code = upper(trim(p_code))
  limit 1;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'code_not_found');
  end if;
  if v_invit.scenario_id is null then
    return jsonb_build_object('ok', false, 'error', 'code_not_scenario');
  end if;

  -- Inscription du joueur (idempotente).
  insert into scenarios_joueurs (scenario_id, joueur_id)
  values (v_invit.scenario_id, v_uid)
  on conflict do nothing;

  -- Liaison optionnelle d'un personnage appartenant au joueur.
  if p_personnage_id is not null then
    select id, joueur_id into v_perso from personnages where id = p_personnage_id;
    if not found then
      return jsonb_build_object('ok', false, 'error', 'personnage_not_found');
    end if;
    if v_perso.joueur_id <> v_uid then
      return jsonb_build_object('ok', false, 'error', 'not_owner');
    end if;
    update personnages
    set scenario_id = v_invit.scenario_id
    where id = p_personnage_id;
  end if;

  -- NB : on ne marque PAS le code utilisé → lien d'invitation réutilisable.
  return jsonb_build_object(
    'ok', true,
    'scenario_id', v_invit.scenario_id
  );
end;
$$;

-- Liste des joueurs inscrits à un scénario + leurs personnages liés, réservée
-- au MJ du scénario (la policy scenarios_joueurs_select limite chaque joueur à
-- ses propres lignes → le MJ ne pourrait pas voir la liste sans cette RPC).
create or replace function public.joueurs_du_scenario(p_scenario_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_mj     uuid;
  v_result jsonb;
begin
  select mj_id into v_mj from scenarios where id = p_scenario_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'scenario_not_found');
  end if;
  if v_mj <> v_uid then
    return jsonb_build_object('ok', false, 'error', 'not_mj');
  end if;

  select coalesce(jsonb_agg(j), '[]'::jsonb) into v_result
  from (
    select
      sj.joueur_id,
      coalesce(pr.username, 'Joueur') as username,
      coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', pe.id, 'nom', pe.nom, 'classe', pe.classe, 'niveau', pe.niveau
        ))
        from personnages pe
        where pe.scenario_id = p_scenario_id and pe.joueur_id = sj.joueur_id
      ), '[]'::jsonb) as personnages
    from scenarios_joueurs sj
    left join profiles pr on pr.id = sj.joueur_id
    where sj.scenario_id = p_scenario_id
    order by pr.username
  ) j;

  return jsonb_build_object('ok', true, 'joueurs', v_result);
end;
$$;

revoke all on function public.infos_scenario_via_code(text) from public;
revoke all on function public.rejoindre_scenario_via_code(text, uuid) from public;
revoke all on function public.joueurs_du_scenario(uuid) from public;
grant execute on function public.infos_scenario_via_code(text) to anon, authenticated;
grant execute on function public.rejoindre_scenario_via_code(text, uuid) to authenticated;
grant execute on function public.joueurs_du_scenario(uuid) to authenticated;
