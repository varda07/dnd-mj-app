-- ============================================================================
-- Roadmap Affinement 2.11/2.12/2.13 — Fog of war / Markers / Calques
-- ----------------------------------------------------------------------------
-- Trois tables qui étendent les cartes existantes avec des couches
-- interactives (brouillard de guerre, marqueurs/pings, calques superposables).
--
-- IMPORTANT — Schéma de `public.maps` :
--   La table `maps` (cf. setup.sql) n'a PAS de colonne scenario_id ; elle est
--   reliée à un MJ par `mj_id` directement, et le lien map↔scénario passe par
--   la table de jonction `scenario_liens` (element_type = 'map').
--   Les policies ci-dessous s'appuient donc sur `maps.mj_id` + `maps.public`.
--   La colonne scenario_id sur fog/markers/calques est conservée pour aider
--   l'app (« quelle map utilise quel scénario pour cette session »).
-- ============================================================================

-- 2.11 — Brouillard de guerre
create table if not exists public.fog_of_war (
  id uuid primary key default gen_random_uuid(),
  map_id uuid not null references public.maps(id) on delete cascade,
  scenario_id uuid references public.scenarios(id) on delete cascade,
  -- zones : tableau de polygones ou pixel-mask sérialisé en base64
  zones jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);
create index if not exists fog_of_war_map_idx on public.fog_of_war(map_id);

-- 2.12 — Pings & markers permanents
create table if not exists public.map_markers (
  id uuid primary key default gen_random_uuid(),
  map_id uuid not null references public.maps(id) on delete cascade,
  scenario_id uuid references public.scenarios(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null, -- auteur (joueur ou MJ)
  type text not null default 'poi',  -- 'poi' | 'piege' | 'tresor' | 'pnj' | 'ennemi' | 'indice' | 'ping'
  -- ping temporaire : flag is_temporary + ttl (côté client gère l'expiration)
  is_temporary boolean not null default false,
  x_pct real not null,                -- position en % (0..100) pour résolution-indep
  y_pct real not null,
  label text default '',
  description text default '',
  color text default '#C9A84C',
  -- visibilité : 'tous' (joueurs voient) | 'mj' (MJ seulement)
  visibilite text not null default 'tous',
  created_at timestamptz not null default now()
);
create index if not exists map_markers_map_idx on public.map_markers(map_id, created_at desc);

-- 2.13 — Calques de carte
create table if not exists public.map_calques (
  id uuid primary key default gen_random_uuid(),
  map_id uuid not null references public.maps(id) on delete cascade,
  scenario_id uuid references public.scenarios(id) on delete cascade,
  nom text not null,                         -- "Base", "Pièges", "Trésors", "Ennemis", "Notes MJ"
  ordre integer not null default 0,
  visible_joueurs boolean not null default true,
  visible_mj boolean not null default true,
  contenu jsonb not null default '{}'::jsonb, -- shapes, drawings, image overlays…
  created_at timestamptz not null default now()
);
create index if not exists map_calques_map_idx on public.map_calques(map_id, ordre);

-- ----------------------------------------------------------------------------
-- RLS
-- Toutes les conditions passent par `maps.mj_id` (propriétaire direct).
-- Lecture publique seulement si `maps.public = true`.
-- ----------------------------------------------------------------------------
alter table public.fog_of_war enable row level security;
alter table public.map_markers enable row level security;
alter table public.map_calques enable row level security;

-- ---- fog_of_war ----
drop policy if exists "fog_mj_all" on public.fog_of_war;
create policy "fog_mj_all" on public.fog_of_war
  for all using (
    exists (
      select 1 from public.maps m
      where m.id = fog_of_war.map_id
        and m.mj_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.maps m
      where m.id = fog_of_war.map_id
        and m.mj_id = auth.uid()
    )
  );

drop policy if exists "fog_public_select" on public.fog_of_war;
create policy "fog_public_select" on public.fog_of_war
  for select using (
    exists (
      select 1 from public.maps m
      where m.id = fog_of_war.map_id
        and (m.mj_id = auth.uid() or m.public = true)
    )
  );

-- ---- map_markers ----
-- MJ propriétaire de la map : tout (read/write).
-- Auteur du marker : peut éditer/supprimer le sien (utile pour les pings joueurs).
drop policy if exists "markers_mj_all" on public.map_markers;
create policy "markers_mj_all" on public.map_markers
  for all using (
    user_id = auth.uid()
    or exists (
      select 1 from public.maps m
      where m.id = map_markers.map_id
        and m.mj_id = auth.uid()
    )
  )
  with check (
    user_id = auth.uid()
    or exists (
      select 1 from public.maps m
      where m.id = map_markers.map_id
        and m.mj_id = auth.uid()
    )
  );

drop policy if exists "markers_public_select" on public.map_markers;
create policy "markers_public_select" on public.map_markers
  for select using (
    exists (
      select 1 from public.maps m
      where m.id = map_markers.map_id
        and (m.mj_id = auth.uid() or m.public = true)
    )
    and (
      visibilite = 'tous'
      or exists (
        select 1 from public.maps m2
        where m2.id = map_markers.map_id
          and m2.mj_id = auth.uid()
      )
    )
  );

-- ---- map_calques ----
drop policy if exists "calques_mj_all" on public.map_calques;
create policy "calques_mj_all" on public.map_calques
  for all using (
    exists (
      select 1 from public.maps m
      where m.id = map_calques.map_id
        and m.mj_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.maps m
      where m.id = map_calques.map_id
        and m.mj_id = auth.uid()
    )
  );

drop policy if exists "calques_public_select" on public.map_calques;
create policy "calques_public_select" on public.map_calques
  for select using (
    exists (
      select 1 from public.maps m
      where m.id = map_calques.map_id
        and (m.mj_id = auth.uid() or m.public = true)
    )
    and (
      visible_joueurs = true
      or exists (
        select 1 from public.maps m2
        where m2.id = map_calques.map_id
          and m2.mj_id = auth.uid()
      )
    )
  );

-- Touch updated_at sur fog_of_war
create or replace function public.touch_fog_updated_at() returns trigger as $$
begin new.updated_at := now(); return new; end;
$$ language plpgsql;
drop trigger if exists tg_touch_fog on public.fog_of_war;
create trigger tg_touch_fog before update on public.fog_of_war
  for each row execute function public.touch_fog_updated_at();
