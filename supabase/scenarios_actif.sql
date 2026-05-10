-- ============================================================================
-- Scénario actif : un seul scénario peut être marqué "actif" par MJ
-- ============================================================================
-- À exécuter dans le SQL Editor de Supabase. Idempotent.
-- Utilisé par le dashboard pour afficher la bannière contextuelle et router
-- les raccourcis vers le bon scénario.
-- ============================================================================

alter table public.scenarios
  add column if not exists actif boolean not null default false;

create index if not exists scenarios_actif_idx
  on public.scenarios(mj_id)
  where actif = true;
