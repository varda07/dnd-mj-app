-- ============================================================================
-- Roadmap Affinement 2.2 — Templates PNJ/Ennemis personnels
-- ----------------------------------------------------------------------------
-- Permet à un utilisateur de sauvegarder des PNJ/ennemis comme templates
-- réutilisables (snapshot complet en jsonb).
-- ============================================================================

create table if not exists public.templates_pnj (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nom text not null,
  contenu jsonb not null,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists templates_pnj_user_idx on public.templates_pnj(user_id, created_at desc);

create table if not exists public.templates_ennemis (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nom text not null,
  contenu jsonb not null,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists templates_ennemis_user_idx on public.templates_ennemis(user_id, created_at desc);

-- RLS
alter table public.templates_pnj enable row level security;
alter table public.templates_ennemis enable row level security;

drop policy if exists "templates_pnj_owner_select" on public.templates_pnj;
create policy "templates_pnj_owner_select" on public.templates_pnj
  for select using (auth.uid() = user_id);
drop policy if exists "templates_pnj_owner_insert" on public.templates_pnj;
create policy "templates_pnj_owner_insert" on public.templates_pnj
  for insert with check (auth.uid() = user_id);
drop policy if exists "templates_pnj_owner_update" on public.templates_pnj;
create policy "templates_pnj_owner_update" on public.templates_pnj
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "templates_pnj_owner_delete" on public.templates_pnj;
create policy "templates_pnj_owner_delete" on public.templates_pnj
  for delete using (auth.uid() = user_id);

drop policy if exists "templates_ennemis_owner_select" on public.templates_ennemis;
create policy "templates_ennemis_owner_select" on public.templates_ennemis
  for select using (auth.uid() = user_id);
drop policy if exists "templates_ennemis_owner_insert" on public.templates_ennemis;
create policy "templates_ennemis_owner_insert" on public.templates_ennemis
  for insert with check (auth.uid() = user_id);
drop policy if exists "templates_ennemis_owner_update" on public.templates_ennemis;
create policy "templates_ennemis_owner_update" on public.templates_ennemis
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "templates_ennemis_owner_delete" on public.templates_ennemis;
create policy "templates_ennemis_owner_delete" on public.templates_ennemis
  for delete using (auth.uid() = user_id);
