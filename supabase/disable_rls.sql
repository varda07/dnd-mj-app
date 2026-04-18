-- ============================================================================
-- Désactivation temporaire RLS sur scenarios, personnages, ennemis, items, sorts
-- ============================================================================
-- À exécuter dans le SQL Editor de Supabase.
--
-- ⚠ Temporaire : la sécurité repose sur les filtres côté client
-- (.eq('mj_id', user.id) / .eq('joueur_id', user.id)) déjà en place dans
-- l'app. À ne PAS laisser en prod sur une app publique — un utilisateur
-- malveillant avec la clé anon peut contourner les filtres client et lire
-- toute la base via SQL direct.
--
-- Les policies existantes restent définies (non droppées) mais ne s'appliquent
-- plus tant que RLS est désactivée. Pour réactiver : `enable row level security`.
-- ============================================================================

alter table public.scenarios disable row level security;
alter table public.personnages disable row level security;
alter table public.ennemis disable row level security;
alter table public.items disable row level security;
alter table public.sorts disable row level security;
