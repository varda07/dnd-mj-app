'use client'

// ============================================================================
// SessionMJ — cockpit MJ en partie (Phase 4)
// ----------------------------------------------------------------------------
// 3 panneaux : Ma préparation · Ma table · Outils live. En-tête compact avec
// contrôles de session (Pause/Reprendre/Terminer) + accès à l'écran partagé TV.
// Réutilise combat-engine, CombatCockpitMJ, ActionWheelMJ, ElementsScenarioPanel.
// ============================================================================

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { setSessionStatus, SETUP_LABEL, type GameSession } from '@/app/lib/session'
import { fetchSessionState, patchSessionState, type SessionState } from '@/app/lib/session-live'
import { ouvrirCanal } from '@/app/lib/session-realtime'
import PanneauPreparation from './PanneauPreparation'
import PanneauTable from './PanneauTable'
import PanneauOutils from './PanneauOutils'

type PanKey = 'prep' | 'table' | 'outils'
const PANS: { key: PanKey; label: string; icon: string }[] = [
  { key: 'prep', label: 'Ma préparation', icon: '📚' },
  { key: 'table', label: 'Ma table', icon: '🧑‍🤝‍🧑' },
  { key: 'outils', label: 'Outils live', icon: '🎛️' }
]

export default function SessionMJ({
  sessionId,
  scenarioId,
  session,
  scenarioNom
}: {
  sessionId: string
  scenarioId: string
  session: GameSession
  scenarioNom: string
}) {
  const router = useRouter()
  const [pan, setPan] = useState<PanKey>('table')
  const [etat, setEtat] = useState<SessionState | null>(null)
  const [statut, setStatut] = useState<GameSession['status']>(session.status)
  const [busy, setBusy] = useState(false)

  const rechargerEtat = useCallback(async () => {
    setEtat(await fetchSessionState(sessionId))
  }, [sessionId])

  useEffect(() => {
    void rechargerEtat()
    return ouvrirCanal(`session-mj-state:${sessionId}`, (c) =>
      c
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'session_state', filter: `session_id=eq.${sessionId}` },
          () => void rechargerEtat()
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'game_sessions', filter: `id=eq.${sessionId}` },
          (payload) => setStatut((payload.new as GameSession).status)
        )
    )
  }, [sessionId, rechargerEtat])

  const patchState = useCallback(
    async (patch: Partial<SessionState>) => {
      setEtat((e) => (e ? { ...e, ...patch } : e))
      await patchSessionState(sessionId, patch)
    },
    [sessionId]
  )

  const changerStatut = async (s: GameSession['status']) => {
    setBusy(true)
    setStatut(s)
    await setSessionStatus(sessionId, s)
    setBusy(false)
    if (s === 'ended') router.replace('/dashboard/scenarios')
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0e0b06' }}>
      {/* En-tête */}
      <header className="sticky top-0 z-30 px-3 py-2 border-b backdrop-blur"
        style={{ borderColor: 'rgba(201,168,76,0.25)', background: 'rgba(14,11,6,0.92)' }}>
        <div className="max-w-6xl mx-auto flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-[0.2em] text-yellow-600 leading-none">
              {statut === 'paused' ? 'En pause' : 'En session'} · MJ
              {session.setup_mode ? ` · ${SETUP_LABEL[session.setup_mode]}` : ''}
            </p>
            <h1 className="text-lg font-bold truncate" style={{ color: '#C9A84C', fontFamily: 'Georgia, serif' }}>
              {session.title || scenarioNom}
            </h1>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {(session.setup_mode === 'pc-tv') && (
              <a href={`/session/${sessionId}/ecran`} target="_blank" rel="noopener noreferrer"
                className="px-2.5 py-1.5 rounded-lg border border-yellow-800/40 text-yellow-200 text-xs font-bold">
                📺 Écran TV
              </a>
            )}
            {statut === 'active' ? (
              <button type="button" disabled={busy} onClick={() => changerStatut('paused')}
                className="px-2.5 py-1.5 rounded-lg border border-yellow-700/50 text-yellow-200 text-xs font-bold disabled:opacity-50">
                ⏸ Pause
              </button>
            ) : (
              <button type="button" disabled={busy} onClick={() => changerStatut('active')}
                className="px-2.5 py-1.5 rounded-lg text-gray-900 bg-[#C9A84C] text-xs font-bold disabled:opacity-50">
                ▶ Reprendre
              </button>
            )}
            <button type="button" disabled={busy}
              onClick={() => { if (confirm('Terminer la session pour tout le monde ?')) void changerStatut('ended') }}
              className="px-2.5 py-1.5 rounded-lg border border-red-800/60 text-red-300 text-xs font-bold disabled:opacity-50">
              ■ Terminer
            </button>
          </div>
        </div>
        {/* Onglets panneaux */}
        <div className="max-w-6xl mx-auto flex gap-1 mt-2">
          {PANS.map((p) => (
            <button key={p.key} type="button" onClick={() => setPan(p.key)}
              className={`flex-1 py-1.5 rounded-lg text-sm font-bold ${
                pan === p.key ? 'bg-stone-900/60 text-yellow-100 border border-amber-500/40' : 'text-stone-400 hover:text-yellow-200'
              }`}>
              {p.icon} <span className="hidden sm:inline">{p.label}</span>
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-3 py-4">
        {pan === 'prep' && (
          <PanneauPreparation sessionId={sessionId} scenarioId={scenarioId} etat={etat} onPatchState={patchState} />
        )}
        {pan === 'table' && <PanneauTable sessionId={sessionId} />}
        {pan === 'outils' && (
          <PanneauOutils sessionId={sessionId} scenarioId={scenarioId} etat={etat} onPatchState={patchState} />
        )}
      </main>
    </div>
  )
}
