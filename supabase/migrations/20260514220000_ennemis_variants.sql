-- ============================================================================
-- ROADMAP 2.5 — Variants de monstres
-- ============================================================================
-- À exécuter dans le SQL Editor de Supabase (ou via `supabase db push`).
-- Idempotent.
--
-- Ajoute `variant_de` sur `ennemis` : une variante (Chef / Élite / Mage /
-- Ancien) est un ennemi indépendant qui pointe vers le monstre d'origine.
-- `on delete set null` : supprimer le parent ne supprime pas ses variantes.
-- RLS inchangée — les policies existantes de `ennemis` couvrent la colonne.
-- ============================================================================

alter table public.ennemis
  add column if not exists variant_de uuid
    references public.ennemis(id) on delete set null;

create index if not exists ennemis_variant_de_idx
  on public.ennemis(variant_de);

-- ============================================================================
-- Fin de la migration.
-- ============================================================================
