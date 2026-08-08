'use client'

export const dynamic = 'force-dynamic'

// ============================================================================
// /session/[id]/mj — Lobby & poste de travail MJ (Phase 2.4)
// ----------------------------------------------------------------------------
// Phase 2 : salle d'attente MJ (roster attendu, qui est connecté / avec quel
// perso / prêt) + bouton « Démarrer la partie ». En statut active/paused : un
// panneau de contrôle de session (Pause/Reprendre/Terminer). Le cockpit complet
// (préparation, table, outils live) est construit en Phase 4 sur cette route.
// ============================================================================

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  fetchSession,
  fetchParticipants,
  joinSession,
  setSessionStatus,
  updateSelfParticipant,
  SETUP_LABEL,
  type GameSession,
  type SessionParticipant
} from '@/app/lib/session'
import SessionMJ from '@/app/components/session/mj/SessionMJ'

type JoueurAttendu = {
  joueur_id: string
  username: string
  personnages: Array<{ id: string; nom: string; classe: string | null; niveau: number | null }>
}

export default function LobbyMJPage() {
  const params = useParams()
  const router = useRouter()
  const id = String(params?.id ?? '')

  const [userId, setUserId] = useState<string | null>(null)
  const [session, setSession] = useState<GameSession | null>(null)
  const [attendus, setAttendus] = useState<JoueurAttendu[]>([])
  const [participants, setParticipants] = useState<SessionParticipant[]>([])
  const [enLigne, setEnLigne] = useState<Set<string>>(new Set())
  const [scenarioNom, setScenarioNom] = useState('')
  const [phase, setPhase] = useState<'loading' | 'ok' | 'refuse'>('loading')
  const [busy, setBusy] = useState(false)
  const initDone = useRef(false)

  const rafraichirParticipants = useCallback(async () => {
    setParticipants(await fetchParticipants(id))
  }, [id])

  // Init : auth, contrôle MJ, chargement roster.
  useEffect(() => {
    let annule = false
    const init = async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser()
      if (!user) {
        try {
          localStorage.setItem('pending_return_url', `/session/${id}/mj`)
        } catch {}
        router.replace('/')
        return
      }
      setUserId(user.id)
      const sess = await fetchSession(id)
      if (annule) return
      if (!sess || sess.mj_user_id !== user.id) {
        setPhase('refuse')
        return
      }
      setSession(sess)
      await joinSession(id) // garantit la ligne participant MJ (idempotent)

      const { data: scn } = await supabase
        .from('scenarios')
        .select('nom')
        .eq('id', sess.scenario_id)
        .maybeSingle()
      if (!annule) setScenarioNom((scn?.nom as string) ?? '')

      const { data: ros } = await supabase.rpc('joueurs_du_scenario', {
        p_scenario_id: sess.scenario_id
      })
      const r = ros as { ok: boolean; joueurs?: JoueurAttendu[] } | null
      if (!annule && r?.ok) setAttendus(r.joueurs ?? [])

      await rafraichirParticipants()
      if (!annule) setPhase('ok')
    }
    if (!initDone.current) {
      initDone.current = true
      void init()
    }
    return () => {
      annule = true
    }
  }, [id, router, rafraichirParticipants])

  // Realtime : participants + statut de session.
  useEffect(() => {
    if (phase !== 'ok') return
    const channel = supabase
      .channel(`session-mj:${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'session_participants', filter: `session_id=eq.${id}` },
        () => void rafraichirParticipants()
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'game_sessions', filter: `id=eq.${id}` },
        (payload) => setSession((s) => (s ? { ...s, ...(payload.new as GameSession) } : s))
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [id, phase, rafraichirParticipants])

  // Présence : qui est connecté en temps réel.
  useEffect(() => {
    if (phase !== 'ok' || !userId) return
    const channel = supabase.channel(`session-presence:${id}`, {
      config: { presence: { key: userId } }
    })
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        setEnLigne(new Set(Object.keys(state)))
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ role: 'mj', at: new Date().toISOString() })
        }
      })
    return () => {
      supabase.removeChannel(channel)
    }
  }, [id, phase, userId])

  const demarrer = async () => {
    setBusy(true)
    await setSessionStatus(id, 'active')
    setBusy(false)
  }
  const changerStatut = async (statut: GameSession['status']) => {
    setBusy(true)
    if (statut === 'ended') {
      await updateSelfParticipant(id, userId ?? '', { is_connected: false })
    }
    await setSessionStatus(id, statut)
    setBusy(false)
    if (statut === 'ended') router.replace('/dashboard/scenarios')
  }

  if (phase === 'loading') {
    return (
      <Shell>
        <p className="text-stone-400 text-sm italic">Chargement du lobby…</p>
      </Shell>
    )
  }
  if (phase === 'refuse') {
    return (
      <Shell>
        <p className="text-red-300 text-sm">
          Cette session n'existe pas ou tu n'en es pas le MJ.
        </p>
        <button
          type="button"
          onClick={() => router.push('/dashboard/scenarios')}
          className="mt-4 px-4 py-2 rounded-lg font-bold border border-yellow-700/50 text-yellow-200"
        >
          Retour aux scénarios
        </button>
      </Shell>
    )
  }

  // Partie lancée → cockpit MJ complet (Phase 4).
  if (session && (session.status === 'active' || session.status === 'paused')) {
    return (
      <SessionMJ
        sessionId={id}
        scenarioId={session.scenario_id}
        session={session}
        scenarioNom={scenarioNom}
      />
    )
  }

  // Croise roster attendu ↔ participants réels.
  const byUser = new Map(participants.map((p) => [p.user_id, p]))
  const rows = attendus.map((j) => {
    const p = byUser.get(j.joueur_id)
    const perso = p?.character_id
      ? j.personnages.find((x) => x.id === p.character_id) ?? null
      : null
    return {
      joueur_id: j.joueur_id,
      username: j.username,
      aRejoint: !!p,
      connecte: enLigne.has(j.joueur_id),
      pret: p?.is_ready ?? false,
      persoNom: perso?.nom ?? null
    }
  })
  const nbConnectes = rows.filter((r) => r.connecte).length

  return (
    <Shell>
      <div className="w-full max-w-2xl">
        <header className="text-center mb-5">
          <p className="text-stone-500 text-xs uppercase tracking-[0.25em]">
            {statutLabel(session?.status)}
          </p>
          <h1
            className="text-2xl font-bold mt-1"
            style={{ color: '#C9A84C', fontFamily: 'Georgia, serif' }}
          >
            {session?.title || `Session — ${scenarioNom}`}
          </h1>
          <p className="text-stone-400 text-sm mt-1">
            {scenarioNom}
            {session?.setup_mode ? ` · ${SETUP_LABEL[session.setup_mode]}` : ''}
          </p>
        </header>

        <div
          className="rounded-2xl border p-4"
          style={{ background: '#15110a', borderColor: 'rgba(201,168,76,0.35)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold uppercase tracking-widest text-[#C9A84C]">
              Joueurs ({nbConnectes}/{attendus.length} en ligne)
            </h2>
          </div>

          {attendus.length === 0 ? (
            <p className="text-stone-500 text-sm italic py-4 text-center">
              Aucun joueur inscrit à ce scénario. Invite des joueurs depuis la
              fiche du scénario — ils recevront une notification.
            </p>
          ) : (
            <ul className="space-y-2">
              {rows.map((r) => (
                <li
                  key={r.joueur_id}
                  className="flex items-center gap-3 rounded-lg border px-3 py-2"
                  style={{
                    borderColor: 'rgba(201,168,76,0.15)',
                    background: 'rgba(0,0,0,0.25)'
                  }}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ background: r.connecte ? '#22c55e' : '#57534e' }}
                    title={r.connecte ? 'En ligne' : 'Hors ligne'}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-yellow-100 font-bold text-sm truncate">
                      {r.username}
                    </p>
                    <p className="text-stone-400 text-xs truncate">
                      {r.persoNom
                        ? `🎭 ${r.persoNom}`
                        : r.aRejoint
                        ? 'Sans personnage'
                        : 'Pas encore connecté'}
                    </p>
                  </div>
                  {r.pret ? (
                    <span className="text-green-400 text-xs font-bold flex-shrink-0">
                      ✓ Prêt
                    </span>
                  ) : r.aRejoint ? (
                    <span className="text-stone-500 text-xs flex-shrink-0">
                      En attente
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Contrôles selon le statut */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {session?.status === 'lobby' && (
            <button
              type="button"
              onClick={demarrer}
              disabled={busy}
              className="px-6 py-3 rounded-lg font-bold text-gray-900 bg-[#C9A84C] hover:brightness-110 disabled:opacity-60"
            >
              ▶ Démarrer la partie
            </button>
          )}
          {session?.status === 'active' && (
            <>
              <div
                className="w-full text-center rounded-lg border px-3 py-2 mb-1"
                style={{ borderColor: 'rgba(34,197,94,0.4)', background: 'rgba(34,197,94,0.08)' }}
              >
                <p className="text-green-300 text-sm font-bold">🟢 Partie en cours</p>
                <p className="text-stone-400 text-xs">
                  Le cockpit MJ complet (préparation, table, outils live, combat)
                  arrive en Phase 4.
                </p>
              </div>
              <button
                type="button"
                onClick={() => changerStatut('paused')}
                disabled={busy}
                className="px-4 py-2.5 rounded-lg font-bold border border-yellow-700/50 text-yellow-200 disabled:opacity-60"
              >
                ⏸ Pause
              </button>
            </>
          )}
          {session?.status === 'paused' && (
            <button
              type="button"
              onClick={() => changerStatut('active')}
              disabled={busy}
              className="px-4 py-2.5 rounded-lg font-bold text-gray-900 bg-[#C9A84C] hover:brightness-110 disabled:opacity-60"
            >
              ▶ Reprendre
            </button>
          )}
          {(session?.status === 'active' || session?.status === 'paused') && (
            <button
              type="button"
              onClick={() => {
                if (confirm('Terminer la session pour tout le monde ?')) {
                  void changerStatut('ended')
                }
              }}
              disabled={busy}
              className="px-4 py-2.5 rounded-lg font-bold border border-red-800/60 text-red-300 hover:bg-red-900/20 disabled:opacity-60"
            >
              ■ Terminer la session
            </button>
          )}
          {session?.status === 'lobby' && (
            <button
              type="button"
              onClick={() => {
                if (confirm('Annuler la session ?')) void changerStatut('ended')
              }}
              disabled={busy}
              className="px-4 py-2.5 rounded-lg font-bold border border-stone-700 text-stone-400 hover:text-stone-200 disabled:opacity-60"
            >
              Annuler
            </button>
          )}
        </div>
      </div>
    </Shell>
  )
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ background: '#0e0b06' }}
    >
      {children}
    </main>
  )
}

function statutLabel(s?: GameSession['status']): string {
  switch (s) {
    case 'lobby':
      return "Salle d'attente"
    case 'active':
      return 'En session'
    case 'paused':
      return 'Session en pause'
    case 'ended':
      return 'Session terminée'
    default:
      return 'Session'
  }
}
