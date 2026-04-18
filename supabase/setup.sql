-- ============================================================================
-- Setup complet Supabase pour l'app D&D MJ
-- ============================================================================
-- À exécuter dans le SQL Editor de Supabase. Idempotent : peut être ré-exécuté
-- sans casser l'état existant (if not exists / on conflict do nothing).
--
-- Prérequis : les tables de base doivent exister (scenarios, personnages,
-- ennemis, items, sorts). Ce script ne les crée pas — il ajoute les colonnes
-- manquantes, crée les tables annexes, configure RLS et Storage.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. COLONNES AJOUTÉES AUX TABLES EXISTANTES
-- ----------------------------------------------------------------------------

-- scenario_id sur personnages et ennemis (filtrage combat)
alter table public.personnages
  add column if not exists scenario_id uuid references public.scenarios(id) on delete set null;

alter table public.ennemis
  add column if not exists scenario_id uuid references public.scenarios(id) on delete set null;

-- Liens scénario + personnage sur items (rewards combat)
alter table public.items
  add column if not exists scenario_id uuid references public.scenarios(id) on delete set null,
  add column if not exists personnage_id uuid references public.personnages(id) on delete set null;

-- Image de fond de combat sur scenarios
alter table public.scenarios
  add column if not exists bg_image_url text;

