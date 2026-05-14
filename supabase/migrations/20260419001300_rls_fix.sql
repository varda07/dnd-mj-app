-- ============================================================================
-- RLS FIX : policies corrigées pour scenarios, personnages, ennemis, items, sorts
-- ============================================================================
-- À exécuter APRÈS rls.sql pour remplacer les policies SELECT combinées par
-- des policies atomiques.
--
-- Problème dans rls.sql : les policies SELECT contenaient `owner OR MJ-via-X`
-- dans une seule policy avec sous-requête. Si la sous-requête échouait
-- (scenarios_joueurs absent, RLS sur une dépendance, etc.), toute la policy
-- renvoyait false — même la branche `auth.uid() = mj_id` pourtant simple.
--
-- Correction : on SPLIT en 2 policies SELECT par table — Postgres les combine
-- en OR (PERMISSIVE par défaut). Si la 2e échoue, la 1re (owner simple) reste
-- évaluée indépendamment.
--
-- Idempotent : drop policy if exists / create policy.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. NETTOYAGE des policies existantes (anciennes et nouvelles)
-- ----------------------------------------------------------------------------

drop policy if exists "scenarios_select" on public.scenarios;
drop policy if exists "scenarios_select_owner" on public.scenarios;
drop policy if exists "scenarios_select_joueur" on public.scenarios;
drop policy if exists "scenarios_insert" on public.scenarios;
drop policy if exists "scenarios_update" on public.scenarios;
drop policy if exists "scenarios_delete" on public.scenarios;

drop policy if exists "personnages_select" on public.personnages;
drop policy if exists "personnages_select_owner" on public.personnages;
drop policy if exists "personnages_select_mj" on public.personnages;
drop policy if exists "personnages_insert" on public.personnages;
drop policy if exists "personnages_update" on public.personnages;
drop policy if exists "personnages_update_owner" on public.personnages;
drop policy if exists "personnages_update_mj" on public.personnages;
drop policy if exists "personnages_delete" on public.personnages;

drop policy if exists "ennemis_select" on public.ennemis;
drop policy if exists "ennemis_insert" on public.ennemis;
drop policy if exists "ennemis_update" on public.ennemis;
drop policy if exists "ennemis_delete" on public.ennemis;

drop policy if exists "items_select" on public.items;
drop policy if exists "items_insert" on public.items;
drop policy if exists "items_update" on public.items;
drop policy if exists "items_delete" on public.items;

drop policy if exists "sorts_select" on public.sorts;
drop policy if exists "sorts_select_owner" on public.sorts;
drop policy if exists "sorts_select_mj" on public.sorts;
drop policy if exists "sorts_insert" on public.sorts;
drop policy if exists "sorts_update" on public.sorts;
drop policy if exists "sorts_delete" on public.sorts;


-- ----------------------------------------------------------------------------
-- 2. SCENARIOS
-- ----------------------------------------------------------------------------
-- SELECT split : owner pur + joueur-ayant-rejoint (combinés en OR par Postgres)

create policy "scenarios_select_owner" on public.scenarios
  for select to authenticated
  using (auth.uid() = mj_id);

create policy "scenarios_select_joueur" on public.scenarios
  for select to authenticated
  using (
    exists (
      select 1 from public.scenarios_joueurs sj
      where sj.scenario_id = scenarios.id and sj.joueur_id = auth.uid()
    )
  );

create policy "scenarios_insert" on public.scenarios
  for insert to authenticated
  with check (auth.uid() = mj_id);

create policy "scenarios_update" on public.scenarios
  for update to authenticated
  using (auth.uid() = mj_id);

create policy "scenarios_delete" on public.scenarios
  for delete to authenticated
  using (auth.uid() = mj_id);


-- ----------------------------------------------------------------------------
-- 3. PERSONNAGES
-- ----------------------------------------------------------------------------
-- SELECT split : propriétaire joueur + MJ-qui-a-invité-via-scenarios_joueurs
-- UPDATE split pareil : propriétaire + MJ du scénario lié (pour HP en combat)

create policy "personnages_select_owner" on public.personnages
  for select to authenticated
  using (auth.uid() = joueur_id);

create policy "personnages_select_mj" on public.personnages
  for select to authenticated
  using (
    exists (
      select 1 from public.scenarios_joueurs sj
      join public.scenarios s on s.id = sj.scenario_id
      where sj.joueur_id = personnages.joueur_id and s.mj_id = auth.uid()
    )
  );

