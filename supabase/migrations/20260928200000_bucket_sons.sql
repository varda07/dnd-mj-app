-- ============================================================================
-- Bucket Storage « sons » — comble la seule dépendance de stockage encore
-- créée à la main dans le dashboard Supabase.
-- ----------------------------------------------------------------------------
-- Contexte : la table `public.sons_user` est versionnée depuis
-- 20260531101000_sons_user.sql, mais ce fichier se terminait par une note :
--
--     « Note : si tu veux uploader des fichiers, crée aussi un bucket Storage
--       "sons" (public read, write authenticated) via le dashboard Supabase. »
--
-- Un déploiement neuf depuis `supabase/migrations/` n'avait donc pas ce bucket :
-- l'upload de /dashboard/sons échouait (le code affiche d'ailleurs le message
-- « Crée le bucket 'sons' dans Supabase Storage (public read) »).
--
-- Conventions reprises à l'identique des buckets existants
-- (cf. 20260512003600_setup.sql § 6 et § 7) :
--   · bucket public en lecture ;
--   · écriture et suppression réservées au propriétaire, identifié par le
--     premier segment du chemin — l'app upload sur `{auth.uid()}/{timestamp}.{ext}`
--     (app/dashboard/sons/page.tsx).
--
-- Idempotent : `on conflict do nothing` + `drop policy if exists`. Rejouer ce
-- fichier sur une base où le bucket a déjà été créé à la main ne change rien.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Le bucket
-- ----------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('sons', 'sons', true)
on conflict (id) do nothing;


-- ----------------------------------------------------------------------------
-- 2. Policies storage.objects pour le bucket « sons »
-- ----------------------------------------------------------------------------

-- Lecture publique : les joueurs doivent pouvoir jouer l'ambiance diffusée par
-- le MJ sans être propriétaires du fichier.
drop policy if exists "sons_read" on storage.objects;
create policy "sons_read" on storage.objects
  for select using (bucket_id = 'sons');

drop policy if exists "sons_insert_own" on storage.objects;
create policy "sons_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'sons'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "sons_update_own" on storage.objects;
create policy "sons_update_own" on storage.objects
  for update using (
    bucket_id = 'sons'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "sons_delete_own" on storage.objects;
create policy "sons_delete_own" on storage.objects
  for delete using (
    bucket_id = 'sons'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
