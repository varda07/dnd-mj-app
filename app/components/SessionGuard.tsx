'use client'

import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

// ============================================================================
// SessionGuard — V1 1.1 : évite la « perte de données » multi-onglets.
// ----------------------------------------------------------------------------
// Problème : Supabase stocke la session dans localStorage (clé partagée par
// tous les onglets du même navigateur). Si l'utilisateur se connecte avec un
// AUTRE compte dans un second onglet, le localStorage est écrasé. Le premier
// onglet garde alors en mémoire l'ancien compte mais, au prochain refresh de
// token, bascule silencieusement sur le nouveau → les requêtes échouent et
// l'écran paraît « vide », ce qui est très anxiogène (les données ne sont pas
// perdues, juste invisibles tant qu'on ne recharge pas).
//
// Solution : on surveille les changements d'identité de session. Dès que le
// compte connecté change (ou disparaît) sous l'onglet, on resynchronise
// proprement plutôt que de laisser l'UI dans un état cassé/vide :
//   - compte changé          → reload (l'onglet affiche le bon compte)
//   - déconnexion (SIGNED_OUT) → retour à l'accueil
//
// L'isolation de DEUX comptes réellement simultanés dans le même navigateur
// n'est pas possible avec un stockage localStorage partagé (limite navigateur).
// On garantit en revanche qu'aucune donnée n'« disparaît » visuellement : le
// dernier compte connecté est toujours affiché correctement.
// ============================================================================
export default function SessionGuard() {
  // undefined = pas encore initialisé ; null = déconnecté ; string = user.id
  const userIdRef = useRef<string | null | undefined>(undefined)

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      const newId = session?.user?.id ?? null

      // Premier événement (INITIAL_SESSION) : on mémorise la base, sans agir.
      if (userIdRef.current === undefined) {
        userIdRef.current = newId
        return
      }

      // Même compte (TOKEN_REFRESHED, USER_UPDATED…) : rien à faire.
      if (newId === userIdRef.current) return

      if (newId === null || event === 'SIGNED_OUT') {
        // Déconnexion déclenchée ici ou dans un autre onglet.
        userIdRef.current = null
        window.location.href = '/'
        return
      }

      // Le compte connecté a changé (login d'un autre compte ailleurs) :
      // on recharge pour refléter le compte réellement actif.
      userIdRef.current = newId
      window.location.reload()
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  return null
}
