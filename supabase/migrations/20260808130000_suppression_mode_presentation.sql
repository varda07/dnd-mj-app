-- ============================================================================
-- PHASE 5 — Suppression du mode présentation (schéma)
-- ============================================================================
-- Le mode session remplace définitivement le mode présentation. Le code de
-- l'ancien mode a été supprimé (pages, composants, hooks) ; il ne reste plus
-- aucune lecture ni écriture applicative vers les tables ci-dessous.
--
-- ⚠️ MIGRATION DESTRUCTIVE — À POUSSER SCIEMMENT.
-- Elle supprime des tables et leurs données. L'application n'étant pas en
-- production et aucune compatibilité ascendante n'étant requise, c'est voulu ;
-- mais tant que cette migration n'est pas poussée, l'app fonctionne tout aussi
-- bien (les tables sont simplement orphelines). `admin_stats()` est écrite pour
-- fonctionner AVANT comme APRÈS le drop.
--
-- Sont supprimés :
--   · sessions_presentation — snapshot etat_jeu de l'écran joueurs public,
--     remplacé par session_state + /session/<id>/ecran ;
--   · historique_session    — historique adossé à sessions_presentation,
--     remplacé par session_events ;
--   · sondages_session      — sondages de l'écran joueurs, sans équivalent
--     dans le mode session (fonctionnalité retirée) ;
--   · presentation_etats    — état diffusé (lieu, narration, image, ambiance,
--     magie sauvage), remplacé par session_state.
--
-- Ne sont PAS touchés : combats, personnages, ennemis, scenarios… — le mode
-- session s'appuie dessus.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. admin_stats() — la statistique « sessions » compte désormais les vraies
--    sessions de jeu. La clé historique `sessions_diffusion` est conservée en
--    plus de la nouvelle `sessions_jeu` : l'interface lit l'une ou l'autre, la
--    migration peut donc être poussée sans redéploiement simultané.
-- ----------------------------------------------------------------------------
create or replace function public.admin_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  resultat jsonb;
  series jsonb;
  nb_sessions bigint;
begin
  if not public.est_admin() then
    raise exception 'Accès réservé aux administrateurs';
  end if;

  select jsonb_agg(jsonb_build_object('mois', to_char(m, 'YYYY-MM'), 'nb', coalesce(c, 0)) order by m)
  into series
  from (
    select date_trunc('month', d)::date as m
    from generate_series(date_trunc('month', now()) - interval '5 months', date_trunc('month', now()), interval '1 month') d
  ) months
  left join (
    select date_trunc('month', created_at)::date as cm, count(*) c
    from auth.users
    group by 1
  ) u on u.cm = months.m;

  select count(*) into nb_sessions from public.game_sessions;

  resultat := jsonb_build_object(
    'utilisateurs', (select count(*) from auth.users),
    'utilisateurs_actifs_7j', (select count(*) from auth.users where last_sign_in_at > now() - interval '7 days'),
    'utilisateurs_nouveaux_30j', (select count(*) from auth.users where created_at > now() - interval '30 days'),
    'scenarios', (select count(*) from public.scenarios),
    'personnages', (select count(*) from public.personnages),
    'ennemis', (select count(*) from public.ennemis),
    'pnj', (select count(*) from public.pnj),
    'items', (select count(*) from public.items),
    'sorts', (select count(*) from public.sorts),
    'combats', (select count(*) from public.combats),
    'sessions_jeu', nb_sessions,
    'sessions_diffusion', nb_sessions,
    'tables_effets', (select count(*) from public.tables_effets_custom),
    'serie_utilisateurs', coalesce(series, '[]'::jsonb)
  );
  return resultat;
end;
$$;


-- ----------------------------------------------------------------------------
-- 2. Retrait des tables de la publication Realtime avant suppression.
-- ----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['sondages_session', 'historique_session', 'sessions_presentation', 'presentation_etats']
  loop
    if exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime drop table public.%I', t);
    end if;
  end loop;
end $$;


-- ----------------------------------------------------------------------------
-- 3. Suppression des tables (ordre : dépendances d'abord).
-- ----------------------------------------------------------------------------
drop table if exists public.sondages_session cascade;
drop table if exists public.historique_session cascade;
drop table if exists public.sessions_presentation cascade;
drop table if exists public.presentation_etats cascade;
