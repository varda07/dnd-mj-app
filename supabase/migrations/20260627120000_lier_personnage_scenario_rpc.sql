-- ============================================================================
-- ROADMAP CORRECTIONS V1 — 1.2 : lier un personnage à un scénario via code
-- ============================================================================
-- Bug : quand le MJ saisit le code d'invitation d'un joueur, l'app faisait
--   UPDATE personnages SET scenario_id = X WHERE id = <perso du joueur>
-- mais la RLS `personnages_update` n'autorise le MJ que via
--   fn_is_mj_of_player(joueur_id) → vérifie scenarios_joueurs.
-- Or le joueur n'a PAS encore rejoint le scénario à ce stade (œuf / poule) :
-- 0 ligne mise à jour, échec silencieux. Et le MJ ne peut pas non plus
-- insérer dans scenarios_joueurs (policy : joueur_id = auth.uid()).
--
-- Solution : une RPC SECURITY DEFINER qui, avec contrôle d'autorisation
-- explicite (le MJ doit posséder le scénario), réalise atomiquement :
--   1. lie le personnage au scénario
--   2. inscrit le joueur dans scenarios_joueurs
--   3. marque le code comme utilisé
-- Conforme à la règle RLS du projet : EXISTS croisé interdit *inline*,
-- autorisé via fonctions SECURITY DEFINER.
-- ============================================================================

create or replace function public.lier_personnage_via_code(
  p_code text,
  p_scenario_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invit       record;
  v_personnage  record;
  v_scenario    record;
begin
  -- 1. Le scénario cible doit appartenir au MJ courant.
  select id, mj_id into v_scenario
  from public.scenarios
  where id = p_scenario_id;

  if v_scenario.id is null then
    return jsonb_build_object('ok', false, 'error', 'scenario_not_found');
  end if;
  if v_scenario.mj_id <> auth.uid() then
    return jsonb_build_object('ok', false, 'error', 'not_mj');
  end if;

  -- 2. Code d'invitation valide, non utilisé, rattaché à un personnage.
  select id, personnage_id, utilise into v_invit
  from public.codes_invitation
  where upper(code) = upper(trim(p_code))
  order by created_at desc
  limit 1;

  if v_invit.id is null then
    return jsonb_build_object('ok', false, 'error', 'code_not_found');
  end if;
  if v_invit.utilise then
    return jsonb_build_object('ok', false, 'error', 'code_already_used');
  end if;
  if v_invit.personnage_id is null then
    return jsonb_build_object('ok', false, 'error', 'code_not_player');
  end if;

  -- 3. Récupère le personnage + son joueur.
  select id, joueur_id, nom into v_personnage
  from public.personnages
  where id = v_invit.personnage_id;

  if v_personnage.id is null then
    return jsonb_build_object('ok', false, 'error', 'personnage_not_found');
  end if;

  -- 4. Lie le personnage au scénario.
  update public.personnages
  set scenario_id = p_scenario_id
  where id = v_personnage.id;

  -- 5. Inscrit le joueur dans le scénario (idempotent).
  insert into public.scenarios_joueurs (scenario_id, joueur_id)
  values (p_scenario_id, v_personnage.joueur_id)
  on conflict (scenario_id, joueur_id) do nothing;

  -- 6. Marque le code comme utilisé.
  update public.codes_invitation
  set utilise = true
  where id = v_invit.id;

  return jsonb_build_object(
    'ok', true,
    'personnage_id', v_personnage.id,
    'personnage_nom', v_personnage.nom,
    'joueur_id', v_personnage.joueur_id
  );
end;
$$;

grant execute on function public.lier_personnage_via_code(text, uuid) to authenticated;
