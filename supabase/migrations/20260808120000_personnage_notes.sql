-- ============================================================================
-- MODE SESSION — Notes personnelles du joueur (delta interfaces, menu « Notes »)
-- ============================================================================
-- Le menu Notes de la roue joueur stockait ses notes en localStorage : perdues
-- au changement d'appareil et au vidage du cache. On les persiste en base.
--
-- Choix du modèle : une TABLE dédiée, pas une colonne sur `personnages`.
--   · `personnages` est lisible par le MJ (fn_is_mj_of_personnage) — une colonne
--     y serait donc visible du MJ, ce qui contredit « notes privées » ;
--   · `character_live_state` est indexé par session : les notes doivent survivre
--     d'une séance à l'autre, elles appartiennent au personnage, pas à la séance.
--
-- Clé primaire (personnage_id, user_id) : chaque utilisateur a SA ligne de notes
-- sur un personnage donné, et ne voit jamais celle d'un autre — MJ inclus.
--
-- 100 % idempotent.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- Helper touch updated_at (idempotent : identique aux migrations mode session).
-- ----------------------------------------------------------------------------
create or replace function public.mode_session_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;


-- ----------------------------------------------------------------------------
-- Table personnage_notes
-- ----------------------------------------------------------------------------
create table if not exists public.personnage_notes (
  personnage_id uuid not null references public.personnages(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  contenu       text not null default '',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  primary key (personnage_id, user_id)
);

create index if not exists personnage_notes_user_idx
  on public.personnage_notes(user_id);

drop trigger if exists trg_personnage_notes_touch on public.personnage_notes;
create trigger trg_personnage_notes_touch
  before update on public.personnage_notes
  for each row execute function public.mode_session_touch_updated_at();


-- ----------------------------------------------------------------------------
-- RLS — notes PRIVÉES : uniquement leur auteur, personne d'autre.
-- ----------------------------------------------------------------------------
-- Volontairement AUCUN appel à fn_owns_personnage / fn_is_mj_of_personnage :
-- ni le MJ du scénario, ni un autre joueur ne doivent pouvoir lire ces lignes.
-- Le seul critère est l'identité de l'auteur.
alter table public.personnage_notes enable row level security;

drop policy if exists personnage_notes_select on public.personnage_notes;
create policy personnage_notes_select on public.personnage_notes
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists personnage_notes_insert on public.personnage_notes;
create policy personnage_notes_insert on public.personnage_notes
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists personnage_notes_update on public.personnage_notes;
create policy personnage_notes_update on public.personnage_notes
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists personnage_notes_delete on public.personnage_notes;
create policy personnage_notes_delete on public.personnage_notes
  for delete to authenticated
  using (user_id = auth.uid());


-- ----------------------------------------------------------------------------
-- Realtime — synchro entre les appareils d'un MÊME joueur (téléphone ↔ PC).
-- ----------------------------------------------------------------------------
-- La RLS ci-dessus s'applique aussi aux `postgres_changes` : un autre
-- utilisateur abonné à la table ne recevra jamais ces lignes.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'personnage_notes'
  ) then
    alter publication supabase_realtime add table public.personnage_notes;
  end if;
end $$;

alter table public.personnage_notes replica identity full;
