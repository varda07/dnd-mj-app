-- ============================================================================
-- Notifications — activation Realtime (Fix bug "notifications ne fonctionnent
-- pas") + helper RPC pour traitement côté serveur si besoin.
-- ============================================================================
-- Pourquoi : la table `notifications` (créée par 20260515060000_roadmap_phase10)
-- n'était PAS publiée sur la publication `supabase_realtime`. Résultat :
-- la cloche du NotificationCenter ne recevait jamais d'événement temps réel
-- et ne se rafraîchissait qu'au poll (toutes les 60s avant ce fix).
-- ============================================================================

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    execute 'alter publication supabase_realtime add table public.notifications';
  end if;
end $$;

-- Pour les lignes envoyées par realtime : on doit déclarer REPLICA IDENTITY
-- afin que les events `UPDATE`/`DELETE` portent assez d'info pour matcher
-- le filtre `user_id=eq.X`. Par défaut, REPLICA IDENTITY = DEFAULT (= clé
-- primaire). On passe à FULL pour être sûr d'avoir `user_id` dans le payload
-- des UPDATE/DELETE (sinon les abonnés filtrés ne reçoivent rien sur ces
-- événements).
alter table public.notifications replica identity full;
