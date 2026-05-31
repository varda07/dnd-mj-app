-- ============================================================================
-- Roadmap Modes 1.4 + 1.5 — Historique de session + sondages rapides
-- ----------------------------------------------------------------------------
-- Liées à sessions_presentation. Lecture publique (le snapshot etat_jeu est
-- public, l'historique l'est tout autant). Écriture limitée au MJ propriétaire
-- de la session.
-- ============================================================================

-- 1.4 — Historique de session
create table if not exists public.historique_session (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions_presentation(id) on delete cascade,
  type text not null,                  -- 'combat' | 'crit' | 'mort' | 'lieu' | 'loot' | 'note' | 'sondage' | 'autre'
  description text not null,
  metadonnees jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists historique_session_session_idx
  on public.historique_session(session_id, created_at desc);
create index if not exists historique_session_type_idx
  on public.historique_session(session_id, type);

alter table public.historique_session enable row level security;

drop policy if exists "historique_select_public" on public.historique_session;
create policy "historique_select_public" on public.historique_session
  for select using (true);

drop policy if exists "historique_insert_mj" on public.historique_session;
create policy "historique_insert_mj" on public.historique_session
  for insert to authenticated with check (
    exists (
      select 1 from public.sessions_presentation s
      where s.id = historique_session.session_id and s.mj_id = auth.uid()
    )
  );

drop policy if exists "historique_delete_mj" on public.historique_session;
create policy "historique_delete_mj" on public.historique_session
  for delete to authenticated using (
    exists (
      select 1 from public.sessions_presentation s
      where s.id = historique_session.session_id and s.mj_id = auth.uid()
    )
  );

-- Realtime
do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public'
      and tablename = 'historique_session'
  ) then
    execute 'alter publication supabase_realtime add table public.historique_session';
  end if;
end $$;


-- 1.5 — Sondages session
create table if not exists public.sondages_session (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions_presentation(id) on delete cascade,
  question text not null,
  options jsonb not null default '[]'::jsonb, -- [{ "id": "a", "label": "Option A" }, ...]
  actif boolean not null default true,
  resultats_pousses boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists sondages_session_session_idx
  on public.sondages_session(session_id, created_at desc);

alter table public.sondages_session enable row level security;

drop policy if exists "sondages_select_public" on public.sondages_session;
create policy "sondages_select_public" on public.sondages_session
  for select using (true);

drop policy if exists "sondages_insert_mj" on public.sondages_session;
create policy "sondages_insert_mj" on public.sondages_session
  for insert to authenticated with check (
    exists (
      select 1 from public.sessions_presentation s
      where s.id = sondages_session.session_id and s.mj_id = auth.uid()
    )
  );

drop policy if exists "sondages_update_mj" on public.sondages_session;
create policy "sondages_update_mj" on public.sondages_session
  for update to authenticated
  using (
    exists (
      select 1 from public.sessions_presentation s
      where s.id = sondages_session.session_id and s.mj_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.sessions_presentation s
      where s.id = sondages_session.session_id and s.mj_id = auth.uid()
    )
  );

drop policy if exists "sondages_delete_mj" on public.sondages_session;
create policy "sondages_delete_mj" on public.sondages_session
  for delete to authenticated using (
    exists (
      select 1 from public.sessions_presentation s
      where s.id = sondages_session.session_id and s.mj_id = auth.uid()
    )
  );


-- Votes (publics — pas d'auth requise pour voter ; on dédup par voter_key
-- généré côté client + persisté en localStorage).
create table if not exists public.votes_sondages (
  id uuid primary key default gen_random_uuid(),
  sondage_id uuid not null references public.sondages_session(id) on delete cascade,
  option_id text not null,
  voter_key text not null,
  voter_name text,
  created_at timestamptz not null default now(),
  unique (sondage_id, voter_key)
);
create index if not exists votes_sondages_sondage_idx
  on public.votes_sondages(sondage_id);

alter table public.votes_sondages enable row level security;

drop policy if exists "votes_select_public" on public.votes_sondages;
create policy "votes_select_public" on public.votes_sondages
  for select using (true);

-- Insertion publique (anon) sur les sondages actifs
drop policy if exists "votes_insert_public" on public.votes_sondages;
create policy "votes_insert_public" on public.votes_sondages
  for insert with check (
    exists (
      select 1 from public.sondages_session sd
      where sd.id = votes_sondages.sondage_id and sd.actif = true
    )
  );

-- Realtime
do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public'
      and tablename = 'sondages_session'
  ) then
    execute 'alter publication supabase_realtime add table public.sondages_session';
  end if;
end $$;
do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public'
      and tablename = 'votes_sondages'
  ) then
    execute 'alter publication supabase_realtime add table public.votes_sondages';
  end if;
end $$;
