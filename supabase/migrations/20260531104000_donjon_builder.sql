-- ============================================================================
-- Roadmap Modes 3.x — Donjon builder
-- ----------------------------------------------------------------------------
-- 3.2  random_encounters_zones
-- 3.3  triggers_map
-- 3.5  tresors_caches
-- 3.6  zones_eclairage
-- 3.7  pnj_rencontrables_map
-- 3.8  templates_donjons
-- 3.10 map_liens
-- 3.11 annotations_mj_map
--
-- Toutes les tables RLS via maps.mj_id (le schéma maps n'a pas de scenario_id
-- direct — cf. fix précédent sur fog/markers/calques).
-- ============================================================================

-- ------------------------------------------------------------------
-- 3.2 — Random encounters par zone
-- ------------------------------------------------------------------
create table if not exists public.random_encounters_zones (
  id uuid primary key default gen_random_uuid(),
  map_id uuid not null references public.maps(id) on delete cascade,
  nom text not null default 'Zone',
  zone jsonb not null,                          -- { x, y, w, h } en pourcentages
  probabilite_pour_20 int not null default 5,   -- 1..20 (déclenche sur 1d20 ≤ N)
  type text not null default 'combat',          -- 'combat' | 'dialogue' | 'loot' | 'piege'
  contenu jsonb not null default '{}'::jsonb,   -- pool d'ennemis / loot / etc.
  created_at timestamptz not null default now()
);
create index if not exists rez_map_idx on public.random_encounters_zones(map_id);

-- ------------------------------------------------------------------
-- 3.3 — Triggers conditionnels (zone de la map → effet validé par MJ)
-- ------------------------------------------------------------------
create table if not exists public.triggers_map (
  id uuid primary key default gen_random_uuid(),
  map_id uuid not null references public.maps(id) on delete cascade,
  nom text not null default 'Trigger',
  zone jsonb not null,
  type text not null,                  -- 'combat' | 'dialogue' | 'texte' | 'loot' | 'teleport' | 'effet'
  contenu jsonb not null default '{}'::jsonb,
  valide_mj boolean not null default true,
  declenche boolean not null default false, -- pour les triggers one-shot
  created_at timestamptz not null default now()
);
create index if not exists triggers_map_map_idx on public.triggers_map(map_id);

