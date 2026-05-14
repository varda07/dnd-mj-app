-- ============================================================================
-- SÉCURITÉ RLS COMPLÈTE — active Row Level Security sur TOUTES les tables
-- ============================================================================
-- À exécuter dans le SQL Editor de Supabase. 100 % idempotent : peut être
-- rejoué sans casser l'état existant.
--
-- Pourquoi ce fichier : Supabase signalait `rls_disabled_in_public` sur des
-- tables publiques. Ce script repart de zéro proprement :
--   1. crée des fonctions d'aide SECURITY DEFINER pour les contrôles
--      d'ownership inter-tables ;
--   2. supprime TOUTES les policies existantes des tables visées ;
--   3. (ré)active RLS sur chaque table ;
--   4. recrée un jeu cohérent de policies SELECT / INSERT / UPDATE / DELETE.
--
-- ⚠ PAS DE RÉCURSION : l'incident "infinite recursion detected in policy"
-- venait de sous-requêtes EXISTS croisées entre `scenarios` et
-- `scenarios_joueurs` directement dans les expressions de policy (chaque
-- sous-requête ré-déclenchait la RLS de l'autre table → boucle).
-- La parade ici : tous les contrôles inter-tables passent par des fonctions
-- `SECURITY DEFINER`. Une fonction SECURITY DEFINER s'exécute avec les droits
-- du créateur et N'APPLIQUE PAS la RLS sur les tables qu'elle interroge — la
-- chaîne d'évaluation des policies ne peut donc jamais boucler.
-- ============================================================================


-- ============================================================================
-- 1. FONCTIONS D'AIDE (SECURITY DEFINER — contournent la RLS, zéro récursion)
-- ============================================================================

-- L'utilisateur courant est le MJ (propriétaire) du scénario.
create or replace function public.fn_is_scenario_mj(p_scenario_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.scenarios s
    where s.id = p_scenario_id and s.mj_id = auth.uid()
  );
$$;

-- L'utilisateur courant a rejoint le scénario en tant que joueur.
create or replace function public.fn_has_joined_scenario(p_scenario_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.scenarios_joueurs sj
    where sj.scenario_id = p_scenario_id and sj.joueur_id = auth.uid()
  );
$$;

-- L'utilisateur courant est MJ OU joueur inscrit au scénario.
create or replace function public.fn_is_scenario_member(p_scenario_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.fn_is_scenario_mj(p_scenario_id)
      or public.fn_has_joined_scenario(p_scenario_id);
$$;

-- L'utilisateur courant possède le personnage (il en est le joueur).
create or replace function public.fn_owns_personnage(p_personnage_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.personnages p
    where p.id = p_personnage_id and p.joueur_id = auth.uid()
  );
$$;

-- L'utilisateur courant est MJ d'un scénario que ce joueur a rejoint
-- (permet au MJ de voir / modifier les fiches de ses joueurs, ex. HP en combat).
create or replace function public.fn_is_mj_of_player(p_joueur_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.scenarios_joueurs sj
    join public.scenarios s on s.id = sj.scenario_id
    where sj.joueur_id = p_joueur_id and s.mj_id = auth.uid()
  );
$$;

-- Idem mais à partir de l'id du personnage.
create or replace function public.fn_is_mj_of_personnage(p_personnage_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.personnages p
    join public.scenarios_joueurs sj on sj.joueur_id = p.joueur_id
    join public.scenarios s on s.id = sj.scenario_id
    where p.id = p_personnage_id and s.mj_id = auth.uid()
  );
$$;

-- L'utilisateur courant est MJ du scénario auquel appartient la carte mentale.
create or replace function public.fn_is_mindmap_mj(p_mindmap_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.mindmaps mm
    join public.scenarios s on s.id = mm.scenario_id
    where mm.id = p_mindmap_id and s.mj_id = auth.uid()
  );
$$;

-- L'utilisateur courant peut accéder au sort : propriétaire direct (user_id),
-- propriétaire du personnage porteur, ou via la junction personnage_sorts.
create or replace function public.fn_owns_sort(p_sort_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.sorts s
    where s.id = p_sort_id and s.user_id = auth.uid()
  )
  or exists (
    select 1 from public.sorts s
    join public.personnages p on p.id = s.personnage_id
    where s.id = p_sort_id and p.joueur_id = auth.uid()
  )
  or exists (
    select 1 from public.personnage_sorts ps
    join public.personnages p on p.id = ps.personnage_id
    where ps.sort_id = p_sort_id and p.joueur_id = auth.uid()
  );
$$;

grant execute on function public.fn_is_scenario_mj(uuid)        to authenticated;
grant execute on function public.fn_has_joined_scenario(uuid)   to authenticated;
grant execute on function public.fn_is_scenario_member(uuid)    to authenticated;
grant execute on function public.fn_owns_personnage(uuid)       to authenticated;
grant execute on function public.fn_is_mj_of_player(uuid)       to authenticated;
grant execute on function public.fn_is_mj_of_personnage(uuid)   to authenticated;
grant execute on function public.fn_is_mindmap_mj(uuid)         to authenticated;
grant execute on function public.fn_owns_sort(uuid)            to authenticated;


-- ============================================================================
-- 2. NETTOYAGE — supprime TOUTES les policies existantes des tables visées
-- ============================================================================
-- On repart d'une feuille blanche : peu importe les noms historiques des
-- policies (auto-générés, anciennes migrations…), elles sont toutes droppées.

do $$
declare
  r record;
  cibles text[] := array[
    'profiles', 'scenarios', 'scenarios_joueurs', 'personnages', 'personnage_sorts',
    'ennemis', 'items', 'sorts', 'maps', 'pnj', 'pnj_relations',
    'jets_de_des', 'codes_invitation', 'chapitres', 'scenario_liens', 'quetes',
    'combats', 'explorations', 'presentation_etats',
    'mindmaps', 'mindmap_noeuds', 'mindmap_liens', 'mindmap_types_custom'
  ];
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public' and tablename = any (cibles)
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;


-- ============================================================================
-- 3. ACTIVATION DE LA RLS SUR TOUTES LES TABLES
-- ============================================================================
-- `if exists` via bloc dynamique : ne casse pas si une table optionnelle
-- n'existe pas encore sur ce projet.

do $$
declare
  t text;
  cibles text[] := array[
    'profiles', 'scenarios', 'scenarios_joueurs', 'personnages', 'personnage_sorts',
    'ennemis', 'items', 'sorts', 'maps', 'pnj', 'pnj_relations',
    'jets_de_des', 'codes_invitation', 'chapitres', 'scenario_liens', 'quetes',
    'combats', 'explorations', 'presentation_etats',
    'mindmaps', 'mindmap_noeuds', 'mindmap_liens', 'mindmap_types_custom'
  ];
begin
  foreach t in array cibles loop
    if exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = t
    ) then
      execute format('alter table public.%I enable row level security', t);
      -- ⚠ SURTOUT PAS de FORCE ROW LEVEL SECURITY : les fonctions fn_*
      -- SECURITY DEFINER et la RPC incrementer_nb_copies appartiennent au
      -- propriétaire des tables. FORCE leur appliquerait la RLS, ce qui
      -- (a) réintroduit la récursion infinie que les fn_* sont censées
      -- éviter, et (b) casse la copie depuis la bibliothèque communautaire.
      -- On neutralise aussi un FORCE éventuellement hérité d'une exécution
      -- antérieure de ce script.
      execute format('alter table public.%I no force row level security', t);
    end if;
  end loop;
end $$;


-- ============================================================================
-- 4. POLICIES PAR TABLE
-- ============================================================================
-- Convention : toutes les policies ciblent le rôle `authenticated`.
-- Postgres combine les policies d'une même commande en OR (permissives).

-- ----------------------------------------------------------------------------
-- profiles — chaque utilisateur ne touche que sa propre ligne (id = auth.uid())
-- ----------------------------------------------------------------------------
create policy "profiles_select" on public.profiles
  for select to authenticated using (auth.uid() = id);
create policy "profiles_insert" on public.profiles
  for insert to authenticated with check (auth.uid() = id);
create policy "profiles_update" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles_delete" on public.profiles
  for delete to authenticated using (auth.uid() = id);

-- ----------------------------------------------------------------------------
-- scenarios — propriétaire = mj_id. Lecture aussi si public OU joueur inscrit.
-- ----------------------------------------------------------------------------
-- fn_has_joined_scenario est SECURITY DEFINER → interroge scenarios_joueurs
-- SANS RLS : aucune récursion possible avec les policies de scenarios_joueurs.
create policy "scenarios_select" on public.scenarios
  for select to authenticated
  using (
    mj_id = auth.uid()
    or public = true
    or public.fn_has_joined_scenario(id)
  );
create policy "scenarios_insert" on public.scenarios
  for insert to authenticated with check (mj_id = auth.uid());
create policy "scenarios_update" on public.scenarios
  for update to authenticated using (mj_id = auth.uid()) with check (mj_id = auth.uid());
create policy "scenarios_delete" on public.scenarios
  for delete to authenticated using (mj_id = auth.uid());

-- ----------------------------------------------------------------------------
-- scenarios_joueurs — le joueur gère sa propre inscription ; le MJ du scénario
-- peut voir / retirer ses joueurs. fn_is_scenario_mj est SECURITY DEFINER
-- (interroge `scenarios` sans RLS) → pas de récursion.
-- ----------------------------------------------------------------------------
create policy "scenarios_joueurs_select" on public.scenarios_joueurs
  for select to authenticated
  using (joueur_id = auth.uid() or public.fn_is_scenario_mj(scenario_id));
create policy "scenarios_joueurs_insert" on public.scenarios_joueurs
  for insert to authenticated with check (joueur_id = auth.uid());
create policy "scenarios_joueurs_update" on public.scenarios_joueurs
  for update to authenticated
  using (joueur_id = auth.uid() or public.fn_is_scenario_mj(scenario_id))
  with check (joueur_id = auth.uid() or public.fn_is_scenario_mj(scenario_id));
create policy "scenarios_joueurs_delete" on public.scenarios_joueurs
  for delete to authenticated
  using (joueur_id = auth.uid() or public.fn_is_scenario_mj(scenario_id));

-- ----------------------------------------------------------------------------
-- personnages — propriétaire = joueur_id. Le MJ d'un scénario rejoint par le
-- joueur peut lire et modifier (HP en combat). Lecture publique si public.
-- ----------------------------------------------------------------------------
create policy "personnages_select" on public.personnages
  for select to authenticated
  using (
    joueur_id = auth.uid()
    or public = true
    or public.fn_is_mj_of_player(joueur_id)
  );
create policy "personnages_insert" on public.personnages
  for insert to authenticated with check (joueur_id = auth.uid());
create policy "personnages_update" on public.personnages
  for update to authenticated
  using (joueur_id = auth.uid() or public.fn_is_mj_of_player(joueur_id))
  with check (joueur_id = auth.uid() or public.fn_is_mj_of_player(joueur_id));
create policy "personnages_delete" on public.personnages
  for delete to authenticated using (joueur_id = auth.uid());

-- ----------------------------------------------------------------------------
-- personnage_sorts — junction perso ↔ sort. Géré par le propriétaire du perso ;
-- le MJ du joueur peut lire.
-- ----------------------------------------------------------------------------
create policy "personnage_sorts_select" on public.personnage_sorts
  for select to authenticated
  using (
    public.fn_owns_personnage(personnage_id)
    or public.fn_is_mj_of_personnage(personnage_id)
  );
create policy "personnage_sorts_insert" on public.personnage_sorts
  for insert to authenticated with check (public.fn_owns_personnage(personnage_id));
create policy "personnage_sorts_update" on public.personnage_sorts
  for update to authenticated
  using (public.fn_owns_personnage(personnage_id))
  with check (public.fn_owns_personnage(personnage_id));
create policy "personnage_sorts_delete" on public.personnage_sorts
  for delete to authenticated using (public.fn_owns_personnage(personnage_id));

-- ----------------------------------------------------------------------------
-- ennemis — propriétaire = mj_id. Lecture publique si public (bibliothèque).
-- ----------------------------------------------------------------------------
create policy "ennemis_select" on public.ennemis
  for select to authenticated using (mj_id = auth.uid() or public = true);
create policy "ennemis_insert" on public.ennemis
  for insert to authenticated with check (mj_id = auth.uid());
create policy "ennemis_update" on public.ennemis
  for update to authenticated using (mj_id = auth.uid()) with check (mj_id = auth.uid());
create policy "ennemis_delete" on public.ennemis
  for delete to authenticated using (mj_id = auth.uid());

-- ----------------------------------------------------------------------------
-- items — propriétaire = mj_id. Lecture publique si public.
-- ----------------------------------------------------------------------------
create policy "items_select" on public.items
  for select to authenticated using (mj_id = auth.uid() or public = true);
create policy "items_insert" on public.items
  for insert to authenticated with check (mj_id = auth.uid());
create policy "items_update" on public.items
  for update to authenticated using (mj_id = auth.uid()) with check (mj_id = auth.uid());
create policy "items_delete" on public.items
  for delete to authenticated using (mj_id = auth.uid());

-- ----------------------------------------------------------------------------
-- sorts — propriétaire = user_id (+ lien historique via personnage_id /
-- junction). Lecture publique si public. fn_owns_sort est SECURITY DEFINER.
-- ----------------------------------------------------------------------------
create policy "sorts_select" on public.sorts
  for select to authenticated
  using (public = true or public.fn_owns_sort(id));
create policy "sorts_insert" on public.sorts
  for insert to authenticated
  with check (
    user_id = auth.uid()
    or (personnage_id is not null and public.fn_owns_personnage(personnage_id))
  );
create policy "sorts_update" on public.sorts
  for update to authenticated
  using (
    user_id = auth.uid()
    or (personnage_id is not null and public.fn_owns_personnage(personnage_id))
  )
  with check (
    user_id = auth.uid()
    or (personnage_id is not null and public.fn_owns_personnage(personnage_id))
  );
create policy "sorts_delete" on public.sorts
  for delete to authenticated
  using (
    user_id = auth.uid()
    or (personnage_id is not null and public.fn_owns_personnage(personnage_id))
  );

-- ----------------------------------------------------------------------------
-- maps — propriétaire = mj_id. Lecture publique si public.
-- ----------------------------------------------------------------------------
create policy "maps_select" on public.maps
  for select to authenticated using (mj_id = auth.uid() or public = true);
create policy "maps_insert" on public.maps
  for insert to authenticated with check (mj_id = auth.uid());
create policy "maps_update" on public.maps
  for update to authenticated using (mj_id = auth.uid()) with check (mj_id = auth.uid());
create policy "maps_delete" on public.maps
  for delete to authenticated using (mj_id = auth.uid());

-- ----------------------------------------------------------------------------
-- pnj — propriétaire = mj_id. Lecture publique si public.
-- ----------------------------------------------------------------------------
create policy "pnj_select" on public.pnj
  for select to authenticated using (mj_id = auth.uid() or public = true);
create policy "pnj_insert" on public.pnj
  for insert to authenticated with check (mj_id = auth.uid());
create policy "pnj_update" on public.pnj
  for update to authenticated using (mj_id = auth.uid()) with check (mj_id = auth.uid());
create policy "pnj_delete" on public.pnj
  for delete to authenticated using (mj_id = auth.uid());

-- ----------------------------------------------------------------------------
-- pnj_relations — propriétaire = mj_id (full access).
-- ----------------------------------------------------------------------------
create policy "pnj_relations_select" on public.pnj_relations
  for select to authenticated using (mj_id = auth.uid());
create policy "pnj_relations_insert" on public.pnj_relations
  for insert to authenticated with check (mj_id = auth.uid());
create policy "pnj_relations_update" on public.pnj_relations
  for update to authenticated using (mj_id = auth.uid()) with check (mj_id = auth.uid());
create policy "pnj_relations_delete" on public.pnj_relations
  for delete to authenticated using (mj_id = auth.uid());

-- ----------------------------------------------------------------------------
-- jets_de_des — propriétaire = user_id. Lecture aussi des jets partagés.
-- ----------------------------------------------------------------------------
create policy "jets_de_des_select" on public.jets_de_des
  for select to authenticated using (user_id = auth.uid() or partage = true);
create policy "jets_de_des_insert" on public.jets_de_des
  for insert to authenticated with check (user_id = auth.uid());
create policy "jets_de_des_update" on public.jets_de_des
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "jets_de_des_delete" on public.jets_de_des
  for delete to authenticated using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- codes_invitation — le code lui-même est le secret. Accessible à tout
-- utilisateur authentifié (lecture pour résoudre un code, insert/update pour
-- créer / marquer comme utilisé).
-- ----------------------------------------------------------------------------
create policy "codes_invitation_select" on public.codes_invitation
  for select to authenticated using (auth.uid() is not null);
create policy "codes_invitation_insert" on public.codes_invitation
  for insert to authenticated with check (auth.uid() is not null);
create policy "codes_invitation_update" on public.codes_invitation
  for update to authenticated using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "codes_invitation_delete" on public.codes_invitation
  for delete to authenticated using (auth.uid() is not null);

-- ----------------------------------------------------------------------------
-- chapitres — rattachés à un scénario. Lecture : MJ + joueurs inscrits.
-- Écriture : MJ uniquement.
-- ----------------------------------------------------------------------------
create policy "chapitres_select" on public.chapitres
  for select to authenticated using (public.fn_is_scenario_member(scenario_id));
create policy "chapitres_insert" on public.chapitres
  for insert to authenticated with check (public.fn_is_scenario_mj(scenario_id));
create policy "chapitres_update" on public.chapitres
  for update to authenticated
  using (public.fn_is_scenario_mj(scenario_id))
  with check (public.fn_is_scenario_mj(scenario_id));
create policy "chapitres_delete" on public.chapitres
  for delete to authenticated using (public.fn_is_scenario_mj(scenario_id));

-- ----------------------------------------------------------------------------
-- scenario_liens — idem chapitres.
-- ----------------------------------------------------------------------------
create policy "scenario_liens_select" on public.scenario_liens
  for select to authenticated using (public.fn_is_scenario_member(scenario_id));
create policy "scenario_liens_insert" on public.scenario_liens
  for insert to authenticated with check (public.fn_is_scenario_mj(scenario_id));
create policy "scenario_liens_update" on public.scenario_liens
  for update to authenticated
  using (public.fn_is_scenario_mj(scenario_id))
  with check (public.fn_is_scenario_mj(scenario_id));
create policy "scenario_liens_delete" on public.scenario_liens
  for delete to authenticated using (public.fn_is_scenario_mj(scenario_id));

-- ----------------------------------------------------------------------------
-- quetes — idem chapitres.
-- ----------------------------------------------------------------------------
create policy "quetes_select" on public.quetes
  for select to authenticated using (public.fn_is_scenario_member(scenario_id));
create policy "quetes_insert" on public.quetes
  for insert to authenticated with check (public.fn_is_scenario_mj(scenario_id));
create policy "quetes_update" on public.quetes
  for update to authenticated
  using (public.fn_is_scenario_mj(scenario_id))
  with check (public.fn_is_scenario_mj(scenario_id));
create policy "quetes_delete" on public.quetes
  for delete to authenticated using (public.fn_is_scenario_mj(scenario_id));

-- ----------------------------------------------------------------------------
-- combats — état de combat. Lecture : MJ + joueurs. Écriture : MJ.
-- ----------------------------------------------------------------------------
create policy "combats_select" on public.combats
  for select to authenticated using (public.fn_is_scenario_member(scenario_id));
create policy "combats_insert" on public.combats
  for insert to authenticated with check (public.fn_is_scenario_mj(scenario_id));
create policy "combats_update" on public.combats
  for update to authenticated
  using (public.fn_is_scenario_mj(scenario_id))
  with check (public.fn_is_scenario_mj(scenario_id));
create policy "combats_delete" on public.combats
  for delete to authenticated using (public.fn_is_scenario_mj(scenario_id));

-- ----------------------------------------------------------------------------
-- explorations — carte d'exploration. Lecture : MJ + joueurs. Écriture : MJ.
-- ----------------------------------------------------------------------------
create policy "explorations_select" on public.explorations
  for select to authenticated using (public.fn_is_scenario_member(scenario_id));
create policy "explorations_insert" on public.explorations
  for insert to authenticated with check (public.fn_is_scenario_mj(scenario_id));
create policy "explorations_update" on public.explorations
  for update to authenticated
  using (public.fn_is_scenario_mj(scenario_id))
  with check (public.fn_is_scenario_mj(scenario_id));
create policy "explorations_delete" on public.explorations
  for delete to authenticated using (public.fn_is_scenario_mj(scenario_id));

-- ----------------------------------------------------------------------------
-- presentation_etats — état diffusé vers l'écran joueurs. Lecture : MJ +
-- joueurs. Écriture : MJ. NB : clé primaire = scenario_id.
-- ----------------------------------------------------------------------------
create policy "presentation_etats_select" on public.presentation_etats
  for select to authenticated using (public.fn_is_scenario_member(scenario_id));
create policy "presentation_etats_insert" on public.presentation_etats
  for insert to authenticated with check (public.fn_is_scenario_mj(scenario_id));
create policy "presentation_etats_update" on public.presentation_etats
  for update to authenticated
  using (public.fn_is_scenario_mj(scenario_id))
  with check (public.fn_is_scenario_mj(scenario_id));
create policy "presentation_etats_delete" on public.presentation_etats
  for delete to authenticated using (public.fn_is_scenario_mj(scenario_id));

-- ----------------------------------------------------------------------------
-- mindmaps — cartes mentales d'un scénario. MJ uniquement.
-- ----------------------------------------------------------------------------
create policy "mindmaps_select" on public.mindmaps
  for select to authenticated using (public.fn_is_scenario_mj(scenario_id));
create policy "mindmaps_insert" on public.mindmaps
  for insert to authenticated with check (public.fn_is_scenario_mj(scenario_id));
create policy "mindmaps_update" on public.mindmaps
  for update to authenticated
  using (public.fn_is_scenario_mj(scenario_id))
  with check (public.fn_is_scenario_mj(scenario_id));
create policy "mindmaps_delete" on public.mindmaps
  for delete to authenticated using (public.fn_is_scenario_mj(scenario_id));

-- ----------------------------------------------------------------------------
-- mindmap_noeuds — nœuds. Accès via mindmaps → scenarios (MJ uniquement).
-- ----------------------------------------------------------------------------
create policy "mindmap_noeuds_select" on public.mindmap_noeuds
  for select to authenticated using (public.fn_is_mindmap_mj(mindmap_id));
create policy "mindmap_noeuds_insert" on public.mindmap_noeuds
  for insert to authenticated with check (public.fn_is_mindmap_mj(mindmap_id));
create policy "mindmap_noeuds_update" on public.mindmap_noeuds
  for update to authenticated
  using (public.fn_is_mindmap_mj(mindmap_id))
  with check (public.fn_is_mindmap_mj(mindmap_id));
create policy "mindmap_noeuds_delete" on public.mindmap_noeuds
  for delete to authenticated using (public.fn_is_mindmap_mj(mindmap_id));

-- ----------------------------------------------------------------------------
-- mindmap_liens — liens. Idem mindmap_noeuds.
-- ----------------------------------------------------------------------------
create policy "mindmap_liens_select" on public.mindmap_liens
  for select to authenticated using (public.fn_is_mindmap_mj(mindmap_id));
create policy "mindmap_liens_insert" on public.mindmap_liens
  for insert to authenticated with check (public.fn_is_mindmap_mj(mindmap_id));
create policy "mindmap_liens_update" on public.mindmap_liens
  for update to authenticated
  using (public.fn_is_mindmap_mj(mindmap_id))
  with check (public.fn_is_mindmap_mj(mindmap_id));
create policy "mindmap_liens_delete" on public.mindmap_liens
  for delete to authenticated using (public.fn_is_mindmap_mj(mindmap_id));

-- ----------------------------------------------------------------------------
-- mindmap_types_custom — types de nœuds personnalisés, rattachés au scénario.
-- ----------------------------------------------------------------------------
create policy "mindmap_types_custom_select" on public.mindmap_types_custom
  for select to authenticated using (public.fn_is_scenario_mj(scenario_id));
create policy "mindmap_types_custom_insert" on public.mindmap_types_custom
  for insert to authenticated with check (public.fn_is_scenario_mj(scenario_id));
create policy "mindmap_types_custom_update" on public.mindmap_types_custom
  for update to authenticated
  using (public.fn_is_scenario_mj(scenario_id))
  with check (public.fn_is_scenario_mj(scenario_id));
create policy "mindmap_types_custom_delete" on public.mindmap_types_custom
  for delete to authenticated using (public.fn_is_scenario_mj(scenario_id));


-- ============================================================================
-- 5. VÉRIFICATIONS (à lancer manuellement après la migration)
-- ============================================================================
-- Toutes les tables publiques doivent avoir rowsecurity = true :
--   select tablename, rowsecurity
--     from pg_tables
--    where schemaname = 'public'
--    order by tablename;
--
-- Lister les policies posées :
--   select tablename, policyname, cmd
--     from pg_policies
--    where schemaname = 'public'
--    order by tablename, cmd;
--
-- En cas de "infinite recursion" : vérifier qu'AUCUNE policy n'utilise un
-- EXISTS direct croisé entre scenarios et scenarios_joueurs — tout doit passer
-- par les fonctions fn_* SECURITY DEFINER ci-dessus.
-- ============================================================================
