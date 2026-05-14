-- ============================================================================
-- Mode Présentation — état partagé MJ ↔ écran TV joueurs
-- ============================================================================
-- À exécuter dans le SQL Editor de Supabase. Idempotent.
--
-- Une ligne par scénario, contenant l'état "diffusé" sur la TV/écran :
--   - lieu_nom / lieu_description : ce que voient les joueurs (modifiable
--     par le MJ en live depuis son interface)
--   - chapitre_actuel : nom/titre du chapitre courant (string libre, peut
--     être laissé vide pour ne rien afficher)
--   - ennemis_visibles : si false, le client présentation masque les noms
--     et les HP des ennemis (affiche "??" / "Créature obscure")
--   - dernier_jet : dernier jet de dés mis en avant ({type, valeurs, total,
--     auteur, created_at}) — alimenté par le lanceur ou manuellement
--
-- Le rafraîchissement côté écran joueurs passe par Supabase Realtime.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Table presentation_etats (1 ligne par scénario)
-- ----------------------------------------------------------------------------

create table if not exists public.presentation_etats (
  scenario_id uuid primary key references public.scenarios(id) on delete cascade,
  lieu_nom text,
  lieu_description text,
  chapitre_actuel text,
  ennemis_visibles boolean not null default false,
  dernier_jet jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists presentation_etats_updated_at_idx
  on public.presentation_etats(updated_at);


-- ----------------------------------------------------------------------------
-- 2. RLS : MJ lit/écrit son scénario, joueurs liés peuvent lire
-- ----------------------------------------------------------------------------

alter table public.presentation_etats enable row level security;

drop policy if exists "presentation_etats_select" on public.presentation_etats;
create policy "presentation_etats_select" on public.presentation_etats
  for select using (
    exists (
      select 1 from public.scenarios s
      where s.id = presentation_etats.scenario_id
        and (
          s.mj_id = auth.uid()
          or exists (
            select 1 from public.scenarios_joueurs sj
            where sj.scenario_id = s.id and sj.joueur_id = auth.uid()
          )
        )
    )
  );

drop policy if exists "presentation_etats_insert" on public.presentation_etats;
create policy "presentation_etats_insert" on public.presentation_etats
  for insert with check (
    exists (
      select 1 from public.scenarios s
      where s.id = presentation_etats.scenario_id and s.mj_id = auth.uid()
    )
  );

drop policy if exists "presentation_etats_update" on public.presentation_etats;
create policy "presentation_etats_update" on public.presentation_etats
  for update
  using (
    exists (
      select 1 from public.scenarios s
      where s.id = presentation_etats.scenario_id and s.mj_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.scenarios s
      where s.id = presentation_etats.scenario_id and s.mj_id = auth.uid()
    )
  );

drop policy if exists "presentation_etats_delete" on public.presentation_etats;
create policy "presentation_etats_delete" on public.presentation_etats
  for delete using (
    exists (
      select 1 from public.scenarios s
      where s.id = presentation_etats.scenario_id and s.mj_id = auth.uid()
    )
  );


-- ----------------------------------------------------------------------------
-- 3. Realtime : la table est publiée pour la synchro temps réel
-- ----------------------------------------------------------------------------
-- Idempotent : on n'ajoute la table à la publication que si elle n'y est pas
-- déjà (sinon erreur « relation is already member of publication »).

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'presentation_etats'
  ) then
    execute 'alter publication supabase_realtime add table public.presentation_etats';
  end if;
end $$;


-- ============================================================================
-- Fin de la migration.
-- ============================================================================