-- ------------------------------------------------------------------
-- 3.5 — Trésors cachés
-- ------------------------------------------------------------------
create table if not exists public.tresors_caches (
  id uuid primary key default gen_random_uuid(),
  map_id uuid not null references public.maps(id) on delete cascade,
  nom text not null default 'Trésor',
  position jsonb not null,                -- { x, y } en pourcentages
  contenu jsonb not null default '{}'::jsonb, -- { items: [], or: 0, gemmes: 0 }
  dc_perception int not null default 12,
  dc_serrure int,                          -- null si non verrouillé
  decouvert boolean not null default false,
  ouvert boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists tresors_caches_map_idx on public.tresors_caches(map_id);

-- ------------------------------------------------------------------
-- 3.6 — Zones d'éclairage
-- ------------------------------------------------------------------
create table if not exists public.zones_eclairage (
  id uuid primary key default gen_random_uuid(),
  map_id uuid not null references public.maps(id) on delete cascade,
  zone jsonb not null,
  type text not null check (type in ('eclaire', 'penombre', 'obscurite')),
  created_at timestamptz not null default now()
);
create index if not exists zones_eclairage_map_idx on public.zones_eclairage(map_id);

-- ------------------------------------------------------------------
-- 3.7 — PNJ rencontrables sur la map
-- ------------------------------------------------------------------
create table if not exists public.pnj_rencontrables_map (
  id uuid primary key default gen_random_uuid(),
  map_id uuid not null references public.maps(id) on delete cascade,
  pnj_id uuid references public.pnj(id) on delete set null,
  position jsonb not null,
  dialogue_intro text default '',
  valide_mj boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists pnj_renc_map_idx on public.pnj_rencontrables_map(map_id);

-- ------------------------------------------------------------------
-- 3.8 — Templates de donjons sauvegardables
-- ------------------------------------------------------------------
create table if not exists public.templates_donjons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nom text not null,
  description text default '',
  contenu jsonb not null default '{}'::jsonb, -- snapshot complet (tuiles + pieges + tresors + …)
  public boolean not null default false,
  nb_copies int not null default 0,
  auteur_username text,
  created_at timestamptz not null default now()
);
create index if not exists templates_donjons_user_idx on public.templates_donjons(user_id);
create index if not exists templates_donjons_public_idx on public.templates_donjons(public, created_at desc);

-- ------------------------------------------------------------------
-- 3.10 — Liens entre maps (donjons multi-étages)
-- ------------------------------------------------------------------
create table if not exists public.map_liens (
  id uuid primary key default gen_random_uuid(),
  map_source_id uuid not null references public.maps(id) on delete cascade,
  map_destination_id uuid not null references public.maps(id) on delete cascade,
  position_source jsonb not null,
  position_destination jsonb,
  label text default 'Passage',
  type text not null default 'escalier', -- 'escalier' | 'portail' | 'porte'
  created_at timestamptz not null default now(),
  check (map_source_id <> map_destination_id)
);
create index if not exists map_liens_source_idx on public.map_liens(map_source_id);

-- ------------------------------------------------------------------
-- 3.11 — Annotations MJ (post-it sur la map)
-- ------------------------------------------------------------------
create table if not exists public.annotations_mj_map (
  id uuid primary key default gen_random_uuid(),
  map_id uuid not null references public.maps(id) on delete cascade,
  position jsonb not null,
  contenu text not null,
  couleur text default '#fbbf24',
  created_at timestamptz not null default now()
);
create index if not exists annotations_map_idx on public.annotations_mj_map(map_id);


-- ============================================================================
-- RLS — toutes via maps.mj_id (propriétaire direct) + maps.public pour lecture
-- ============================================================================

alter table public.random_encounters_zones enable row level security;
alter table public.triggers_map           enable row level security;
alter table public.tresors_caches         enable row level security;
alter table public.zones_eclairage        enable row level security;
alter table public.pnj_rencontrables_map  enable row level security;
alter table public.templates_donjons      enable row level security;
alter table public.map_liens              enable row level security;
alter table public.annotations_mj_map     enable row level security;

-- Macro générique : MJ propriétaire de la map a tous les droits ; lecture
-- publique si la map est publique. Annotations MJ = MJ seulement (jamais
-- visibles aux joueurs).

-- random_encounters_zones (MJ uniquement — pas pour les joueurs)
drop policy if exists "rez_mj_all" on public.random_encounters_zones;
create policy "rez_mj_all" on public.random_encounters_zones
  for all using (
    exists (select 1 from public.maps m where m.id = random_encounters_zones.map_id and m.mj_id = auth.uid())
  )
  with check (
    exists (select 1 from public.maps m where m.id = random_encounters_zones.map_id and m.mj_id = auth.uid())
  );

-- triggers_map (MJ uniquement)
drop policy if exists "triggers_mj_all" on public.triggers_map;
create policy "triggers_mj_all" on public.triggers_map
  for all using (
    exists (select 1 from public.maps m where m.id = triggers_map.map_id and m.mj_id = auth.uid())
  )
  with check (
    exists (select 1 from public.maps m where m.id = triggers_map.map_id and m.mj_id = auth.uid())
  );

-- tresors_caches (MJ tout, lecture publique seulement si decouvert=true)
drop policy if exists "tresors_mj_all" on public.tresors_caches;
create policy "tresors_mj_all" on public.tresors_caches
  for all using (
    exists (select 1 from public.maps m where m.id = tresors_caches.map_id and m.mj_id = auth.uid())
  )
  with check (
    exists (select 1 from public.maps m where m.id = tresors_caches.map_id and m.mj_id = auth.uid())
  );
drop policy if exists "tresors_public_select" on public.tresors_caches;
create policy "tresors_public_select" on public.tresors_caches
  for select using (
    decouvert = true and exists (
      select 1 from public.maps m where m.id = tresors_caches.map_id and m.public = true
    )
  );

-- zones_eclairage (visibles à tous si map publique — les joueurs en ont besoin pour l'affichage)
drop policy if exists "eclairage_mj_all" on public.zones_eclairage;
create policy "eclairage_mj_all" on public.zones_eclairage
  for all using (
    exists (select 1 from public.maps m where m.id = zones_eclairage.map_id and m.mj_id = auth.uid())
  )
  with check (
    exists (select 1 from public.maps m where m.id = zones_eclairage.map_id and m.mj_id = auth.uid())
  );
drop policy if exists "eclairage_public_select" on public.zones_eclairage;
create policy "eclairage_public_select" on public.zones_eclairage
  for select using (
    exists (select 1 from public.maps m where m.id = zones_eclairage.map_id and (m.mj_id = auth.uid() or m.public = true))
  );

-- pnj_rencontrables_map (MJ seulement)
drop policy if exists "pnj_renc_mj_all" on public.pnj_rencontrables_map;
create policy "pnj_renc_mj_all" on public.pnj_rencontrables_map
  for all using (
    exists (select 1 from public.maps m where m.id = pnj_rencontrables_map.map_id and m.mj_id = auth.uid())
  )
  with check (
    exists (select 1 from public.maps m where m.id = pnj_rencontrables_map.map_id and m.mj_id = auth.uid())
  );

-- templates_donjons (propriétaire + lecture publique si public=true)
drop policy if exists "tpl_donjons_owner_all" on public.templates_donjons;
create policy "tpl_donjons_owner_all" on public.templates_donjons
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "tpl_donjons_public_select" on public.templates_donjons;
create policy "tpl_donjons_public_select" on public.templates_donjons
  for select using (public = true);

-- map_liens (MJ propriétaire des deux maps)
drop policy if exists "map_liens_mj_all" on public.map_liens;
create policy "map_liens_mj_all" on public.map_liens
  for all using (
    exists (select 1 from public.maps m where m.id = map_liens.map_source_id and m.mj_id = auth.uid())
  )
  with check (
    exists (select 1 from public.maps m where m.id = map_liens.map_source_id and m.mj_id = auth.uid())
    and exists (select 1 from public.maps m2 where m2.id = map_liens.map_destination_id and m2.mj_id = auth.uid())
  );
drop policy if exists "map_liens_public_select" on public.map_liens;
create policy "map_liens_public_select" on public.map_liens
  for select using (
    exists (select 1 from public.maps m where m.id = map_liens.map_source_id and (m.mj_id = auth.uid() or m.public = true))
  );

-- annotations_mj_map (MJ STRICTEMENT — jamais visibles ailleurs)
drop policy if exists "annot_mj_all" on public.annotations_mj_map;
create policy "annot_mj_all" on public.annotations_mj_map
  for all using (
    exists (select 1 from public.maps m where m.id = annotations_mj_map.map_id and m.mj_id = auth.uid())
  )
  with check (
    exists (select 1 from public.maps m where m.id = annotations_mj_map.map_id and m.mj_id = auth.uid())
  );
