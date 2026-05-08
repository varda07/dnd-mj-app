-- ============================================================================
-- Éditeur de cartes (tile editor) — vérification des prérequis
-- ============================================================================
-- À exécuter dans le SQL Editor de Supabase. Idempotent.
--
-- L'éditeur de cartes (app/dashboard/maps/editor) n'introduit aucun nouveau
-- modèle : il génère un PNG côté client puis l'uploade dans le bucket `MAP`
-- existant et insère une ligne dans la table `maps` (mêmes colonnes qu'un
-- upload classique).
--
-- Ce script s'assure simplement que le bucket `MAP` et ses policies de
-- lecture publique + écriture/suppression par le propriétaire sont en place.
-- Si tu as déjà exécuté supabase/setup.sql, ce script ne fera rien — il est
-- inclus pour être autonome si quelqu'un veut activer l'éditeur sur un
-- nouveau projet.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Bucket MAP (public en lecture)
-- ----------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('MAP', 'MAP', true)
on conflict (id) do nothing;


-- ----------------------------------------------------------------------------
-- 2. Policies storage.objects pour le bucket MAP
-- ----------------------------------------------------------------------------

drop policy if exists "MAP_storage_read" on storage.objects;
create policy "MAP_storage_read" on storage.objects
  for select using (bucket_id = 'MAP');

drop policy if exists "MAP_storage_insert_own" on storage.objects;
create policy "MAP_storage_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'MAP'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "MAP_storage_delete_own" on storage.objects;
create policy "MAP_storage_delete_own" on storage.objects
  for delete using (
    bucket_id = 'MAP'
    and (storage.foldername(name))[1] = auth.uid()::text
  );


-- ============================================================================
-- Fin de la migration. Aucun changement de schéma — l'éditeur s'appuie sur
-- la table `maps` existante (id, mj_id, nom, description, image_url, …).
-- ============================================================================
