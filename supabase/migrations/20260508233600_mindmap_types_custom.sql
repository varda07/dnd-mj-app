-- ============================================================================
-- Types de nœuds personnalisés pour les cartes mentales
-- ============================================================================
-- À exécuter dans le SQL Editor de Supabase. Idempotent.
--
-- Permet au MJ de créer ses propres types de nœud (au-delà des 4 types
-- prédéfinis 'lieu', 'pnj', 'evenement', 'indice'). Un type custom est
-- défini par un nom, une couleur (clé de palette) et une icône (emoji).
-- Les types sont attachés au scénario pour pouvoir être réutilisés sur
-- plusieurs cartes mentales du même scénario.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Table mindmap_types_custom
-- ----------------------------------------------------------------------------

create table if not exists public.mindmap_types_custom (
  id uuid primary key default gen_random_uuid(),
  scenario_id uuid not null references public.scenarios(id) on delete cascade,
  nom text not null,
  couleur text not null default 'gris',
  icone text not null default '✨',
  created_at timestamptz not null default now()
);

create index if not exists idx_mindmap_types_custom_scenario
  on public.mindmap_types_custom(scenario_id);

alter table public.mindmap_types_custom enable row level security;

drop policy if exists "mindmap_types_custom_all" on public.mindmap_types_custom;
create policy "mindmap_types_custom_all" on public.mindmap_types_custom
  for all
  using (
    exists (
      select 1 from public.scenarios s
      where s.id = mindmap_types_custom.scenario_id and s.mj_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.scenarios s
      where s.id = mindmap_types_custom.scenario_id and s.mj_id = auth.uid()
    )
  );


-- ----------------------------------------------------------------------------
-- 2. Référence custom_type_id sur mindmap_noeuds + extension du check
-- ----------------------------------------------------------------------------
-- Un noeud peut maintenant avoir type='custom' associé à un custom_type_id.
-- Pour les 4 types prédéfinis, custom_type_id reste NULL.

alter table public.mindmap_noeuds
  add column if not exists custom_type_id uuid
    references public.mindmap_types_custom(id) on delete set null;

-- Étend la check constraint sur `type` pour autoriser la valeur 'custom'.
-- On retrouve le nom de la contrainte dynamiquement (auto-généré) puis on
-- la remplace.
do $$
declare
  cst text;
begin
  select conname into cst
    from pg_constraint
    where conrelid = 'public.mindmap_noeuds'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%type%in%';
  if cst is not null then
    execute format('alter table public.mindmap_noeuds drop constraint %I', cst);
  end if;
end $$;

alter table public.mindmap_noeuds
  add constraint mindmap_noeuds_type_check
  check (type in ('lieu', 'pnj', 'evenement', 'indice', 'custom'));

-- Si type = 'custom', custom_type_id doit être renseigné (et inversement).
alter table public.mindmap_noeuds
  drop constraint if exists mindmap_noeuds_custom_consistency;
alter table public.mindmap_noeuds
  add constraint mindmap_noeuds_custom_consistency
  check (
    (type = 'custom' and custom_type_id is not null)
    or (type <> 'custom' and custom_type_id is null)
  );

create index if not exists idx_mindmap_noeuds_custom_type
  on public.mindmap_noeuds(custom_type_id);


-- ============================================================================
-- Fin de la migration.
-- ============================================================================
