-- ============================================================================
-- PHASE 1.1 — Permissions scénario rejoint (durcissement RLS)
-- ============================================================================
-- Objectif : les joueurs ayant rejoint un scénario ne doivent PAS voir :
--   - chapitres, scenario_liens, quetes (contenu narratif)
--   - notes_secretes des scénarios (déjà filtré côté client ; en plus on
--     restreint l'accès aux tables liées MJ-only)
--   - mindmap (déjà MJ-only)
--   - ennemis / pnj liés au scénario
-- Ils peuvent uniquement voir le titre / description publique du scénario,
-- et la liste des autres PJ inscrits. Ils ne peuvent modifier que leur propre
-- personnage (déjà géré par fn_owns_personnage).
-- ============================================================================

-- 1. Restreindre la lecture des chapitres au MJ uniquement ------------------
drop policy if exists "chapitres_select" on public.chapitres;
create policy "chapitres_select" on public.chapitres
  for select to authenticated
  using (public.fn_is_scenario_mj(scenario_id));

-- 2. Restreindre la lecture des liens et quêtes au MJ -----------------------
drop policy if exists "scenario_liens_select" on public.scenario_liens;
create policy "scenario_liens_select" on public.scenario_liens
  for select to authenticated
  using (public.fn_is_scenario_mj(scenario_id));

drop policy if exists "quetes_select" on public.quetes;
create policy "quetes_select" on public.quetes
  for select to authenticated
  using (public.fn_is_scenario_mj(scenario_id));

-- 3. Ennemis : seulement le MJ (ou si public) -------------------------------
drop policy if exists "ennemis_select" on public.ennemis;
create policy "ennemis_select" on public.ennemis
  for select to authenticated
  using (mj_id = auth.uid() or public = true);

-- 4. PNJ : seulement le MJ (ou si public) -----------------------------------
drop policy if exists "pnj_select" on public.pnj;
create policy "pnj_select" on public.pnj
  for select to authenticated
  using (mj_id = auth.uid() or public = true);

-- ============================================================================
-- NOTE : `scenarios.notes_secretes` reste sélectionnable par les joueurs
-- inscrits via la policy `scenarios_select`. Le filtrage est fait côté client
-- (on n'inclut `notes_secretes` dans le SELECT que si l'utilisateur est MJ).
-- Pour un blocage RLS strict il faudrait splitter la table — coût trop élevé.
-- ============================================================================
