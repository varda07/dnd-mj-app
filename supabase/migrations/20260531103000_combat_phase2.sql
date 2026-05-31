-- ============================================================================
-- Roadmap Modes 2.7 + 2.11 + 2.9 — Combat enrichi
-- ----------------------------------------------------------------------------
-- 2.7  : ennemis.boss boolean (pour la séquence "mort dramatique")
-- 2.11 : combats.en_pause boolean (sauvegarde/reprise de combat)
-- 2.9  : combats_evenements (historique chronologique des actions de combat)
-- ============================================================================

-- 2.7 — Boss flag
alter table public.ennemis
  add column if not exists boss boolean not null default false;

-- 2.11 — Pause / reprise
alter table public.combats
  add column if not exists en_pause boolean not null default false,
  add column if not exists pause_a timestamptz;

-- 2.9 — Historique de combat
create table if not exists public.combats_evenements (
  id uuid primary key default gen_random_uuid(),
  combat_id uuid not null references public.combats(id) on delete cascade,
  round integer not null default 1,
  type text not null, -- 'attaque' | 'sort' | 'condition' | 'mort' | 'soin' | 'note'
  description text not null,
  acteur_nom text,
  cible_nom text,
  degats integer,
  metadonnees jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists combats_evenements_combat_idx
  on public.combats_evenements(combat_id, created_at desc);

alter table public.combats_evenements enable row level security;

-- RLS : accès via combats → scenarios.mj_id
drop policy if exists "combat_evt_mj_all" on public.combats_evenements;
create policy "combat_evt_mj_all" on public.combats_evenements
  for all using (
    exists (
      select 1 from public.combats c
      join public.scenarios s on s.id = c.scenario_id
      where c.id = combats_evenements.combat_id and s.mj_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.combats c
      join public.scenarios s on s.id = c.scenario_id
      where c.id = combats_evenements.combat_id and s.mj_id = auth.uid()
    )
  );

-- Realtime
do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public'
      and tablename = 'combats_evenements'
  ) then
    execute 'alter publication supabase_realtime add table public.combats_evenements';
  end if;
end $$;