-- Colonnes image_url pour ennemis et items (personnages et maps l'ont déjà)
alter table public.ennemis
  add column if not exists image_url text;

alter table public.items
  add column if not exists image_url text;


-- ----------------------------------------------------------------------------
-- 2. NOUVELLES TABLES
-- ----------------------------------------------------------------------------

-- Table maps (images de cartes du MJ, hors combat)
create table if not exists public.maps (
  id uuid primary key default gen_random_uuid(),
  mj_id uuid not null references auth.users(id) on delete cascade,
  nom text not null,
  description text default '',
  image_url text default '',
  created_at timestamptz not null default now()
);

-- Jets de dés partagés (lanceur de dés flottant)
create table if not exists public.jets_de_des (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type_de text not null,
  nombre int not null,
  resultats int[] not null,
  partage boolean not null default false,
  created_at timestamptz not null default now()
);

-- Codes d'invitation (joueur → MJ OU MJ → joueur)
create table if not exists public.codes_invitation (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  personnage_id uuid references public.personnages(id) on delete cascade,
  scenario_id uuid references public.scenarios(id) on delete cascade,
  utilise boolean not null default false,
  created_at timestamptz not null default now(),
  -- Un code est soit pour un perso, soit pour un scénario, jamais les deux ni aucun
  constraint codes_invitation_une_cible check (
    (personnage_id is not null and scenario_id is null)
    or (personnage_id is null and scenario_id is not null)
  )
);

-- Junction joueur ↔ scénario rejoint
create table if not exists public.scenarios_joueurs (
  scenario_id uuid not null references public.scenarios(id) on delete cascade,
  joueur_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (scenario_id, joueur_id)
);


-- ----------------------------------------------------------------------------
-- 3. INDEXES
-- ----------------------------------------------------------------------------

create index if not exists personnages_scenario_id_idx on public.personnages(scenario_id);
create index if not exists ennemis_scenario_id_idx on public.ennemis(scenario_id);
create index if not exists items_scenario_id_idx on public.items(scenario_id);
create index if not exists items_personnage_id_idx on public.items(personnage_id);
create index if not exists maps_mj_id_idx on public.maps(mj_id);
create index if not exists jets_de_des_created_at_idx on public.jets_de_des(created_at desc);
create index if not exists jets_de_des_user_id_idx on public.jets_de_des(user_id);
create index if not exists codes_invitation_code_idx on public.codes_invitation(code);
create index if not exists codes_invitation_personnage_id_idx on public.codes_invitation(personnage_id);
create index if not exists codes_invitation_scenario_id_idx on public.codes_invitation(scenario_id);
create index if not exists scenarios_joueurs_joueur_id_idx on public.scenarios_joueurs(joueur_id);


-- ----------------------------------------------------------------------------
-- 4. RLS : ACTIVATION
-- ----------------------------------------------------------------------------

alter table public.maps enable row level security;
alter table public.jets_de_des enable row level security;
alter table public.codes_invitation enable row level security;
alter table public.scenarios_joueurs enable row level security;


-- ----------------------------------------------------------------------------
-- 5. RLS : POLICIES
-- ----------------------------------------------------------------------------
-- NB : create policy n'accepte pas "if not exists" en Postgres < 15.4.
-- On drop d'abord pour être idempotent, puis on recrée.

-- maps : chaque MJ voit/modifie ses propres cartes
drop policy if exists "maps_select_own" on public.maps;
create policy "maps_select_own" on public.maps
  for select using (auth.uid() = mj_id);

drop policy if exists "maps_insert_own" on public.maps;
create policy "maps_insert_own" on public.maps
  for insert with check (auth.uid() = mj_id);

drop policy if exists "maps_update_own" on public.maps;
create policy "maps_update_own" on public.maps
  for update using (auth.uid() = mj_id);

drop policy if exists "maps_delete_own" on public.maps;
create policy "maps_delete_own" on public.maps
  for delete using (auth.uid() = mj_id);

-- jets_de_des : lecture des jets partagés + ses propres jets, insertion / suppression sur ses propres
drop policy if exists "jets_select_partages" on public.jets_de_des;
create policy "jets_select_partages" on public.jets_de_des
  for select using (partage = true or auth.uid() = user_id);

drop policy if exists "jets_insert_own" on public.jets_de_des;
create policy "jets_insert_own" on public.jets_de_des
  for insert with check (auth.uid() = user_id);

drop policy if exists "jets_delete_own" on public.jets_de_des;
create policy "jets_delete_own" on public.jets_de_des
  for delete using (auth.uid() = user_id);

-- codes_invitation : ouvert aux utilisateurs connectés (le code lui-même est le secret)
drop policy if exists "codes_invitation_select" on public.codes_invitation;
create policy "codes_invitation_select" on public.codes_invitation
  for select using (auth.uid() is not null);

drop policy if exists "codes_invitation_insert" on public.codes_invitation;
create policy "codes_invitation_insert" on public.codes_invitation
  for insert with check (auth.uid() is not null);

drop policy if exists "codes_invitation_update" on public.codes_invitation;
create policy "codes_invitation_update" on public.codes_invitation
  for update using (auth.uid() is not null);

-- scenarios_joueurs : le joueur voit ses propres liens ; le MJ voit ceux de ses scénarios
drop policy if exists "scenarios_joueurs_select_own" on public.scenarios_joueurs;
create policy "scenarios_joueurs_select_own" on public.scenarios_joueurs
  for select using (
    auth.uid() = joueur_id
    or exists (
      select 1 from public.scenarios s
      where s.id = scenario_id and s.mj_id = auth.uid()
    )
  );

drop policy if exists "scenarios_joueurs_insert_self" on public.scenarios_joueurs;
create policy "scenarios_joueurs_insert_self" on public.scenarios_joueurs
  for insert with check (auth.uid() = joueur_id);

drop policy if exists "scenarios_joueurs_delete_self" on public.scenarios_joueurs;
create policy "scenarios_joueurs_delete_self" on public.scenarios_joueurs
  for delete using (
    auth.uid() = joueur_id
    or exists (
      select 1 from public.scenarios s
      where s.id = scenario_id and s.mj_id = auth.uid()
    )
  );


-- ----------------------------------------------------------------------------
-- 6. STORAGE : BUCKETS PUBLICS
-- ----------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values
  ('personnage', 'personnage', true),
  ('ennemie', 'ennemie', true),
  ('MAP', 'MAP', true),
  ('battle map', 'battle map', true),
  ('Items', 'Items', true)
on conflict (id) do nothing;


-- ----------------------------------------------------------------------------
-- 7. STORAGE : POLICIES (lecture publique, écriture/suppression sur son dossier)
-- ----------------------------------------------------------------------------
-- Convention : chaque utilisateur upload dans son propre dossier {uid}/xxx.jpg
-- Les policies utilisent storage.foldername(name)[1] pour extraire le dossier racine.

-- Bucket: personnage
drop policy if exists "personnage_read" on storage.objects;
create policy "personnage_read" on storage.objects
  for select using (bucket_id = 'personnage');

drop policy if exists "personnage_insert_own" on storage.objects;
create policy "personnage_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'personnage'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "personnage_delete_own" on storage.objects;
create policy "personnage_delete_own" on storage.objects
  for delete using (
    bucket_id = 'personnage'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Bucket: ennemie
drop policy if exists "ennemie_read" on storage.objects;
create policy "ennemie_read" on storage.objects
  for select using (bucket_id = 'ennemie');

drop policy if exists "ennemie_insert_own" on storage.objects;
create policy "ennemie_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'ennemie'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "ennemie_delete_own" on storage.objects;
create policy "ennemie_delete_own" on storage.objects
  for delete using (
    bucket_id = 'ennemie'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Bucket: MAP
drop policy if exists "MAP_storage_read" on storage.objects;
create policy "MAP_storage_read" on storage.objects
  for select using (bucket_id = 'MAP');

drop policy if exists "MAP_storage_insert_own" on storage.objects;
create policy "MAP_storage_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'MAP'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "MAP_storage_delete_own" on storage.objects;
create policy "MAP_storage_delete_own" on storage.objects
  for delete using (
    bucket_id = 'MAP'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Bucket: battle map
drop policy if exists "battle_map_read" on storage.objects;
create policy "battle_map_read" on storage.objects
  for select using (bucket_id = 'battle map');

drop policy if exists "battle_map_insert_own" on storage.objects;
create policy "battle_map_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'battle map'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "battle_map_delete_own" on storage.objects;
create policy "battle_map_delete_own" on storage.objects
  for delete using (
    bucket_id = 'battle map'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Bucket: Items
drop policy if exists "Items_read" on storage.objects;
create policy "Items_read" on storage.objects
  for select using (bucket_id = 'Items');

drop policy if exists "Items_insert_own" on storage.objects;
create policy "Items_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'Items'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Items_delete_own" on storage.objects;
create policy "Items_delete_own" on storage.objects
  for delete using (
    bucket_id = 'Items'
    and auth.uid()::text = (storage.foldername(name))[1]
  );


-- ============================================================================
-- Fin du setup. Vérifie dans Supabase :
-- - Database → Tables : maps, jets_de_des, codes_invitation, scenarios_joueurs existent
-- - Storage : 5 buckets (personnage, ennemie, MAP, "battle map", Items) publics
-- - Les colonnes scenario_id / personnage_id / image_url / bg_image_url sont bien là
-- ============================================================================
