-- ============================================================================
-- Roadmap Affinement 2.5 — Auto-roll d'attaques d'ennemis
-- ----------------------------------------------------------------------------
-- Ajoute une colonne `attaques jsonb` à la table `ennemis` pour stocker les
-- attaques structurées (nom, bonus, dégâts, type, portée, multiattack…).
-- Format : [{ "nom": "Cimeterre", "bonus_attaque": 4, "degats": "1d6+2",
--             "type_degats": "tranchant", "portee": "1,50 m", "nb": 1 }, ...]
-- ============================================================================

alter table public.ennemis
  add column if not exists attaques jsonb not null default '[]'::jsonb;

-- Idem côté pnj pour les PNJ statués
alter table public.pnj
  add column if not exists attaques jsonb not null default '[]'::jsonb;

-- Index gin pour des recherches éventuelles
create index if not exists ennemis_attaques_gin on public.ennemis using gin (attaques);
create index if not exists pnj_attaques_gin on public.pnj using gin (attaques);