create policy "personnages_insert" on public.personnages
  for insert to authenticated
  with check (auth.uid() = joueur_id);

create policy "personnages_update_owner" on public.personnages
  for update to authenticated
  using (auth.uid() = joueur_id);

create policy "personnages_update_mj" on public.personnages
  for update to authenticated
  using (
    exists (
      select 1 from public.scenarios s
      where s.id = personnages.scenario_id and s.mj_id = auth.uid()
    )
  );

create policy "personnages_delete" on public.personnages
  for delete to authenticated
  using (auth.uid() = joueur_id);


-- ----------------------------------------------------------------------------
-- 4. ENNEMIS (MJ only, pas de split nécessaire)
-- ----------------------------------------------------------------------------

create policy "ennemis_select" on public.ennemis
  for select to authenticated
  using (auth.uid() = mj_id);

create policy "ennemis_insert" on public.ennemis
  for insert to authenticated
  with check (auth.uid() = mj_id);

create policy "ennemis_update" on public.ennemis
  for update to authenticated
  using (auth.uid() = mj_id);

create policy "ennemis_delete" on public.ennemis
  for delete to authenticated
  using (auth.uid() = mj_id);


-- ----------------------------------------------------------------------------
-- 5. ITEMS (MJ only)
-- ----------------------------------------------------------------------------

create policy "items_select" on public.items
  for select to authenticated
  using (auth.uid() = mj_id);

create policy "items_insert" on public.items
  for insert to authenticated
  with check (auth.uid() = mj_id);

create policy "items_update" on public.items
  for update to authenticated
  using (auth.uid() = mj_id);

create policy "items_delete" on public.items
  for delete to authenticated
  using (auth.uid() = mj_id);


-- ----------------------------------------------------------------------------
-- 6. SORTS (rattachés à un personnage)
-- ----------------------------------------------------------------------------
-- SELECT split : owner du perso + MJ via scenarios_joueurs

create policy "sorts_select_owner" on public.sorts
  for select to authenticated
  using (
    exists (
      select 1 from public.personnages p
      where p.id = sorts.personnage_id and p.joueur_id = auth.uid()
    )
  );

create policy "sorts_select_mj" on public.sorts
  for select to authenticated
  using (
    exists (
      select 1 from public.personnages p
      join public.scenarios_joueurs sj on sj.joueur_id = p.joueur_id
      join public.scenarios s on s.id = sj.scenario_id
      where p.id = sorts.personnage_id and s.mj_id = auth.uid()
    )
  );

create policy "sorts_insert" on public.sorts
  for insert to authenticated
  with check (
    exists (
      select 1 from public.personnages p
      where p.id = sorts.personnage_id and p.joueur_id = auth.uid()
    )
  );

create policy "sorts_update" on public.sorts
  for update to authenticated
  using (
    exists (
      select 1 from public.personnages p
      where p.id = sorts.personnage_id and p.joueur_id = auth.uid()
    )
  );

create policy "sorts_delete" on public.sorts
  for delete to authenticated
  using (
    exists (
      select 1 from public.personnages p
      where p.id = sorts.personnage_id and p.joueur_id = auth.uid()
    )
  );


-- ============================================================================
-- DIAGNOSTICS (à exécuter manuellement si tu ne vois toujours rien)
-- ============================================================================
-- Copie-colle ces lignes une par une dans le SQL Editor en étant connecté au
-- compte qui devrait voir ses données :
--
-- -- Qui suis-je ?
-- select auth.uid();
--
-- -- Y a-t-il des scénarios dont je suis MJ ?
-- select id, nom, mj_id from public.scenarios where mj_id = auth.uid();
--
-- -- Si la requête précédente renvoie 0 ligne, vérifie si des scénarios
-- -- existent avec mj_id NULL (données orphelines créées avant RLS) :
-- select id, nom, mj_id from public.scenarios where mj_id is null;
--
-- -- Même vérif pour personnages :
-- select id, nom, joueur_id from public.personnages where joueur_id = auth.uid();
-- select id, nom, joueur_id from public.personnages where joueur_id is null;
--
-- Si des lignes existent avec NULL, tu dois soit :
--   a) Mettre à jour manuellement : update scenarios set mj_id = '<ton-uid>' where mj_id is null;
--   b) Les supprimer si c'est des données de test
-- ============================================================================
