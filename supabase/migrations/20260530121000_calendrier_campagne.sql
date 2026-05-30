-- ============================================================================
-- Roadmap Affinement 2.3 — Calendrier in-game personnalisable par scénario
-- ----------------------------------------------------------------------------
-- Un seul calendrier par scénario (1-1). Stocke la config (mois custom,
-- jours custom, etc.) + la date courante. Les événements vivent dans une
-- table fille.
-- ============================================================================

create table if not exists public.calendriers_campagne (
  id uuid primary key default gen_random_uuid(),
  scenario_id uuid not null unique references public.scenarios(id) on delete cascade,
  -- Config : noms des mois et jours en JSON (longueurs libres).
  mois jsonb not null default
    '[{"nom":"Hiverpierre","jours":31},{"nom":"Lunesonge","jours":28},{"nom":"Ventfleuri","jours":31},{"nom":"Solverdoie","jours":30},{"nom":"Floraison","jours":31},{"nom":"Soleilbrûlé","jours":30},{"nom":"Moissonor","jours":31},{"nom":"Foudremane","jours":31},{"nom":"Pluiesfines","jours":30},{"nom":"Brouéclat","jours":31},{"nom":"Givrelune","jours":30},{"nom":"Nuitvoile","jours":31}]'::jsonb,
  jours_semaine jsonb not null default
    '["Astrelune","Solis","Vendoria","Marlund","Pyrolis","Aelvar","Sylvain"]'::jsonb,
  saisons jsonb not null default
    '["Hiver","Printemps","Été","Automne"]'::jsonb,
  -- Date courante (1-indexed)
  annee_courante int not null default 1,
  mois_courant int not null default 1,
  jour_courant int not null default 1,
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.evenements_calendrier (
  id uuid primary key default gen_random_uuid(),
  calendrier_id uuid not null references public.calendriers_campagne(id) on delete cascade,
  annee int not null,
  mois int not null,
  jour int not null,
  titre text not null,
  description text default '',
  icone text default '⭐',
  importance int not null default 1, -- 1 = mineur, 2 = moyen, 3 = majeur
  created_at timestamptz not null default now()
);

create index if not exists evenements_calendrier_date_idx
  on public.evenements_calendrier(calendrier_id, annee, mois, jour);

-- RLS : on dérive l'accès depuis scenarios.mj_id (et permissions partagées
-- si l'utilisateur a le rôle co-mj/joueur sur le scénario — on suit la même
-- logique que les autres tables de scenarios).

alter table public.calendriers_campagne enable row level security;
alter table public.evenements_calendrier enable row level security;

drop policy if exists "calendriers_owner_all" on public.calendriers_campagne;
create policy "calendriers_owner_all" on public.calendriers_campagne
  for all using (
    exists (
      select 1 from public.scenarios s
      where s.id = calendriers_campagne.scenario_id
        and s.mj_id = auth.uid()
    )
  );

drop policy if exists "calendriers_public_select" on public.calendriers_campagne;
create policy "calendriers_public_select" on public.calendriers_campagne
  for select using (
    exists (
      select 1 from public.scenarios s
      where s.id = calendriers_campagne.scenario_id
        and (s.mj_id = auth.uid() or s.public = true)
    )
  );

drop policy if exists "evenements_via_calendrier_all" on public.evenements_calendrier;
create policy "evenements_via_calendrier_all" on public.evenements_calendrier
  for all using (
    exists (
      select 1 from public.calendriers_campagne c
      join public.scenarios s on s.id = c.scenario_id
      where c.id = evenements_calendrier.calendrier_id
        and s.mj_id = auth.uid()
    )
  );

drop policy if exists "evenements_via_calendrier_select" on public.evenements_calendrier;
create policy "evenements_via_calendrier_select" on public.evenements_calendrier
  for select using (
    exists (
      select 1 from public.calendriers_campagne c
      join public.scenarios s on s.id = c.scenario_id
      where c.id = evenements_calendrier.calendrier_id
        and (s.mj_id = auth.uid() or s.public = true)
    )
  );

-- Trigger : keep updated_at fresh
create or replace function public.touch_calendrier_updated_at() returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists tg_touch_calendrier on public.calendriers_campagne;
create trigger tg_touch_calendrier before update on public.calendriers_campagne
  for each row execute function public.touch_calendrier_updated_at();
