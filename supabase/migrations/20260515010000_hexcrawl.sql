-- ============================================================================
-- ROADMAP MASTER SCREEN — Phase 5.5 : Mode hexcrawl
-- ============================================================================
-- À appliquer via `supabase db push`. Idempotent.
-- Deux tables : `hexcrawl_maps` (la carte) et `hex_tiles` (un hexagone).
-- RLS : tout est réservé au MJ propriétaire de la carte.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- Table : hexcrawl_maps
-- ----------------------------------------------------------------------------
create table if not exists public.hexcrawl_maps (
  id uuid primary key default gen_random_uuid(),
  mj_id uuid not null references auth.users(id) on delete cascade,
  scenario_id uuid references public.scenarios(id) on delete set null,
  nom text not null default 'Région',
  cols integer not null default 10,
  rows integer not null default 8,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists hexcrawl_maps_mj_idx on public.hexcrawl_maps(mj_id);


-- ----------------------------------------------------------------------------
-- Table : hex_tiles
-- ----------------------------------------------------------------------------
create table if not exists public.hex_tiles (
  id uuid primary key default gen_random_uuid(),
  map_id uuid not null references public.hexcrawl_maps(id) on delete cascade,
  col integer not null,
  "row" integer not null,
  biome text not null default 'plaine',
  lieu text not null default '',
  evenements text not null default '',
  rumeurs text not null default '',
  explore boolean not null default false,
  unique (map_id, col, "row")
);

create index if not exists hex_tiles_map_idx on public.hex_tiles(map_id);


-- ----------------------------------------------------------------------------
-- Fonction SECURITY DEFINER — propriété d'une carte hexcrawl
-- ----------------------------------------------------------------------------
-- Évite tout EXISTS croisé inline dans les policies de hex_tiles.
create or replace function public.fn_owns_hexcrawl_map(p_map_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.hexcrawl_maps m
    where m.id = p_map_id and m.mj_id = auth.uid()
  );
$$;


-- ----------------------------------------------------------------------------
-- RLS : hexcrawl_maps
-- ----------------------------------------------------------------------------
alter table public.hexcrawl_maps enable row level security;

drop policy if exists "hexcrawl_maps_select" on public.hexcrawl_maps;
create policy "hexcrawl_maps_select" on public.hexcrawl_maps
  for select to authenticated
  using (mj_id = auth.uid());

drop policy if exists "hexcrawl_maps_insert" on public.hexcrawl_maps;
create policy "hexcrawl_maps_insert" on public.hexcrawl_maps
  for insert to authenticated
  with check (mj_id = auth.uid());

drop policy if exists "hexcrawl_maps_update" on public.hexcrawl_maps;
create policy "hexcrawl_maps_update" on public.hexcrawl_maps
  for update to authenticated
  using (mj_id = auth.uid())
  with check (mj_id = auth.uid());

drop policy if exists "hexcrawl_maps_delete" on public.hexcrawl_maps;
create policy "hexcrawl_maps_delete" on public.hexcrawl_maps
  for delete to authenticated
  using (mj_id = auth.uid());


-- ----------------------------------------------------------------------------
-- RLS : hex_tiles
-- ----------------------------------------------------------------------------
alter table public.hex_tiles enable row level security;

drop policy if exists "hex_tiles_select" on public.hex_tiles;
create policy "hex_tiles_select" on public.hex_tiles
  for select to authenticated
  using (public.fn_owns_hexcrawl_map(map_id));

drop policy if exists "hex_tiles_insert" on public.hex_tiles;
create policy "hex_tiles_insert" on public.hex_tiles
  for insert to authenticated
  with check (public.fn_owns_hexcrawl_map(map_id));

drop policy if exists "hex_tiles_update" on public.hex_tiles;
create policy "hex_tiles_update" on public.hex_tiles
  for update to authenticated
  using (public.fn_owns_hexcrawl_map(map_id))
  with check (public.fn_owns_hexcrawl_map(map_id));

drop policy if exists "hex_tiles_delete" on public.hex_tiles;
create policy "hex_tiles_delete" on public.hex_tiles
  for delete to authenticated
  using (public.fn_owns_hexcrawl_map(map_id));


-- ----------------------------------------------------------------------------
-- Trigger updated_at sur hexcrawl_maps
-- ----------------------------------------------------------------------------
create or replace function public.touch_hexcrawl_map()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists hexcrawl_maps_touch on public.hexcrawl_maps;
create trigger hexcrawl_maps_touch
  before update on public.hexcrawl_maps
  for each row execute function public.touch_hexcrawl_map();


-- ============================================================================
-- Fin de la migration Phase 5.5.
-- ============================================================================
