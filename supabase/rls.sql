-- ============================================================================
-- RLS policies pour les tables scenarios, personnages, ennemis, items, sorts
-- ============================================================================
-- Extrait de setup.sql — à exécuter dans le SQL Editor de Supabase.
-- Idempotent : drop policy if exists / create policy — peut être ré-exécuté.
--
-- Ce fichier suppose que :
--   - Les tables existent (scenarios, personnages, ennemis, items, sorts)
--   - La table scenarios_joueurs existe (voir setup.sql)
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. ACTIVATION RLS
-- ----------------------------------------------------------------------------

alter table public.scenarios enable row level security;
alter table public.personnages enable row level security;
alter table public.ennemis enable row level security;
alter table public.items enable row level security;
alter table public.sorts enable row level security;


-- ----------------------------------------------------------------------------
-- 2. POLICIES
-- ----------------------------------------------------------------------------

-- scenarios : le MJ voit/modifie ses scénarios ; les joueurs qui ont rejoint
-- (via scenarios_joueurs) voient en lecture.
drop policy if exists "scenarios_select" on public.scenarios;
create policy "scenarios_select" on public.scenarios
  for select using (
    auth.uid() = mj_id
    or exists (
      select 1 from public.scenarios_joueurs sj
      where sj.scenario_id = scenarios.id and sj.joueur_id = auth.uid()
    )
  );

drop policy if exists "scenarios_insert" on public.scenarios;
create policy "scenarios_insert" on public.scenarios
  for insert with check (auth.uid() = mj_id);

drop policy if exists "scenarios_update" on public.scenarios;
create policy "scenarios_update" on public.scenarios
  for update using (auth.uid() = mj_id);

drop policy if exists "scenarios_delete" on public.scenarios;
create policy "scenarios_delete" on public.scenarios
  for delete using (auth.uid() = mj_id);


-- personnages : le joueur propriétaire voit/modifie tout ; le MJ d'un scénario
-- rejoint par le joueur (via scenarios_joueurs) peut voir la fiche et modifier
-- (utile pour hp_actuel en combat). Seul le propriétaire peut supprimer.
drop policy if exists "personnages_select" on public.personnages;
create policy "personnages_select" on public.personnages
  for select using (
    auth.uid() = joueur_id
    or exists (
      select 1 from public.scenarios_joueurs sj
      join public.scenarios s on s.id = sj.scenario_id
      where sj.joueur_id = personnages.joueur_id and s.mj_id = auth.uid()
    )
  );

drop policy if exists "personnages_insert" on public.personnages;
create policy "personnages_insert" on public.personnages
  for insert with check (auth.uid() = joueur_id);

drop policy if exists "personnages_update" on public.personnages;
create policy "personnages_update" on public.personnages
  for update using (
    auth.uid() = joueur_id
    or exists (
      select 1 from public.scenarios s
      where s.id = personnages.scenario_id and s.mj_id = auth.uid()
    )
  );

drop policy if exists "personnages_delete" on public.personnages;
create policy "personnages_delete" on public.personnages
  for delete using (auth.uid() = joueur_id);


-- ennemis : MJ uniquement (création, lecture, modif, suppression)
drop policy if exists "ennemis_select" on public.ennemis;
create policy "ennemis_select" on public.ennemis
  for select using (auth.uid() = mj_id);

drop policy if exists "ennemis_insert" on public.ennemis;
create policy "ennemis_insert" on public.ennemis
  for insert with check (auth.uid() = mj_id);

drop policy if exists "ennemis_update" on public.ennemis;
create policy "ennemis_update" on public.ennemis
  for update using (auth.uid() = mj_id);

drop policy if exists "ennemis_delete" on public.ennemis;
create policy "ennemis_delete" on public.ennemis
  for delete using (auth.uid() = mj_id);


-- items : MJ uniquement
drop policy if exists "items_select" on public.items;
create policy "items_select" on public.items
  for select using (auth.uid() = mj_id);

drop policy if exists "items_insert" on public.items;
create policy "items_insert" on public.items
  for insert with check (auth.uid() = mj_id);

drop policy if exists "items_update" on public.items;
create policy "items_update" on public.items
  for update using (auth.uid() = mj_id);

drop policy if exists "items_delete" on public.items;
create policy "items_delete" on public.items
  for delete using (auth.uid() = mj_id);


-- sorts : rattachés à un personnage. Le joueur propriétaire gère ; le MJ d'un
-- scénario du joueur peut lire en consultation.
drop policy if exists "sorts_select" on public.sorts;
create policy "sorts_select" on public.sorts
  for select using (
    exists (
      select 1 from public.personnages p
      where p.id = sorts.personnage_id
        and (
          p.joueur_id = auth.uid()
          or exists (
            select 1 from public.scenarios_joueurs sj
            join public.scenarios s on s.id = sj.scenario_id
            where sj.joueur_id = p.joueur_id and s.mj_id = auth.uid()
          )
        )
    )
  );

drop policy if exists "sorts_insert" on public.sorts;
create policy "sorts_insert" on public.sorts
  for insert with check (
    exists (
      select 1 from public.personnages p
      where p.id = sorts.personnage_id and p.joueur_id = auth.uid()
    )
  );

drop policy if exists "sorts_update" on public.sorts;
create policy "sorts_update" on public.sorts
  for update using (
    exists (
      select 1 from public.personnages p
      where p.id = sorts.personnage_id and p.joueur_id = auth.uid()
    )
  );

drop policy if exists "sorts_delete" on public.sorts;
create policy "sorts_delete" on public.sorts
  for delete using (
    exists (
      select 1 from public.personnages p
      where p.id = sorts.personnage_id and p.joueur_id = auth.uid()
    )
  );


-- ============================================================================
-- Fin. Vérifie dans Supabase → Database → Policies que les policies sont
-- actives pour les 5 tables, ou teste via `select * from personnages;` depuis
-- un compte qui ne devrait pas voir les lignes.
-- ============================================================================
