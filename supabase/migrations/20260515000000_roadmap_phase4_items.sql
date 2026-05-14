-- ============================================================================
-- ROADMAP MASTER SCREEN — Phase 4 : Items
-- ============================================================================
-- À appliquer via `supabase db push`. Idempotent.
-- Couvre : 4.2 identification d'objets, 4.3 crafting recipes, 4.4 économie.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 4.2 — Identification d'objets
-- ----------------------------------------------------------------------------
-- identifie = false → l'objet est « mystérieux » ; niveau_identification (0-3)
-- pilote la révélation progressive : 0 rien · 1 nom · 2 +type/rareté · 3 +desc.
alter table public.items
  add column if not exists identifie boolean not null default true,
  add column if not exists niveau_identification integer not null default 3;


-- ----------------------------------------------------------------------------
-- 4.3 — Crafting recipes
-- ----------------------------------------------------------------------------
-- recette_craft : { "materiaux": text, "temps": text, "competence": text } | null
alter table public.items
  add column if not exists recette_craft jsonb;


-- ----------------------------------------------------------------------------
-- 4.4 — Économie de campagne
-- ----------------------------------------------------------------------------
-- Une ligne par région/ville d'un scénario. `modificateurs` et `marchands`
-- sont des structures JSONB libres (schéma exact côté client).
create table if not exists public.economie_campagne (
  id uuid primary key default gen_random_uuid(),
  scenario_id uuid not null references public.scenarios(id) on delete cascade,
  region text not null default '',
  modificateurs jsonb not null default '{}'::jsonb,
  marchands jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists economie_campagne_scenario_idx
  on public.economie_campagne(scenario_id);

alter table public.economie_campagne enable row level security;

-- Outil de planification du MJ : lecture + écriture réservées au MJ du
-- scénario (réutilise la fonction SECURITY DEFINER de security_rls_complete).
drop policy if exists "economie_campagne_select" on public.economie_campagne;
create policy "economie_campagne_select" on public.economie_campagne
  for select to authenticated
  using (public.fn_is_scenario_mj(scenario_id));

drop policy if exists "economie_campagne_insert" on public.economie_campagne;
create policy "economie_campagne_insert" on public.economie_campagne
  for insert to authenticated
  with check (public.fn_is_scenario_mj(scenario_id));

drop policy if exists "economie_campagne_update" on public.economie_campagne;
create policy "economie_campagne_update" on public.economie_campagne
  for update to authenticated
  using (public.fn_is_scenario_mj(scenario_id))
  with check (public.fn_is_scenario_mj(scenario_id));

drop policy if exists "economie_campagne_delete" on public.economie_campagne;
create policy "economie_campagne_delete" on public.economie_campagne
  for delete to authenticated
  using (public.fn_is_scenario_mj(scenario_id));

create or replace function public.touch_economie_campagne()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists economie_campagne_touch on public.economie_campagne;
create trigger economie_campagne_touch
  before update on public.economie_campagne
  for each row execute function public.touch_economie_campagne();


-- ============================================================================
-- Fin de la migration Phase 4.
-- ============================================================================
