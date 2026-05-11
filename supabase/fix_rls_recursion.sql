-- ============================================================================
-- FIX URGENT : récursion infinie dans les policies RLS
-- ============================================================================
-- Symptômes : erreurs 500 + messages
--   "infinite recursion detected in policy for relation scenarios"
--   "infinite recursion detected in policy for relation scenarios_joueurs"
--
-- Cause : la policy `scenarios_select` faisait un EXISTS sur scenarios_joueurs,
-- et `scenarios_joueurs_select_own` faisait un EXISTS sur scenarios → cycle.
--
-- Correctif : on casse le cycle. Les policies de scenarios_joueurs ne
-- référencent plus scenarios, et la policy SELECT de scenarios n'utilise plus
-- scenarios_joueurs (mj_id direct + flag `public` de la bibliothèque).
-- À exécuter dans le SQL Editor de Supabase.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. DROP des policies fautives (idempotent)
-- ----------------------------------------------------------------------------

drop policy if exists "scenarios_select" on public.scenarios;
drop policy if exists "scenarios_insert" on public.scenarios;
drop policy if exists "scenarios_update" on public.scenarios;
drop policy if exists "scenarios_delete" on public.scenarios;

drop policy if exists "scenarios_joueurs_select" on public.scenarios_joueurs;
drop policy if exists "scenarios_joueurs_insert" on public.scenarios_joueurs;
drop policy if exists "scenarios_joueurs_update" on public.scenarios_joueurs;
drop policy if exists "scenarios_joueurs_delete" on public.scenarios_joueurs;

-- Variantes nommées dans setup.sql (au cas où l'ancienne version est encore en place)
drop policy if exists "scenarios_joueurs_select_own" on public.scenarios_joueurs;
drop policy if exists "scenarios_joueurs_insert_self" on public.scenarios_joueurs;
drop policy if exists "scenarios_joueurs_delete_self" on public.scenarios_joueurs;


-- ----------------------------------------------------------------------------
-- 2. SCENARIOS : policies simples sans récursion
-- ----------------------------------------------------------------------------
-- Le MJ a tous les droits sur ses scénarios. Les scénarios publics (bibliothèque
-- communautaire) sont visibles par tous. Pas de jointure sur scenarios_joueurs.

create policy "scenarios_select_mj" on public.scenarios
  for select using (mj_id = auth.uid() or public = true);

create policy "scenarios_insert" on public.scenarios
  for insert with check (mj_id = auth.uid());

create policy "scenarios_update" on public.scenarios
  for update using (mj_id = auth.uid());

create policy "scenarios_delete" on public.scenarios
  for delete using (mj_id = auth.uid());


-- ----------------------------------------------------------------------------
-- 3. SCENARIOS_JOUEURS : policies simples sans jointure sur scenarios
-- ----------------------------------------------------------------------------
-- Chaque joueur voit/insère/supprime uniquement ses propres liens.

create policy "scenarios_joueurs_select" on public.scenarios_joueurs
  for select using (joueur_id = auth.uid());

create policy "scenarios_joueurs_insert" on public.scenarios_joueurs
  for insert with check (joueur_id = auth.uid());

create policy "scenarios_joueurs_delete" on public.scenarios_joueurs
  for delete using (joueur_id = auth.uid());


-- ============================================================================
-- Vérification : les deux tables doivent maintenant répondre sans erreur 500.
-- ============================================================================
