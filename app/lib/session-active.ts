'use client'

// ============================================================================
// Session en cours — détection pour la navigation (Phase 5)
// ----------------------------------------------------------------------------
// Le mode session remplace le mode diffusion : il faut pouvoir y retourner d'un
// clic depuis n'importe où, MJ comme joueur. Ce module répond à une seule
// question : « y a-t-il une session ouverte qui me concerne, et où dois-je
// aller ? ».
//
// La RLS de `game_sessions` fait déjà le tri (MJ de la session OU membre du
// scénario) : une simple lecture suffit, sans RPC dédiée. Le rôle se déduit de
// `mj_user_id`, et la route en découle.
// ============================================================================

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ouvrirCanal } from '@/app/lib/session-realtime'

export type SessionActive = {
  sessionId: string
  scenarioId: string
  titre: string
  statut: 'lobby' | 'active' | 'paused'
  role: 'mj' | 'joueur'
  href: string
}

type Ligne = {
  id: string
  scenario_id: string
  title: string | null
  status: 'lobby' | 'active' | 'paused' | 'ended'
  mj_user_id: string
  scenarios: { nom: string } | { nom: string }[] | null
}

function versSessionActive(l: Ligne, userId: string): SessionActive {
  const scn = Array.isArray(l.scenarios) ? l.scenarios[0] : l.scenarios
  const role: 'mj' | 'joueur' = l.mj_user_id === userId ? 'mj' : 'joueur'
  return {
    sessionId: l.id,
    scenarioId: l.scenario_id,
    titre: l.title || scn?.nom || 'Session',
    statut: l.status as SessionActive['statut'],
    role,
    // Côté joueur, la page /joueur renvoie elle-même vers /rejoindre si le
    // joueur n'est pas encore participant : une seule route à connaître ici.
    href: role === 'mj' ? `/session/${l.id}/mj` : `/session/${l.id}/joueur`
  }
}

/**
 * La session ouverte la plus récente qui me concerne, éventuellement restreinte
 * à un scénario donné. `null` si aucune.
 */
export async function fetchSessionActive(scenarioId?: string | null): Promise<SessionActive | null> {
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) return null

  let requete = supabase
    .from('game_sessions')
    .select('id, scenario_id, title, status, mj_user_id, scenarios(nom)')
    .in('status', ['lobby', 'active', 'paused'])
    .order('created_at', { ascending: false })
    .limit(1)
  if (scenarioId) requete = requete.eq('scenario_id', scenarioId)

  const { data } = await requete
  const ligne = ((data ?? []) as Ligne[])[0]
  return ligne ? versSessionActive(ligne, user.id) : null
}

/**
 * Route à suivre pour « passer ce combat côté joueurs » : la session ouverte du
 * scénario si elle existe, sinon la liste des scénarios — c'est de là qu'on
 * lance une session (bouton « Lancer la session »). On n'ouvre JAMAIS une
 * session en douce : `start_session` notifie tous les joueurs du scénario, ce
 * serait un effet de bord inattendu depuis un écran de combat.
 */
export async function routeSession(scenarioId?: string | null): Promise<string> {
  const s = await fetchSessionActive(scenarioId)
  return s ? s.href : '/dashboard/scenarios'
}

/** Même chose, tenue à jour en temps réel (entrée de navigation permanente). */
export function useSessionActive(): SessionActive | null {
  const [session, setSession] = useState<SessionActive | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  const charger = useCallback(async () => {
    setSession(await fetchSessionActive())
  }, [])

  useEffect(() => {
    let annule = false
    supabase.auth.getUser().then(({ data }) => {
      if (annule) return
      const uid = data.user?.id ?? null
      setUserId(uid)
      if (uid) void charger()
    })
    return () => {
      annule = true
    }
  }, [charger])

  useEffect(() => {
    if (!userId) return
    return ouvrirCanal(`session-active:${userId}`, (c) =>
      c.on('postgres_changes', { event: '*', schema: 'public', table: 'game_sessions' }, () =>
        void charger()
      )
    )
  }, [userId, charger])

  return session
}
